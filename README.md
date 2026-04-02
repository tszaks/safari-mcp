# safari-mcp

Local macOS Safari MCP server with:
- Safari tab and window control
- Full page reads
- Summary-ready extraction
- DOM interaction helpers
- Playwright-style page snapshots
- Stronger waits for navigation and text changes
- Safer click behavior with basic interactability checks

## Requirements

Safari must have:
- Develop menu enabled
- `Allow JavaScript from Apple Events` enabled
- `Allow remote automation` enabled if you want the Safari WebDriver screenshot backend

You can enable the Safari preference from Terminal:

```bash
defaults write com.apple.Safari IncludeDevelopMenu -bool true
defaults write com.apple.Safari AllowJavaScriptFromAppleEvents -bool true
killall Safari || true
open -a /Applications/Safari.app
```

Then in Safari:
- `Develop` -> `Developer Settings…`
- enable `Allow remote automation`

## Development

```bash
npm install
npm run build
npm test
```

## MCP Config

Example stdio entry:

```json
{
  "mcpServers": {
    "safari": {
      "command": "node",
      "args": ["/Users/tyler/Projects/MCP-Servers/safari-mcp/dist/index.js"]
    }
  }
}
```

## Useful Tools

- `safari_get_active_tab`
- `safari_list_tabs`
- `safari_open_url`
- `safari_get_page_content`
- `safari_get_page_markdown`
- `safari_snapshot_page`
- `safari_summarize_page`
- `safari_query_elements`
- `safari_click_element`
- `safari_type_into_element`
- `safari_wait_for_element`
- `safari_wait_for_navigation`
- `safari_wait_for_text`

## Notes

- `safari_get_page_content` supports `visible`, `readability`, and `full_dom`.
- `safari_snapshot_page` returns a structured page map with viewport info and actionable elements.
- `safari_wait_for_navigation` and `safari_wait_for_text` make multi-step Safari flows more reliable.
- Screenshot support now prefers Safari WebDriver and falls back to a Chrome-based DOM render when needed.
