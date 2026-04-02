import { SafariBridge, type SafariTarget } from './safari.js';

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export class SafariAutomationTools {
  constructor(private readonly bridge: SafariBridge) {}

  private async evaluate<T>(script: string, target: SafariTarget = {}): Promise<T> {
    const result = await this.bridge.runJavaScript(script, target);
    return parseJsonValue(result.value) as T;
  }

  async runJavaScript(script: string, target: SafariTarget = {}) {
    return this.bridge.runJavaScript(script, target);
  }

  async getPageState(target: SafariTarget = {}) {
    return this.evaluate<Record<string, unknown>>(`
      (() => JSON.stringify({
        title: document.title || '',
        url: location.href,
        ready_state: document.readyState || 'unknown',
        viewport: {
          width: window.innerWidth || 0,
          height: window.innerHeight || 0,
          scroll_x: window.scrollX || 0,
          scroll_y: window.scrollY || 0
        }
      }))();
    `, target);
  }

  async queryElements(selector: string, limit = 20, target: SafariTarget = {}) {
    return this.evaluate<Array<Record<string, unknown>>>(`
      (() => {
        const normalize = (value) => String(value || '').trim();
        const selectorHint = (element) => {
          if (!element || !element.tagName) return '';
          if (element.id) return '#' + element.id;
          const role = element.getAttribute && element.getAttribute('role');
          const name = element.getAttribute && (element.getAttribute('aria-label') || element.getAttribute('name'));
          if (role && name) return element.tagName.toLowerCase() + '[role="' + role + '"][aria-label="' + name + '"]';
          if (element.classList && element.classList.length) {
            return element.tagName.toLowerCase() + '.' + Array.from(element.classList).slice(0, 2).join('.');
          }
          return element.tagName.toLowerCase();
        };

        return JSON.stringify(
          Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
            .slice(0, ${Math.max(1, limit)})
            .map((element) => {
              const rect = typeof element.getBoundingClientRect === 'function'
                ? element.getBoundingClientRect()
                : { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 };
              const style = typeof window.getComputedStyle === 'function'
                ? window.getComputedStyle(element)
                : null;
              const text = normalize(element.innerText || element.textContent || '');
              const ariaLabel = element.getAttribute ? element.getAttribute('aria-label') || '' : '';
              const role = element.getAttribute ? element.getAttribute('role') || '' : '';
              const visible = Boolean(
                rect.width > 0 &&
                rect.height > 0 &&
                style &&
                style.visibility !== 'hidden' &&
                style.display !== 'none' &&
                Number(style.opacity || '1') > 0.05
              );
              return {
                tag_name: (element.tagName || '').toLowerCase(),
                text: text.slice(0, 500),
                html: (element.outerHTML || '').slice(0, 1000),
                id: element.id || '',
                class_name: element.className || '',
                value: 'value' in element ? String(element.value || '') : '',
                href: element.href || '',
                src: element.src || '',
                role,
                aria_label: ariaLabel,
                selector_hint: selectorHint(element),
                visible,
                editable: Boolean('value' in element && !element.disabled && !element.readOnly),
                disabled: Boolean(element.disabled),
                rect: {
                  top: Math.round(rect.top || 0),
                  left: Math.round(rect.left || 0),
                  width: Math.round(rect.width || 0),
                  height: Math.round(rect.height || 0)
                }
              };
            })
        );
      })();
    `, target);
  }

  async clickElement(selector: string, target: SafariTarget = {}) {
    return this.evaluate<Record<string, unknown>>(`
      (() => {
        const pageState = () => ({
          title: document.title || '',
          url: location.href,
          ready_state: document.readyState || 'unknown'
        });
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) {
          return JSON.stringify({
            clicked: false,
            reason: 'Element not found',
            page_state_before: pageState(),
            page_state_after: pageState()
          });
        }
        const rect = typeof element.getBoundingClientRect === 'function'
          ? element.getBoundingClientRect()
          : { width: 0, height: 0 };
        const style = typeof window.getComputedStyle === 'function'
          ? window.getComputedStyle(element)
          : null;
        const disabled = Boolean(element.disabled);
        const visible = Boolean(
          rect.width > 0 &&
          rect.height > 0 &&
          style &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          Number(style.opacity || '1') > 0.05
        );
        const page_state_before = pageState();
        if (!visible) {
          return JSON.stringify({
            clicked: false,
            reason: 'Element is not visible',
            disabled,
            page_state_before,
            page_state_after: pageState()
          });
        }
        if (disabled) {
          return JSON.stringify({
            clicked: false,
            reason: 'Element is disabled',
            disabled,
            page_state_before,
            page_state_after: pageState()
          });
        }
        if (typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({ block: 'center', inline: 'center' });
        }
        element.click();
        const page_state_after = pageState();
        return JSON.stringify({
          clicked: true,
          tag_name: (element.tagName || '').toLowerCase(),
          text: (element.innerText || element.textContent || '').trim().slice(0, 200),
          disabled,
          page_state_before,
          page_state_after
        });
      })();
    `, target);
  }

  async typeIntoElement(selector: string, text: string, clear = true, submit = false, target: SafariTarget = {}) {
    return this.evaluate<Record<string, unknown>>(`
      (() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) {
          return JSON.stringify({ updated: false, reason: 'Element not found' });
        }

        if (typeof element.focus === 'function') {
          element.focus();
        }

        if (!('value' in element)) {
          return JSON.stringify({ updated: false, reason: 'Element has no value property' });
        }

        const nextValue = ${clear ? '""' : 'String(element.value || "")'} + ${JSON.stringify(text)};
        element.value = nextValue;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        if (${submit ? 'true' : 'false'}) {
          const form = element.form || element.closest('form');
          if (form) {
            if (typeof form.requestSubmit === 'function') {
              form.requestSubmit();
            } else {
              form.submit();
            }
          }
        }

        return JSON.stringify({ updated: true, value: String(element.value || '') });
      })();
    `, target);
  }

  async submitForm(selector: string, target: SafariTarget = {}) {
    return this.evaluate<Record<string, unknown>>(`
      (() => {
        const root = document.querySelector(${JSON.stringify(selector)});
        const form = root && root.tagName && root.tagName.toLowerCase() === 'form'
          ? root
          : root ? root.closest('form') : null;

        if (!form) {
          return JSON.stringify({ submitted: false, reason: 'Form not found' });
        }

        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          form.submit();
        }

        return JSON.stringify({ submitted: true });
      })();
    `, target);
  }

  async scrollPage(options: { top?: number; left?: number; percent?: number; behavior?: 'smooth' | 'auto' } = {}, target: SafariTarget = {}) {
    const topExpression = typeof options.percent === 'number'
      ? `Math.max(0, Math.min(1, ${options.percent})) * Math.max(document.body.scrollHeight - window.innerHeight, 0)`
      : String(Math.max(0, options.top ?? 0));

    return this.evaluate<Record<string, unknown>>(`
      (() => {
        window.scrollTo({
          top: ${topExpression},
          left: ${Math.max(0, options.left ?? 0)},
          behavior: ${JSON.stringify(options.behavior ?? 'auto')}
        });

        return JSON.stringify({
          ok: true,
          scroll_y: window.scrollY
        });
      })();
    `, target);
  }

  async waitForElement(selector: string, timeoutMs = 5000, intervalMs = 250, target: SafariTarget = {}) {
    const timeoutAt = Date.now() + timeoutMs;

    while (Date.now() < timeoutAt) {
      const result = await this.evaluate<{ found: boolean }>(`
        (() => JSON.stringify({ found: Boolean(document.querySelector(${JSON.stringify(selector)})) }))();
      `, target);

      if (result.found) {
        return {
          found: true,
          selector,
          waited_ms: timeoutMs - Math.max(timeoutAt - Date.now(), 0),
        };
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return {
      found: false,
      selector,
      waited_ms: timeoutMs,
    };
  }

  async waitForNavigation(
    options: { timeoutMs?: number; intervalMs?: number } = {},
    target: SafariTarget = {},
  ) {
    const timeoutMs = options.timeoutMs ?? 5000;
    const intervalMs = options.intervalMs ?? 250;
    const timeoutAt = Date.now() + timeoutMs;
    const initial = await this.getPageState(target);

    while (Date.now() < timeoutAt) {
      const current = await this.getPageState(target);
      const changed = current.url !== initial.url || current.title !== initial.title;
      if (changed && current.ready_state === 'complete') {
        return {
          changed: true,
          url: current.url,
          title: current.title,
          ready_state: current.ready_state,
          waited_ms: timeoutMs - Math.max(timeoutAt - Date.now(), 0),
          initial,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    const finalState = await this.getPageState(target);
    return {
      changed: finalState.url !== initial.url || finalState.title !== initial.title,
      url: finalState.url,
      title: finalState.title,
      ready_state: finalState.ready_state,
      waited_ms: timeoutMs,
      initial,
    };
  }

  async waitForText(
    options: { text?: string; textGone?: string; timeoutMs?: number; intervalMs?: number },
    target: SafariTarget = {},
  ) {
    const timeoutMs = options.timeoutMs ?? 5000;
    const intervalMs = options.intervalMs ?? 250;
    const needle = options.textGone ?? options.text ?? '';
    const waitingForGone = Boolean(options.textGone);
    const timeoutAt = Date.now() + timeoutMs;

    while (Date.now() < timeoutAt) {
      const result = await this.evaluate<{ found: boolean; count: number }>(`
        (() => {
          const haystack = String(document.body ? (document.body.innerText || document.body.textContent || '') : '');
          const needle = ${JSON.stringify(needle)};
          const normalizedHaystack = haystack.toLowerCase();
          const normalizedNeedle = needle.toLowerCase();
          const found = normalizedNeedle ? normalizedHaystack.includes(normalizedNeedle) : false;
          return JSON.stringify({
            found,
            count: found ? normalizedHaystack.split(normalizedNeedle).length - 1 : 0
          });
        })();
      `, target);

      if ((!waitingForGone && result.found) || (waitingForGone && !result.found)) {
        return {
          found: result.found,
          count: result.count,
          text: needle,
          waited_ms: timeoutMs - Math.max(timeoutAt - Date.now(), 0),
        };
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    const last = await this.evaluate<{ found: boolean; count: number }>(`
      (() => {
        const haystack = String(document.body ? (document.body.innerText || document.body.textContent || '') : '');
        const needle = ${JSON.stringify(needle)};
        const normalizedHaystack = haystack.toLowerCase();
        const normalizedNeedle = needle.toLowerCase();
        const found = normalizedNeedle ? normalizedHaystack.includes(normalizedNeedle) : false;
        return JSON.stringify({
          found,
          count: found ? normalizedHaystack.split(normalizedNeedle).length - 1 : 0
        });
      })();
    `, target);

    return {
      found: last.found,
      count: last.count,
      text: needle,
      waited_ms: timeoutMs,
    };
  }

  async listForms(target: SafariTarget = {}) {
    return this.evaluate<Array<Record<string, unknown>>>(`
      (() => JSON.stringify(
        Array.from(document.forms).map((form, index) => ({
          index,
          id: form.id || '',
          name: form.name || '',
          action: form.action || '',
          method: (form.method || 'get').toLowerCase(),
          fields: Array.from(form.elements || []).map((element) => ({
            tag_name: (element.tagName || '').toLowerCase(),
            type: element.type || '',
            name: element.name || '',
            id: element.id || '',
            value: 'value' in element ? String(element.value || '') : ''
          }))
        }))
      ))();
    `, target);
  }
}
