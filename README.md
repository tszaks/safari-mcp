<h1 align="center">safari-mcp</h1>

<p align="center">
  A local MCP server that lets an AI agent read and control Safari on your Mac.
</p>

<p align="center">
  <a href="https://github.com/tszaks/safari-mcp/actions/workflows/ci.yml"><img src="https://github.com/tszaks/safari-mcp/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/tszaks/safari-mcp" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/macOS-Safari-blue" alt="macOS and Safari">
  <img src="https://img.shields.io/badge/Node-20%2B-339933" alt="Node 20 or later">
</p>

An example conversation, using the tools listed below:

```text
You:    Summarize the article I have open in Safari.
Agent:  safari_get_active_tab        -> https://example.com/post  "Example post"
        safari_get_page_markdown     -> (page as markdown)
Agent:  The post argues that ...
```

safari-mcp is a [Model Context Protocol](https://modelcontextprotocol.io) server that runs on your Mac and talks to the Safari you already use. An agent such as Claude Code, Codex or Claude Desktop can list your tabs, read pages, click, type, wait for changes and run JavaScript.

It is for people who want an agent to work inside their real, logged-in Safari instead of a fresh automated browser. It drives Safari through macOS scripting (`osascript`), so there is no browser framework to install and nothing leaves your machine.

## Features

- **Works with the tabs you have open.** Find a tab by URL or title, list every window and tab (with a private-window flag), and reuse a tab instead of opening a duplicate.
- **Page reading in three modes.** Read `visible`, `readability` (article text) or `full_dom` content, or get markdown, raw HTML, links, images, the current selection or a summary-ready extract.
- **Playwright-style snapshots.** `safari_snapshot_page` returns a structured page map with viewport info and the elements an agent can act on.
- **DOM interaction.** Query elements, click (with basic interactability checks), type, submit forms, scroll and list forms and fields.
- **Reliable waits.** Wait for an element, for navigation to finish, or for text to appear or disappear.
- **Screenshots.** Uses the Safari WebDriver when it is enabled and falls back to a Chrome-based render of the page snapshot.
- **Local only.** Plain stdio server. It makes no network requests of its own beyond the localhost connection to `safaridriver` used for screenshots.

## Requirements

- macOS with Safari at `/Applications/Safari.app`
- Node.js 20 or later
- In Safari: the Develop menu and `Allow JavaScript from Apple Events` turned on
- Optional, for screenshots: `Allow remote automation` in Safari, or Google Chrome, Chrome Canary or Chromium in `/Applications`

Turn on the Safari settings from Terminal:

```bash
defaults write com.apple.Safari IncludeDevelopMenu -bool true
defaults write com.apple.Safari AllowJavaScriptFromAppleEvents -bool true
killall Safari || true
open -a /Applications/Safari.app
```

Then in Safari, open `Develop` > `Developer Settings…` and turn on `Allow remote automation` if you want the WebDriver screenshot backend.

## Install

safari-mcp is not published to npm (the `safari-mcp` name on npm belongs to a different project). Install from source:

```bash
git clone https://github.com/tszaks/safari-mcp.git
cd safari-mcp
npm install
npm run build
```

The entry point is `dist/index.js`. Use its absolute path in the client configs below (`/Users/you/safari-mcp/dist/index.js` is an example). It needs no environment variables.

## Client configuration

### Claude Code

```bash
claude mcp add safari -- node /Users/you/safari-mcp/dist/index.js
```

### Codex

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.safari]
command = "node"
args = ["/Users/you/safari-mcp/dist/index.js"]
```

### Claude Desktop

Add this to `claude_desktop_config.json` (Settings > Developer > Edit Config):

```json
{
  "mcpServers": {
    "safari": {
      "command": "node",
      "args": ["/Users/you/safari-mcp/dist/index.js"]
    }
  }
}
```

## Tools

The server registers 33 tools (the list comes from `src/tooling.ts`). Most take optional `window_index` and `tab_index` (1-based) to pick a tab. Without them, the active tab is used.

| Tool | What it does |
|---|---|
| `safari_get_active_tab` | URL and title of the active tab |
| `safari_find_tab` | Find open tabs by URL or title substring |
| `safari_list_tabs` | List tabs across all windows, with a private flag per window |
| `safari_list_windows` | List windows and their tabs |
| `safari_open_url` | Navigate the active tab to a URL (no new tab or window) |
| `safari_new_tab` | Open a new tab in the front window |
| `safari_close_tab` | Close a tab |
| `safari_close_tabs` | Close several tabs in a window |
| `safari_activate_tab` | Focus a tab |
| `safari_activate_window` | Bring a window to the front |
| `safari_reload_tab` | Reload a tab |
| `safari_go_back` | Go back in a tab |
| `safari_go_forward` | Go forward in a tab |
| `safari_get_page_content` | Read page content (`visible`, `readability` or `full_dom`) |
| `safari_get_page_markdown` | Page content as markdown |
| `safari_snapshot_page` | Structured page snapshot with actionable elements |
| `safari_get_page_html` | Full page HTML |
| `safari_get_selection` | The selected text |
| `safari_extract_links` | Links on the page |
| `safari_extract_images` | Images on the page |
| `safari_find_in_page` | Find text occurrences in the page |
| `safari_summarize_page` | Summary-ready page content |
| `safari_run_javascript` | Run JavaScript in the page |
| `safari_query_elements` | Query DOM elements |
| `safari_click_element` | Click an element, with interactability checks |
| `safari_type_into_element` | Type text into an element |
| `safari_submit_form` | Submit a form |
| `safari_scroll_page` | Scroll the page |
| `safari_wait_for_element` | Wait for an element to appear |
| `safari_wait_for_navigation` | Wait for navigation to finish loading |
| `safari_wait_for_text` | Wait for text to appear or disappear |
| `safari_list_forms` | List forms and their fields |
| `safari_screenshot_visible_area` | Screenshot of the visible area, saved as a PNG in a temp folder |

## Using with agents

The tool descriptions steer agents to reuse what you already have open: call `safari_get_active_tab` first, use `safari_find_tab` before `safari_open_url`, and prefer `safari_open_url` over `safari_new_tab`. `safari_new_tab` never opens a new window or a private window. Prefer non-private windows when you want an agent to use a logged-in session. See [docs/agents.md](docs/agents.md).

## FAQ

**What can an agent see and do?** Anything in Safari that you can. That includes pages where you are logged in, the text and HTML of those pages, form contents, and any JavaScript it runs in them. Treat access to this server like access to your browser. See [Permissions and privacy](#permissions-and-privacy).

**Does it send data anywhere?** The server sends nothing over the network itself. The agent that calls it does see the page data the tools return, and your AI client sends that to its model provider. For screenshots, the server starts `/usr/bin/safaridriver` on a random localhost port and talks to it over `127.0.0.1` only.

**Why does Safari sometimes come to the front?** Some operations (activating tabs or windows, opening Safari) bring Safari forward.

## Permissions and privacy

- **Apple Events (Automation).** The first time an agent uses a tool, macOS asks whether your terminal or MCP client may control Safari. Allow it under System Settings > Privacy & Security > Automation.
- **Safari settings.** `Allow JavaScript from Apple Events` is required: that is how the server reads pages and runs scripts in them.
- **Data it can read.** Tab URLs and titles for all windows (private windows included, flagged `private`), page text and HTML, form fields and their values, links, images, and the result of any JavaScript the agent runs.
- **Data it can change.** It can navigate, close tabs, click, type, submit forms and run arbitrary JavaScript in any open page. There is no read-only mode.
- **Files it writes.** Screenshots are written as PNG (and a temporary HTML file for the Chrome fallback) into a new folder under your system temp directory named `safari-mcp-*`.
- **Network.** None from the server itself, apart from the localhost WebDriver connection for screenshots.

## Development

```bash
npm install
npm run typecheck
npm run build
npm test
```

`npm test` builds and then runs the tests in `test/`. Some of them drive your real Safari (they read the active tab, list tabs and open a URL), so run them on a Mac where that is fine.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Security issues go through [SECURITY.md](SECURITY.md). Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md). Changes are listed in [CHANGELOG.md](CHANGELOG.md). Agents working on the code should read [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
