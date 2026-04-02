import { SafariBridge, type SafariTarget } from './safari.js';

type ContentMode = 'visible' | 'readability' | 'full_dom';

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

function toMarkdown(title: string, url: string, content: string): string {
  const heading = title.trim() ? `# ${title.trim()}` : '# Page';
  const link = url.trim() ? `Source: ${url.trim()}` : '';

  return [heading, link, '', content.trim()].filter(Boolean).join('\n');
}

function pageContentScript(mode: ContentMode): string {
  return `
    (() => {
      const normalize = (value) => String(value || '')
        .replace(/\\r/g, '')
        .replace(/\\u00a0/g, ' ')
        .replace(/\\n{3,}/g, '\\n\\n')
        .trim();

      const textOf = (node) => normalize(node ? (node.innerText || node.textContent || '') : '');

      const visibleText = () => {
        if (!document.body) return '';
        const nodes = Array.from(document.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,code,main,article,section,div'));
        const pieces = [];
        for (const node of nodes) {
          const rect = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : null;
          if (!rect) continue;
          if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
          const text = textOf(node);
          if (text) pieces.push(text);
          if (pieces.join('\\n\\n').length > 12000) break;
        }
        return normalize(pieces.join('\\n\\n')) || textOf(document.body);
      };

      const readabilityRoot =
        document.querySelector('main') ||
        document.querySelector('article') ||
        document.querySelector('[role="main"]') ||
        document.body;

      const selection = window.getSelection ? String(window.getSelection()) : '';
      const fullText = textOf(document.body);
      const readableText = textOf(readabilityRoot) || fullText;
      const visible = visibleText();
      const chosenMode = ${JSON.stringify(mode)};
      const content =
        chosenMode === 'full_dom' ? fullText :
        chosenMode === 'visible' ? visible :
        readableText || fullText;

      return JSON.stringify({
        title: document.title || '',
        url: location.href,
        mode: chosenMode,
        content,
        selection,
        word_count: content ? content.split(/\\s+/).filter(Boolean).length : 0,
      });
    })();
  `;
}

function pageSnapshotScript(): string {
  return `
    (() => {
      const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
      const selectorHint = (element) => {
        if (!element || !element.tagName) return '';
        if (element.id) return '#' + element.id;
        const role = element.getAttribute && element.getAttribute('role');
        const ariaLabel = element.getAttribute && element.getAttribute('aria-label');
        if (role && ariaLabel) {
          return element.tagName.toLowerCase() + '[role="' + role + '"][aria-label="' + ariaLabel + '"]';
        }
        if (element.name) return element.tagName.toLowerCase() + '[name="' + element.name + '"]';
        if (element.classList && element.classList.length) {
          return element.tagName.toLowerCase() + '.' + Array.from(element.classList).slice(0, 2).join('.');
        }
        return element.tagName.toLowerCase();
      };

      const isVisible = (element) => {
        if (!element || typeof element.getBoundingClientRect !== 'function') return false;
        const rect = element.getBoundingClientRect();
        const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
        return Boolean(
          rect.width > 0 &&
          rect.height > 0 &&
          style &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          Number(style.opacity || '1') > 0.05
        );
      };

      const actionable_elements = Array.from(document.querySelectorAll('a[href],button,input,select,textarea,[role="button"],[tabindex]'))
        .filter((element) => isVisible(element))
        .slice(0, 50)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag_name: (element.tagName || '').toLowerCase(),
            role: element.getAttribute ? element.getAttribute('role') || '' : '',
            text: normalize(element.innerText || element.textContent || element.value || ''),
            selector_hint: selectorHint(element),
            disabled: Boolean(element.disabled),
            editable: Boolean('value' in element && !element.disabled && !element.readOnly),
            rect: {
              top: Math.round(rect.top || 0),
              left: Math.round(rect.left || 0),
              width: Math.round(rect.width || 0),
              height: Math.round(rect.height || 0)
            }
          };
        });

      return JSON.stringify({
        title: document.title || '',
        url: location.href,
        ready_state: document.readyState || 'unknown',
        viewport: {
          width: window.innerWidth || 0,
          height: window.innerHeight || 0,
          scroll_x: window.scrollX || 0,
          scroll_y: window.scrollY || 0
        },
        forms: Array.from(document.forms).length,
        actionable_elements,
        text_preview: normalize(document.body ? (document.body.innerText || document.body.textContent || '') : '').slice(0, 2000)
      });
    })();
  `;
}

