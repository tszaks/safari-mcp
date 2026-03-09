import test from 'node:test';
import assert from 'node:assert/strict';

const safariModule = await import('../dist/safari.js');

test('SafariBridge can read the active tab', async () => {
  const bridge = new safariModule.SafariBridge();
  const result = await bridge.getActiveTab();
  assert.equal(typeof result, 'object');
  assert.ok(result);
});

test('SafariBridge can list tabs', async () => {
  const bridge = new safariModule.SafariBridge();
  const result = await bridge.listTabs();
  assert.ok(Array.isArray(result));
});

test('SafariBridge can open a URL in Safari', async () => {
  const bridge = new safariModule.SafariBridge();
  const result = await bridge.openUrl('https://example.com');
  assert.equal(result.url, 'https://example.com/');
});
