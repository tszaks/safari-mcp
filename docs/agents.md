# Using safari-mcp as an agent

This page is for an AI agent that calls the safari-mcp tools. For agents that edit this repository, read [AGENTS.md](../AGENTS.md).

## Rules that keep the user's session safe

1. Call `safari_get_active_tab` first. The user may already have the page open.
2. Call `safari_find_tab` with a URL or title substring before `safari_open_url`. Reuse the tab it finds with `safari_activate_tab`.
3. Use `safari_open_url` to visit a page. It navigates the active tab. Use `safari_new_tab` only when you need a second tab.
4. Check the `private` flag from `safari_list_tabs` or `safari_list_windows`. Prefer non-private windows when the task needs a logged-in session.
5. Pass `window_index` and `tab_index` (1-based) when you work on a tab that is not the active one.

## A typical read

```text
safari_find_tab                query "docs.example.com"
safari_get_page_markdown       window_index 1, tab_index 3
```

## A typical form flow

```text
safari_snapshot_page           see what can be acted on
safari_type_into_element       fill a field
safari_click_element           click the submit button
safari_wait_for_navigation     wait for the next page
safari_wait_for_text           confirm the result text
```

## Notes

- `safari_get_page_content` has three modes: `visible`, `readability` and `full_dom`.
- `safari_snapshot_page` returns viewport info and the actionable elements, so you can pick selectors without reading the whole DOM.
- `safari_run_javascript` runs in the page with the user's session. There is no sandbox. Keep scripts small and do not use it to read data the task does not need.
- `safari_screenshot_visible_area` returns a file path to a PNG in a temp folder, not the image itself. The backend is `safaridriver` when available, otherwise a Chrome render of the page snapshot.