export class SafariPageTools {
  constructor(private readonly bridge: SafariBridge) {}

  private async evaluate<T>(script: string, target: SafariTarget = {}): Promise<T> {
    const result = await this.bridge.runJavaScript(script, target);
    return parseJsonValue(result.value) as T;
  }

  async getPageContent(mode: ContentMode = 'readability', target: SafariTarget = {}) {
    return this.evaluate<{
      title: string;
      url: string;
      mode: string;
      content: string;
      selection: string;
      word_count: number;
    }>(pageContentScript(mode), target);
  }

  async getPageMarkdown(mode: ContentMode = 'readability', target: SafariTarget = {}) {
    const page = await this.getPageContent(mode, target);
    return {
      title: page.title,
      url: page.url,
      mode: page.mode,
      markdown: toMarkdown(page.title, page.url, page.content),
    };
  }

  async getPageHtml(target: SafariTarget = {}) {
    return this.evaluate<{ title: string; url: string; html: string }>(`
      (() => JSON.stringify({
        title: document.title || '',
        url: location.href,
        html: document.documentElement ? document.documentElement.outerHTML : ''
      }))();
    `, target);
  }

  async getSelection(target: SafariTarget = {}) {
    return this.evaluate<{ title: string; url: string; selection: string }>(`
      (() => JSON.stringify({
        title: document.title || '',
        url: location.href,
        selection: window.getSelection ? String(window.getSelection()) : ''
      }))();
    `, target);
  }

  async extractLinks(limit = 100, target: SafariTarget = {}) {
    return this.evaluate<Array<Record<string, unknown>>>(`
      (() => JSON.stringify(
        Array.from(document.querySelectorAll('a[href]'))
          .slice(0, ${Math.max(1, limit)})
          .map((link) => ({
            text: (link.innerText || link.textContent || '').trim(),
            href: link.href,
            title: link.title || ''
          }))
      ))();
    `, target);
  }

  async extractImages(limit = 100, target: SafariTarget = {}) {
    return this.evaluate<Array<Record<string, unknown>>>(`
      (() => JSON.stringify(
        Array.from(document.images)
          .slice(0, ${Math.max(1, limit)})
          .map((image) => ({
            alt: image.alt || '',
            src: image.src || '',
            width: image.naturalWidth || image.width || 0,
            height: image.naturalHeight || image.height || 0
          }))
      ))();
    `, target);
  }

  async findInPage(query: string, limit = 20, target: SafariTarget = {}) {
    return this.evaluate<Array<Record<string, unknown>>>(`
      (() => {
        const needle = ${JSON.stringify(query)}.toLowerCase();
        const haystack = (document.body ? document.body.innerText : '').replace(/\\r/g, '');
        const matches = [];
        let start = 0;

        while (matches.length < ${Math.max(1, limit)}) {
          const index = haystack.toLowerCase().indexOf(needle, start);
          if (index === -1) break;
          const snippetStart = Math.max(0, index - 80);
          const snippetEnd = Math.min(haystack.length, index + needle.length + 80);
          matches.push({
            index,
            snippet: haystack.slice(snippetStart, snippetEnd).trim()
          });
          start = index + needle.length;
        }

        return JSON.stringify(matches);
      })();
    `, target);
  }

  async summarizePage(target: SafariTarget = {}) {
    const page = await this.getPageContent('readability', target);
    const sections = page.content.split(/\n{2,}/).map((value) => value.trim()).filter(Boolean);
    const excerpt = sections.slice(0, 3).join('\n\n');

    return {
      title: page.title,
      url: page.url,
      mode: page.mode,
      word_count: page.word_count,
      excerpt,
      summary_ready_markdown: toMarkdown(page.title, page.url, excerpt || page.content),
      content: page.content,
    };
  }

  async snapshotPage(target: SafariTarget = {}) {
    return this.evaluate<{
      title: string;
      url: string;
      ready_state: string;
      viewport: Record<string, number>;
      forms: number;
      actionable_elements: Array<Record<string, unknown>>;
      text_preview: string;
    }>(pageSnapshotScript(), target);
  }
}
