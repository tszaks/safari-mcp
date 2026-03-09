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

  async queryElements(selector: string, limit = 20, target: SafariTarget = {}) {
    return this.evaluate<Array<Record<string, unknown>>>(`
      (() => JSON.stringify(
        Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
          .slice(0, ${Math.max(1, limit)})
          .map((element) => ({
            tag_name: (element.tagName || '').toLowerCase(),
            text: (element.innerText || element.textContent || '').trim().slice(0, 500),
            html: (element.outerHTML || '').slice(0, 1000),
            id: element.id || '',
            class_name: element.className || '',
            value: 'value' in element ? String(element.value || '') : '',
            href: element.href || '',
            src: element.src || ''
          }))
      ))();
    `, target);
  }

  async clickElement(selector: string, target: SafariTarget = {}) {
    return this.evaluate<Record<string, unknown>>(`
      (() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) {
          return JSON.stringify({ clicked: false, reason: 'Element not found' });
        }
        if (typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({ block: 'center', inline: 'center' });
        }
        element.click();
        return JSON.stringify({
          clicked: true,
          tag_name: (element.tagName || '').toLowerCase(),
          text: (element.innerText || element.textContent || '').trim().slice(0, 200)
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
