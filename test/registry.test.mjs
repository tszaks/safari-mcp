import test from 'node:test';
import assert from 'node:assert/strict';

const tooling = await import('../dist/tooling.js');

test('tool registry exposes core Safari tools', () => {
  const names = tooling.TOOL_DEFINITIONS.map((tool) => tool.name);
  assert.ok(names.length > 10);
  assert.deepEqual(names.slice(0, 3), [
    'safari_get_active_tab',
    'safari_list_tabs',
    'safari_list_windows',
  ]);
  assert.ok(names.includes('safari_open_url'));
  assert.ok(names.includes('safari_get_page_content'));
  assert.ok(names.includes('safari_run_javascript'));
});
