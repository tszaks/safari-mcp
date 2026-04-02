import test from 'node:test';
import assert from 'node:assert/strict';

const automationModule = await import('../dist/automation.js');
const pageModule = await import('../dist/page.js');
const tooling = await import('../dist/tooling.js');

function createBridgeStub(sequence = []) {
  const calls = [];
  let index = 0;

  return {
    calls,
    async runJavaScript(script, target = {}) {
      calls.push({ script, target });
      const next = sequence[index] ?? sequence[sequence.length - 1];
      index += 1;
      return {
        value: typeof next === 'string' ? next : JSON.stringify(next ?? {}),
        value_type: 'string',
      };
    },
  };
}

test('tool registry exposes Playwright-style Safari tools', () => {
  const names = tooling.TOOL_DEFINITIONS.map((tool) => tool.name);
  assert.ok(names.includes('safari_snapshot_page'));
  assert.ok(names.includes('safari_wait_for_navigation'));
  assert.ok(names.includes('safari_wait_for_text'));
});

test('queryElements requests rich metadata for actionable elements', async () => {
  const bridge = createBridgeStub([[{ text: 'Save', visible: true, selector_hint: '#save' }]]);
  const tools = new automationModule.SafariAutomationTools(bridge);
  const result = await tools.queryElements('button');

  assert.equal(result[0].selector_hint, '#save');
  const script = bridge.calls[0].script;
  assert.match(script, /getBoundingClientRect/);
  assert.match(script, /getComputedStyle/);
  assert.match(script, /selector_hint/);
  assert.match(script, /aria-label/);
  assert.match(script, /visible/);
  assert.match(script, /editable/);
});

test('clickElement checks interactability and returns before and after page state', async () => {
  const bridge = createBridgeStub([{
    clicked: true,
    page_state_before: { url: 'https://example.com/start' },
    page_state_after: { url: 'https://example.com/next' },
  }]);
  const tools = new automationModule.SafariAutomationTools(bridge);
  const result = await tools.clickElement('button.primary');

  assert.equal(result.clicked, true);
  assert.equal(result.page_state_before.url, 'https://example.com/start');
  assert.equal(result.page_state_after.url, 'https://example.com/next');
  const script = bridge.calls[0].script;
  assert.match(script, /page_state_before/);
  assert.match(script, /page_state_after/);
  assert.match(script, /disabled/);
  assert.match(script, /getComputedStyle/);
  assert.match(script, /scrollIntoView/);
});

test('SafariPageTools exposes a Playwright-style page snapshot', async () => {
  const bridge = createBridgeStub([{
    title: 'AWS Console',
    url: 'https://console.aws.amazon.com/',
    ready_state: 'complete',
    actionable_elements: [{ role: 'button', text: 'Launch instance' }],
  }]);
  const tools = new pageModule.SafariPageTools(bridge);
  const result = await tools.snapshotPage();

  assert.equal(result.ready_state, 'complete');
  assert.equal(result.actionable_elements[0].text, 'Launch instance');
  const script = bridge.calls[0].script;
  assert.match(script, /actionable_elements/);
  assert.match(script, /readyState/);
  assert.match(script, /viewport/);
  assert.match(script, /selector_hint/);
});

test('waitForNavigation polls until the page changes and finishes loading', async () => {
  const bridge = createBridgeStub([
    { url: 'https://example.com/start', title: 'Start', ready_state: 'complete' },
    { url: 'https://example.com/start', title: 'Start', ready_state: 'loading' },
    { url: 'https://example.com/next', title: 'Next', ready_state: 'complete' },
  ]);
  const tools = new automationModule.SafariAutomationTools(bridge);
  const result = await tools.waitForNavigation({
    timeoutMs: 200,
    intervalMs: 1,
  });

  assert.equal(result.changed, true);
  assert.equal(result.url, 'https://example.com/next');
  assert.equal(bridge.calls.length, 3);
});

test('waitForText supports both appear and disappear flows', async () => {
  const bridge = createBridgeStub([
    { found: false, count: 0 },
    { found: true, count: 2 },
    { found: false, count: 0 },
  ]);
  const tools = new automationModule.SafariAutomationTools(bridge);

  const found = await tools.waitForText({ text: 'Launch', timeoutMs: 200, intervalMs: 1 });
  assert.equal(found.found, true);

  const gone = await tools.waitForText({ textGone: 'Loading', timeoutMs: 200, intervalMs: 1 });
  assert.equal(gone.found, false);
});
