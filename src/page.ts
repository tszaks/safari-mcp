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
}
