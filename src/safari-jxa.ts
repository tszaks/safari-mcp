export const SAFARI_JXA_SCRIPT = String.raw`
ObjC.import('Foundation');

function getEnv(name) {
  try {
    var env = $.NSProcessInfo.processInfo.environment;
    var raw = env.objectForKey(name);
    return raw ? ObjC.unwrap(raw) : '';
  } catch (error) {
    return '';
  }
}

function safeCall(fn, fallbackValue) {
  try {
    var value = fn();
    return value === undefined || value === null ? fallbackValue : value;
  } catch (error) {
    return fallbackValue;
  }
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function toInteger(value, fallbackValue, minValue, maxValue) {
  var numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallbackValue;

  var parsed = Math.trunc(numeric);
  if (typeof minValue === 'number' && parsed < minValue) return minValue;
  if (typeof maxValue === 'number' && parsed > maxValue) return maxValue;
  return parsed;
}

function toBoolean(value, fallbackValue) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    var normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  return fallbackValue;
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function requireString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Missing or invalid "' + fieldName + '".');
  }

  return value.trim();
}

function appPath() {
  return getEnv('MCP_SAFARI_APP_PATH') || '/Applications/Safari.app';
}

function getSafari() {
  var app = Application(appPath());
  app.includeStandardAdditions = true;
  return app;
}

function getSystemEvents() {
  var app = Application('System Events');
  app.includeStandardAdditions = true;
  return app;
}

function serializeTab(tab, windowIndex, tabPosition, currentTabIndex) {
  return {
    window_id: 'window-' + (windowIndex + 1),
    window_index: windowIndex + 1,
    tab_id: 'window-' + (windowIndex + 1) + '-tab-' + (tabPosition + 1),
    tab_index: tabPosition + 1,
    title: safeCall(function () { return tab.name(); }, ''),
    url: safeCall(function () { return tab.url(); }, ''),
    current: tabPosition + 1 === currentTabIndex,
  };
}

function serializeWindow(windowRef, windowIndex) {
  var tabs = ensureArray(safeCall(function () { return windowRef.tabs(); }, []));
  var currentTabIndex = safeCall(function () { return windowRef.currentTab().index(); }, 1);
  var isPrivate = safeCall(function () { return windowRef.private(); }, false);

  return {
    window_id: 'window-' + (windowIndex + 1),
    window_index: windowIndex + 1,
    name: safeCall(function () { return windowRef.name(); }, ''),
    private: isPrivate,
    tab_count: tabs.length,
    current_tab_index: currentTabIndex,
    tabs: tabs.map(function (tab, tabPosition) {
      return serializeTab(tab, windowIndex, tabPosition, currentTabIndex);
    }),
  };
}

function getWindows(app) {
  return ensureArray(safeCall(function () { return app.windows(); }, []));
}

function requireWindow(app, payload) {
  var windows = getWindows(app);
  if (!windows.length) {
    throw new Error('Safari has no windows open.');
  }

  var windowIndex = toInteger(payload.window_index, 1, 1, windows.length) - 1;
  return {
    windowRef: windows[windowIndex],
    windowIndex: windowIndex,
    windows: windows,
  };
}

function requireTab(app, payload) {
  var windowData = requireWindow(app, payload);
  var tabs = ensureArray(safeCall(function () { return windowData.windowRef.tabs(); }, []));
  if (!tabs.length) {
    throw new Error('Safari window has no tabs.');
  }

  var currentIndex = safeCall(function () { return windowData.windowRef.currentTab().index(); }, 1);
  var tabIndex = toInteger(payload.tab_index, currentIndex, 1, tabs.length) - 1;

  return {
    windowRef: windowData.windowRef,
    windowIndex: windowData.windowIndex,
    tab: tabs[tabIndex],
    tabIndex: tabIndex,
    tabs: tabs,
  };
}

function getActiveTab(app) {
  var tabData = requireTab(app, {});
  var currentIndex = safeCall(function () { return tabData.windowRef.currentTab().index(); }, 1);
  return serializeTab(tabData.tab, tabData.windowIndex, tabData.tabIndex, currentIndex);
}

function listWindows(app) {
  return getWindows(app).map(function (windowRef, windowIndex) {
    return serializeWindow(windowRef, windowIndex);
  });
}

function listTabs(app, payload) {
  var windows = listWindows(app);
  if (hasOwn(payload, 'window_index')) {
    var windowIndex = toInteger(payload.window_index, 1, 1, windows.length) - 1;
    return windows[windowIndex] ? windows[windowIndex].tabs : [];
  }

  var tabs = [];
  for (var i = 0; i < windows.length; i += 1) {
    tabs = tabs.concat(windows[i].tabs);
  }

  return tabs;
}

function ensureFrontWindow(app) {
  var windows = getWindows(app);

  if (windows.length) {
    for (var i = 0; i < windows.length; i += 1) {
      var isPrivate = safeCall(function () { return windows[i].private(); }, false);
      if (!isPrivate) {
        return { windowRef: windows[i], windowIndex: i };
      }
    }
    return { windowRef: windows[0], windowIndex: 0 };
  }

  var appPathValue = appPath();
  app.includeStandardAdditions = true;
  app.activate();
  delay(0.2);
  app.doShellScript('osascript -e \'tell application "' + appPathValue.replace(/"/g, '\\"') + '" to make new document\'');
  delay(0.6);
  return requireWindow(app, {});
}

function openUrl(app, payload) {
  var url = requireString(payload.url, 'url');
  var target = ensureFrontWindow(app);
  target.windowRef.currentTab().url = url;
  delay(0.8);
  return getActiveTab(app);
}

function newTab(app, payload) {
  var url = typeof payload.url === 'string' && payload.url.trim() ? payload.url.trim() : '';
  var windows = getWindows(app);

  if (!windows.length) {
    ensureFrontWindow(app);
    windows = getWindows(app);
  }

  var frontWindow = windows[0];
  var tab = app.Tab({ url: url || 'about:blank' });
  frontWindow.tabs.push(tab);
  frontWindow.currentTab = tab;
  delay(0.5);

  return getActiveTab(app);
}

function activateWindow(app, payload) {
  var windowData = requireWindow(app, payload);
  var windows = getWindows(app);
  app.activate();
  if (windowData.windowIndex !== 0) {
    var targetWindow = windows[windowData.windowIndex];
    targetWindow.index = 1;
    delay(0.2);
  }

  return serializeWindow(getWindows(app)[0], 0);
}

function activateTab(app, payload) {
  var tabData = requireTab(app, payload);
  tabData.windowRef.currentTab = tabData.tab;
  delay(0.2);
  return getActiveTab(app);
}

function closeTab(app, payload) {
  var tabData = requireTab(app, payload);
  tabData.tab.close();
  delay(0.2);
  return {
    closed: true,
    window_index: tabData.windowIndex + 1,
    tab_index: tabData.tabIndex + 1,
    remaining_tabs: ensureArray(safeCall(function () { return getWindows(app)[tabData.windowIndex].tabs(); }, [])).length,
  };
}

function closeTabs(app, payload) {
  var indices = ensureArray(payload.tab_indices).map(function (value) {
    return toInteger(value, 0, 1, 9999);
  }).filter(function (value) {
    return value > 0;
  });
  var tabData = requireTab(app, payload);
  var countBefore = tabData.tabs.length;

  if (!indices.length) {
    tabData.tab.close();
    delay(0.2);
    return {
      closed_count: 1,
      remaining_tabs: ensureArray(safeCall(function () { return getWindows(app)[tabData.windowIndex].tabs(); }, [])).length,
      count_before: countBefore,
    };
  }

  indices.sort(function (a, b) { return b - a; });
  for (var i = 0; i < indices.length; i += 1) {
    var targetIndex = indices[i] - 1;
    var currentWindow = requireWindow(app, { window_index: tabData.windowIndex + 1 }).windowRef;
    var currentTabs = ensureArray(safeCall(function () { return currentWindow.tabs(); }, []));
    if (!currentTabs[targetIndex]) continue;
    currentTabs[targetIndex].close();
    delay(0.1);
  }

  return {
    closed_count: indices.length,
    remaining_tabs: ensureArray(safeCall(function () { return getWindows(app)[tabData.windowIndex].tabs(); }, [])).length,
    count_before: countBefore,
  };
}

function reloadTab(app, payload) {
  var tabData = requireTab(app, payload);
  tabData.tab.url = tabData.tab.url();
  delay(0.4);
  return serializeTab(tabData.tab, tabData.windowIndex, tabData.tabIndex, tabData.tabIndex + 1);
}

function goBack(app, payload) {
  var tabData = requireTab(app, payload);
  safeCall(function () { return tabData.tab.doJavaScript('history.back()'); }, null);
  delay(0.4);
  return getActiveTab(app);
}

function goForward(app, payload) {
  var tabData = requireTab(app, payload);
  safeCall(function () { return tabData.tab.doJavaScript('history.forward()'); }, null);
  delay(0.4);
  return getActiveTab(app);
}

function runJavaScript(app, payload) {
  var script = requireString(payload.script, 'script');
  var tabData = requireTab(app, payload);
  var value = app.doJavaScript(script, { in: tabData.tab });
  return {
    value: value,
    value_type: typeof value,
  };
}

function findTab(app, payload) {
  var query = String(payload.query || '').trim().toLowerCase();
  if (!query) {
    throw new Error('Missing or invalid "query".');
  }

  var windows = getWindows(app);
  var matches = [];

  for (var wi = 0; wi < windows.length; wi += 1) {
    var tabs = ensureArray(safeCall(function () { return windows[wi].tabs(); }, []));
    var currentTabIndex = safeCall(function () { return windows[wi].currentTab().index(); }, 1);
    var isPrivate = safeCall(function () { return windows[wi].private(); }, false);

    for (var ti = 0; ti < tabs.length; ti += 1) {
      var title = String(safeCall(function () { return tabs[ti].name(); }, '')).toLowerCase();
      var url = String(safeCall(function () { return tabs[ti].url(); }, '')).toLowerCase();

      if (title.indexOf(query) !== -1 || url.indexOf(query) !== -1) {
        var serialized = serializeTab(tabs[ti], wi, ti, currentTabIndex);
        serialized.window_private = isPrivate;
        matches.push(serialized);
      }
    }
  }

  return matches;
}

function main() {
  var operation = getEnv('MCP_SAFARI_OPERATION');
  var payload = {};

  try {
    var rawPayload = getEnv('MCP_SAFARI_PAYLOAD');
    payload = rawPayload ? JSON.parse(rawPayload) : {};
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error: 'Failed to parse Safari payload.' }));
    return;
  }

  try {
    var app = getSafari();
    var result;

    switch (operation) {
      case 'get_active_tab':
        result = getActiveTab(app);
        break;
      case 'list_tabs':
        result = listTabs(app, payload);
        break;
      case 'list_windows':
        result = listWindows(app);
        break;
      case 'open_url':
        result = openUrl(app, payload);
        break;
      case 'new_tab':
        result = newTab(app, payload);
        break;
      case 'activate_tab':
        result = activateTab(app, payload);
        break;
      case 'activate_window':
        result = activateWindow(app, payload);
        break;
      case 'close_tab':
        result = closeTab(app, payload);
        break;
      case 'close_tabs':
        result = closeTabs(app, payload);
        break;
      case 'reload_tab':
        result = reloadTab(app, payload);
        break;
      case 'go_back':
        result = goBack(app, payload);
        break;
      case 'go_forward':
        result = goForward(app, payload);
        break;
      case 'run_javascript':
        result = runJavaScript(app, payload);
        break;
      case 'find_tab':
        result = findTab(app, payload);
        break;
      default:
        throw new Error('Unknown Safari operation: ' + operation);
    }

    console.log(JSON.stringify({ ok: true, result: result }));
  } catch (error) {
    console.log(JSON.stringify({
      ok: false,
      error: normalizeText(error && error.message ? error.message : String(error)),
    }));
  }
}

main();
`;
