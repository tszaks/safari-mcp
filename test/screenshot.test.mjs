import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';

const safariModule = await import('../dist/safari.js');

test('SafariBridge can capture a visible-page screenshot', async () => {
  const bridge = new safariModule.SafariBridge();
  const result = await bridge.screenshotVisibleArea();

  assert.equal(result.supported, true);
  assert.ok(result.path);
  assert.ok(result.bytes > 0);

  await access(result.path);
  await bridge.cleanupScreenshot(result.path);
});
