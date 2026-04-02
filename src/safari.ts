import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { SAFARI_JXA_SCRIPT } from './safari-jxa.js';

interface JxaEnvelope {
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface SafariTarget extends Record<string, unknown> {
  window_index?: number;
  tab_index?: number;
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, '').trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const execFileAsync = promisify(execFile);

interface ScreenshotSnapshot {
  title: string;
  url: string;
  html: string;
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
}

export class SafariBridge {
  constructor(private readonly appPath = '/Applications/Safari.app') {}

  async execute<T>(operation: string, payload: Record<string, unknown>): Promise<T> {
    const { stdout, stderr, exitCode } = await this.runJxa(operation, payload);
    const output = stripAnsi(stdout || stderr);
    const errorOutput = stripAnsi(stderr);

    if (exitCode !== 0 && !output) {
      throw new Error(errorOutput || output || `osascript exited with code ${exitCode}`);
    }

    if (!output) {
      throw new Error(errorOutput || 'No output returned from Safari automation.');
    }

    let envelope: JxaEnvelope;
    try {
      envelope = JSON.parse(output) as JxaEnvelope;
    } catch {
      throw new Error(`Failed to parse Safari output: ${output}`);
    }

    if (!envelope.ok) {
      throw new Error(envelope.error || 'Unknown Safari automation error.');
    }

    return envelope.result as T;
  }

  async getActiveTab() {
    return this.execute<Record<string, unknown>>('get_active_tab', {});
  }

  async listTabs(target: SafariTarget = {}) {
    return this.execute<Array<Record<string, unknown>>>('list_tabs', target);
  }

  async listWindows() {
    return this.execute<Array<Record<string, unknown>>>('list_windows', {});
  }

  async openUrl(url: string, target: SafariTarget = {}) {
    await this.execute<Record<string, unknown>>('open_url', { ...target, url });
    const normalizedTarget = url.endsWith('/') ? url : `${url}/`;
    const timeoutAt = Date.now() + 10_000;

    while (Date.now() < timeoutAt) {
      const tab = await this.execute<Record<string, unknown>>('get_active_tab', {});
      const currentUrl = String(tab.url || '');
      if (currentUrl === url || currentUrl === normalizedTarget) {
        return tab;
      }
      await delay(250);
    }

    return this.execute<Record<string, unknown>>('get_active_tab', {});
  }

  async newTab(url?: string, target: SafariTarget = {}) {
    return this.execute<Record<string, unknown>>('new_tab', { ...target, url });
  }

  async activateTab(target: SafariTarget) {
    return this.execute<Record<string, unknown>>('activate_tab', target);
  }

  async activateWindow(window_index: number) {
    return this.execute<Record<string, unknown>>('activate_window', { window_index });
  }

  async closeTab(target: SafariTarget = {}) {
    return this.execute<Record<string, unknown>>('close_tab', target);
  }

  async closeTabs(window_index?: number, tab_indices?: number[]) {
    return this.execute<Record<string, unknown>>('close_tabs', {
      window_index,
      tab_indices,
    });
  }

  async reloadTab(target: SafariTarget = {}) {
    return this.execute<Record<string, unknown>>('reload_tab', target);
  }

  async goBack(target: SafariTarget = {}) {
    return this.execute<Record<string, unknown>>('go_back', target);
  }

  async goForward(target: SafariTarget = {}) {
    return this.execute<Record<string, unknown>>('go_forward', target);
  }

  async runJavaScript(script: string, target: SafariTarget = {}) {
    return this.execute<{ value: unknown; value_type: string }>('run_javascript', {
      ...target,
      script,
    });
  }

