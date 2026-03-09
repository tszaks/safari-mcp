# Safari MCP Design

## Scope
Build a local macOS MCP server that gives Codex full Safari browser control on this Mac, including tab and window management, page reading, summarization, DOM interaction, form automation, and JavaScript execution.

## Product Goal
Make Safari feel like a first-class local automation target for Codex. The server should support both research-style page reading and active browser control without adding unnecessary layers or heavy dependencies.

## Architecture
- Runtime: Node.js 20+
- MCP transport: stdio via `@modelcontextprotocol/sdk`
- Native Safari control: `osascript -l JavaScript` (JXA)
- Page interaction: injected JavaScript via Safari tab `do JavaScript`
- Optional richer automation layer:
  - lightweight wait/retry logic in Node
  - no external browser framework in v1 unless Safari limitations force it
- Server layout:
  - `src/index.ts` tool registry and argument validation
  - `src/safari.ts` high-level bridge API
  - `src/safari-jxa.ts` Safari window/tab automation
  - `src/page.ts` DOM extraction, readability-style cleanup, summarization input shaping
  - `src/automation.ts` click, type, submit, scroll, wait, and query helpers
  - `src/tooling.ts` shared tool definitions

## Tooling
### Browser Control
- `safari_get_active_tab`
- `safari_list_tabs`
- `safari_list_windows`
- `safari_open_url`
- `safari_new_tab`
- `safari_close_tab`
- `safari_close_tabs`
- `safari_activate_tab`
- `safari_activate_window`
- `safari_reload_tab`
- `safari_go_back`
- `safari_go_forward`

### Page Reading
- `safari_get_page_content`
- `safari_get_page_markdown`
- `safari_get_page_html`
- `safari_get_selection`
- `safari_extract_links`
- `safari_extract_images`
- `safari_find_in_page`
- `safari_summarize_page`

### Automation
- `safari_run_javascript`
- `safari_query_elements`
- `safari_click_element`
- `safari_type_into_element`
- `safari_submit_form`
- `safari_scroll_page`
- `safari_wait_for_element`
- `safari_list_forms`
- `safari_screenshot_visible_area`

## Page Content Modes
`safari_get_page_content` should support three modes:
- `visible`: text currently visible in the viewport
- `readability`: cleaned article-like content suitable for summaries
- `full_dom`: full page text extraction from the DOM for exhaustive reads

Default mode should be `readability`, with fallback to `full_dom` when the page does not produce a useful article result.

## Behavior
- Tools can target the active tab by default.
- Tools can also target a specific tab by `window_id` + `tab_index`, or a stable `tab_id` if Safari metadata allows a reliable identifier.
- Reading tools should return structured JSON with `title`, `url`, `selection`, `content`, and extraction metadata.
- Automation tools should support CSS selectors first. XPath can be added later only if needed.
- Wait-based actions should use short retry loops in Node instead of complex orchestration.

## Safety
- Read-only tools are safe by default.
- State-changing tools should remain one-step actions because the primary goal is full browser control.
- High-impact actions should still accept optional `confirm: true` for bulk operations:
  - closing multiple tabs
  - submitting a form
  - running JavaScript flagged as destructive by the caller

## KISS Boundaries
- No browser history database parsing
- No cookie or credential extraction in v1
- No background crawling engine
- No multi-browser abstraction
- No headless mode

## Phase Plan
### Phase 1
- Safari tab and window control
- Full page reading
- Markdown and readability extraction
- Summarization helper
- JavaScript execution
- Basic click, type, and scroll

### Phase 2
- Wait helpers
- Form discovery and submit helpers
- Bulk tab operations
- Screenshot support
- Better element querying and extraction utilities

## Public Packaging
- Publish with MIT license
- Keep implementation dependency-light and auditable
- Document required macOS Automation permissions clearly
- Include MCP config examples and example prompts in `README.md`
