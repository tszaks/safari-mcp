import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const TOOL_DEFINITIONS: Tool[] = [
  {
    name: 'safari_get_active_tab',
    description: 'Get metadata for the active Safari tab.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'safari_list_tabs',
    description: 'List Safari tabs across all windows or in one window.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_list_windows',
    description: 'List Safari windows and their tabs.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'safari_open_url',
    description: 'Open a URL in the current Safari tab.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        window_index: { type: 'integer', minimum: 1 },
      },
      required: ['url'],
    },
  },
  {
    name: 'safari_new_tab',
    description: 'Open a new Safari tab, optionally with a URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
      },
    },
  },
  {
    name: 'safari_close_tab',
    description: 'Close a Safari tab.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_close_tabs',
    description: 'Close multiple Safari tabs in a window.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
        tab_indices: {
          type: 'array',
          items: { type: 'integer', minimum: 1 },
        },
      },
    },
  },
  {
    name: 'safari_activate_tab',
    description: 'Focus a specific Safari tab.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_activate_window',
    description: 'Bring a Safari window to the front.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
      },
      required: ['window_index'],
    },
  },
  {
    name: 'safari_reload_tab',
    description: 'Reload a Safari tab.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_go_back',
    description: 'Navigate back in a Safari tab.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_go_forward',
    description: 'Navigate forward in a Safari tab.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_get_page_content',
    description: 'Read page content from Safari.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['visible', 'readability', 'full_dom'] },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_get_page_markdown',
    description: 'Return page content as summary-friendly markdown.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['visible', 'readability', 'full_dom'] },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_get_page_html',
    description: 'Return full page HTML from Safari.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_get_selection',
    description: 'Get the selected text from Safari.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_extract_links',
    description: 'Extract links from the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 1000 },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_extract_images',
    description: 'Extract images from the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 1000 },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_find_in_page',
    description: 'Find text occurrences in the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 1000 },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
      required: ['query'],
    },
  },
  {
    name: 'safari_summarize_page',
    description: 'Return summary-ready content for the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_run_javascript',
    description: 'Run JavaScript in the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        script: { type: 'string' },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
      required: ['script'],
    },
  },
  {
    name: 'safari_query_elements',
    description: 'Query DOM elements in the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 1000 },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
      required: ['selector'],
    },
  },
  {
    name: 'safari_click_element',
    description: 'Click an element in the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
      required: ['selector'],
    },
  },
  {
    name: 'safari_type_into_element',
    description: 'Type text into an element in the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        text: { type: 'string' },
        clear: { type: 'boolean' },
        submit: { type: 'boolean' },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'safari_submit_form',
    description: 'Submit a form in the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
      required: ['selector'],
    },
  },
  {
    name: 'safari_scroll_page',
    description: 'Scroll the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        top: { type: 'integer', minimum: 0 },
        left: { type: 'integer', minimum: 0 },
        percent: { type: 'number', minimum: 0, maximum: 1 },
        behavior: { type: 'string', enum: ['smooth', 'auto'] },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_wait_for_element',
    description: 'Wait for an element to appear in the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        timeout_ms: { type: 'integer', minimum: 100, maximum: 60000 },
        interval_ms: { type: 'integer', minimum: 50, maximum: 5000 },
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
      required: ['selector'],
    },
  },
  {
    name: 'safari_list_forms',
    description: 'List forms and fields from the current Safari page.',
    inputSchema: {
      type: 'object',
      properties: {
        window_index: { type: 'integer', minimum: 1 },
        tab_index: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'safari_screenshot_visible_area',
    description: 'Capture a screenshot of the visible Safari area.',
    inputSchema: { type: 'object', properties: {} },
  },
];