  async screenshotVisibleArea(): Promise<
    | { supported: true; path: string; bytes: number; backend: 'safaridriver' | 'chrome-fallback' }
    | { supported: false; error: string }
  > {
    try {
      const directory = await mkdtemp(join(tmpdir(), 'safari-mcp-'));
      const path = join(directory, 'safari-visible.png');
      const snapshot = await this.captureVisibleSnapshot();
      if (/^https?:\/\//i.test(snapshot.url)) {
        const webdriverResult = await this.tryWebDriverScreenshot(snapshot, path);
        if (webdriverResult) {
          return webdriverResult;
        }
      }

      const htmlPath = join(directory, 'safari-visible.html');
      const html = this.buildSnapshotDocument(snapshot);
      await writeFile(htmlPath, html, 'utf8');
      const chromePath = this.findChromePath();
      if (!chromePath) {
        throw new Error('Google Chrome is required for screenshot rendering but was not found.');
      }
      await this.runChromeScreenshot(chromePath, htmlPath, path, snapshot);
      const content = await readFile(path);

      return {
        supported: true,
        path,
        bytes: content.byteLength,
        backend: 'chrome-fallback',
      };
    } catch (error) {
      return {
        supported: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async cleanupScreenshot(path: string): Promise<void> {
    await rm(path, { force: true });
  }

  private async activateFrontmost(): Promise<void> {
    await this.runCommand('osascript', ['-e', `tell application "${this.appPath}" to activate`]);
    await delay(300);
  }

  private async runJxa(
    operation: string,
    payload: Record<string, unknown>,
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    return new Promise((resolve, reject) => {
      const child = spawn('osascript', ['-l', 'JavaScript'], {
        env: {
          ...process.env,
          MCP_SAFARI_APP_PATH: this.appPath,
          MCP_SAFARI_OPERATION: operation,
          MCP_SAFARI_PAYLOAD: JSON.stringify(payload ?? {}),
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code });
      });

      child.stdin.write(SAFARI_JXA_SCRIPT);
      child.stdin.end();
    });
  }

  private async runCommand(command: string, args: string[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args);
      let stderr = '';

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(stripAnsi(stderr) || `${command} exited with code ${code}`));
      });
    });
  }

  private async captureVisibleSnapshot(target: SafariTarget = {}): Promise<ScreenshotSnapshot> {
    const payload = await this.runJavaScript(`
      (() => JSON.stringify({
        title: document.title || '',
        url: location.href,
        html: document.documentElement ? document.documentElement.outerHTML : '',
        width: window.innerWidth || 1280,
        height: window.innerHeight || 720,
        scrollX: window.scrollX || 0,
        scrollY: window.scrollY || 0
      }))();
    `, target);

    if (typeof payload.value !== 'string') {
      throw new Error('Safari did not return a valid DOM snapshot.');
    }

    const snapshot = JSON.parse(payload.value) as ScreenshotSnapshot;
    snapshot.width = Math.max(320, Math.trunc(snapshot.width || 1280));
    snapshot.height = Math.max(240, Math.trunc(snapshot.height || 720));
    snapshot.scrollX = Math.max(0, Math.trunc(snapshot.scrollX || 0));
    snapshot.scrollY = Math.max(0, Math.trunc(snapshot.scrollY || 0));
    return snapshot;
  }

  private buildSnapshotDocument(snapshot: ScreenshotSnapshot): string {
    const stripped = snapshot.html.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');

    return [
      '<!doctype html>',
      '<html>',
      '<head>',
      '<meta charset="utf-8">',
      `<base href="${this.escapeHtml(snapshot.url)}">`,
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<style>html,body{margin:0;padding:0;overflow:hidden !important;background:white;}</style>',
      '</head>',
      stripped,
      '<script>',
      `window.addEventListener('load', () => { window.scrollTo(${snapshot.scrollX}, ${snapshot.scrollY}); });`,
      '</script>',
      '</html>',
    ].join('');
  }

  private findChromePath(): string | null {
    const candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private async runChromeScreenshot(
    chromePath: string,
    htmlPath: string,
    screenshotPath: string,
    snapshot: ScreenshotSnapshot,
  ): Promise<void> {
    await execFileAsync(
      chromePath,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--run-all-compositor-stages-before-draw',
        '--virtual-time-budget=2000',
        `--window-size=${snapshot.width},${snapshot.height}`,
        `--screenshot=${screenshotPath}`,
        `file://${htmlPath}`,
      ],
      {
        maxBuffer: 20_000_000,
      },
    );
  }

  private async tryWebDriverScreenshot(
    snapshot: ScreenshotSnapshot,
    screenshotPath: string,
  ): Promise<{ supported: true; path: string; bytes: number; backend: 'safaridriver' } | null> {
    const driverPath = '/usr/bin/safaridriver';
    if (!existsSync(driverPath)) {
      return null;
    }

    const port = await this.findFreePort();
    const process = spawn(driverPath, ['-p', String(port)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    process.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const baseUrl = `http://127.0.0.1:${port}`;
    try {
      await this.waitForWebDriver(baseUrl);
      const sessionId = await this.createWebDriverSession(baseUrl);

      try {
        await this.webdriverRequest('POST', `${baseUrl}/session/${sessionId}/window/rect`, {
          width: snapshot.width,
          height: snapshot.height,
        });
        await this.webdriverRequest('POST', `${baseUrl}/session/${sessionId}/url`, {
          url: snapshot.url,
        });
        await delay(1200);
        await this.webdriverRequest('POST', `${baseUrl}/session/${sessionId}/execute/sync`, {
          script: 'window.scrollTo(arguments[0], arguments[1]); return true;',
          args: [snapshot.scrollX, snapshot.scrollY],
        });
        await delay(400);

        const screenshot = await this.webdriverRequest<string>('GET', `${baseUrl}/session/${sessionId}/screenshot`);
        await this.webdriverRequest('DELETE', `${baseUrl}/session/${sessionId}`);

        await writeFile(screenshotPath, Buffer.from(screenshot, 'base64'));
        const content = await readFile(screenshotPath);
        return {
          supported: true,
          path: screenshotPath,
          bytes: content.byteLength,
          backend: 'safaridriver',
        };
      } catch {
        try {
          await this.webdriverRequest('DELETE', `${baseUrl}/session/${sessionId}`);
        } catch {
          // Keep the fallback path simple if cleanup fails.
        }
        return null;
      }
    } catch {
      return null;
    } finally {
      process.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (process.exitCode === null) {
        process.kill('SIGKILL');
      }
      if (stderr.trim()) {
        void stderr;
      }
    }
  }

  private async waitForWebDriver(baseUrl: string): Promise<void> {
    const deadline = Date.now() + 5_000;

    while (Date.now() < deadline) {
      try {
        const response = await fetch(`${baseUrl}/status`);
        if (response.ok) {
          return;
        }
      } catch {
        // Retry until the driver is ready.
      }

      await delay(100);
    }

    throw new Error('safaridriver did not become ready in time.');
  }

  private async createWebDriverSession(baseUrl: string): Promise<string> {
    const value = await this.webdriverRequest<{ sessionId: string }>('POST', `${baseUrl}/session`, {
      capabilities: {
        alwaysMatch: {
          browserName: 'Safari',
        },
      },
    });

    return value.sessionId;
  }

  private async webdriverRequest<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as { value?: T; message?: string }) : {};
    if (!response.ok) {
      throw new Error(parsed.message || `WebDriver request failed with ${response.status}.`);
    }

    return parsed.value as T;
  }

  private async findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          server.close();
          reject(new Error('Failed to reserve a local port for safaridriver.'));
          return;
        }

        const port = address.port;
        server.close(() => resolve(port));
      });

      server.on('error', reject);
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
