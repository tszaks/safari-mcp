# Safari MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local macOS MCP server that gives Codex full Safari browser control, full-page reading, summarization, and practical DOM automation.

**Architecture:** Use a small Node/TypeScript MCP server with a thin Safari bridge. Keep native window and tab control in JXA, keep page extraction and action helpers in simple injected JavaScript, and use lightweight Node retry loops for waits and stabilization.

**Tech Stack:** Node.js 20+, TypeScript, `@modelcontextprotocol/sdk`, macOS `osascript` with JXA, Safari `do JavaScript`

---

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `README.md`
- Create: `LICENSE`
- Create: `src/index.ts`
- Create: `src/tooling.ts`

**Step 1: Create the package manifest**

Create `package.json` with:
- package name `safari-mcp`
- Node 20 engine
- build, start, typecheck, and test scripts
- minimal dependencies only

**Step 2: Create TypeScript config**

Create `tsconfig.json` that outputs to `dist/` and matches the style used by existing MCP servers in `/Users/tyler/Projects/MCP-Servers/`.

**Step 3: Create the entrypoint and tool registry shell**

Add a minimal `src/index.ts` and `src/tooling.ts` that:
- boot the MCP stdio server
- list tools
- return placeholder results for one smoke-test tool

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json tsconfig.json README.md LICENSE src/index.ts src/tooling.ts
git commit -m "feat: scaffold safari mcp server"
```

### Task 2: Add the Safari JXA bridge

**Files:**
- Create: `src/safari.ts`
- Create: `src/safari-jxa.ts`
- Modify: `src/index.ts`

**Step 1: Write a failing bridge smoke test**

Create a small Node test that expects the bridge to:
- list Safari windows
- read the active tab

**Step 2: Run the test to confirm failure**

Run: `npm test`
Expected: FAIL because the bridge is not implemented yet

**Step 3: Implement the minimal bridge**

Add:
- a helper to run `osascript -l JavaScript`
- JXA commands for:
  - active tab
  - tabs
  - windows
  - open URL
  - new tab
  - close tab
  - activate tab/window
  - reload
  - back
  - forward

**Step 4: Wire the browser control tools**

Expose:
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

**Step 5: Run tests**

Run: `npm test`
Expected: PASS for bridge smoke coverage

**Step 6: Commit**

```bash
git add src/index.ts src/safari.ts src/safari-jxa.ts
git commit -m "feat: add safari tab and window controls"
```

### Task 3: Add page extraction helpers

**Files:**
- Create: `src/page.ts`
- Modify: `src/index.ts`
- Modify: `src/tooling.ts`

**Step 1: Write failing extraction tests**

Add tests for:
- visible text extraction
- readability extraction fallback behavior
- full DOM text extraction
- markdown conversion shape

**Step 2: Run the tests**

Run: `npm test`
Expected: FAIL because page extraction is missing

**Step 3: Implement minimal extraction**

In `src/page.ts`, add helpers that run JavaScript in the target Safari tab to extract:
- title
- URL
- visible text
- selected text
- full DOM text
- links
- images

Add a simple readability-style extractor:
- prefer `<main>` when present
- fall back to article-like containers
- fall back to `document.body.innerText`

**Step 4: Expose read tools**

Expose:
- `safari_get_page_content`
- `safari_get_page_markdown`
- `safari_get_page_html`
- `safari_get_selection`
- `safari_extract_links`
- `safari_extract_images`
- `safari_find_in_page`

**Step 5: Run tests**

Run: `npm test`
Expected: PASS

**Step 6: Commit**

```bash
git add src/index.ts src/tooling.ts src/page.ts
git commit -m "feat: add safari page extraction tools"
```

### Task 4: Add summarization support

**Files:**
- Modify: `src/page.ts`
- Modify: `src/index.ts`
- Modify: `src/tooling.ts`

**Step 1: Write a failing test**

Test that `safari_summarize_page` returns:
- title
- URL
- summary-ready content block
- extraction mode used

**Step 2: Run the test**

Run: `npm test`
Expected: FAIL

**Step 3: Implement the summarization helper**

Keep this simple:
- do not call external models
- return a compact structured payload optimized for the MCP client to summarize
- include optional truncation limits

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/index.ts src/tooling.ts src/page.ts
git commit -m "feat: add safari summarization helper"
```

### Task 5: Add DOM automation actions

**Files:**
- Create: `src/automation.ts`
- Modify: `src/index.ts`
- Modify: `src/tooling.ts`

**Step 1: Write failing tests**

Add tests for:
- query elements by CSS selector
- click an element
- type into an input
- scroll the page
- list forms

**Step 2: Run the tests**

Run: `npm test`
Expected: FAIL

**Step 3: Implement the minimal automation helpers**

In `src/automation.ts`, add JavaScript actions for:
- `querySelector` based lookup
- dispatching click events
- setting input values and dispatching input/change events
- scrolling to coordinates or percentage
- enumerating forms and fields

**Step 4: Expose automation tools**

Expose:
- `safari_run_javascript`
- `safari_query_elements`
- `safari_click_element`
- `safari_type_into_element`
- `safari_scroll_page`
- `safari_list_forms`

**Step 5: Run tests**

Run: `npm test`
Expected: PASS

**Step 6: Commit**

```bash
git add src/index.ts src/tooling.ts src/automation.ts
git commit -m "feat: add safari dom automation tools"
```

### Task 6: Add Phase 2 reliability helpers

**Files:**
- Modify: `src/automation.ts`
- Modify: `src/index.ts`
- Modify: `src/tooling.ts`

**Step 1: Write failing tests**

Add tests for:
- wait for element with timeout
- submit a form by selector
- close tabs in bulk

**Step 2: Run the tests**

Run: `npm test`
Expected: FAIL

**Step 3: Implement the helpers**

Add:
- short retry-loop wait helper in Node
- form submit helper
- bulk close helper with optional `confirm`

**Step 4: Expose tools**

Expose:
- `safari_wait_for_element`
- `safari_submit_form`
- improved `safari_close_tabs`

**Step 5: Run tests**

Run: `npm test`
Expected: PASS

**Step 6: Commit**

```bash
git add src/index.ts src/tooling.ts src/automation.ts
git commit -m "feat: add safari reliability helpers"
```

### Task 7: Add screenshot support

**Files:**
- Modify: `src/safari.ts`
- Modify: `src/index.ts`
- Modify: `src/tooling.ts`
- Modify: `README.md`

**Step 1: Write a failing test**

Add a test for `safari_screenshot_visible_area` response shape.

**Step 2: Run the test**

Run: `npm test`
Expected: FAIL

**Step 3: Implement the simplest workable screenshot path**

Recommended order:
1. Try AppleScript or native Safari automation if it can return a stable screenshot path
2. If Safari does not support this cleanly, use a small macOS screen capture fallback targeted at the frontmost Safari window and document the limitation clearly

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/safari.ts src/index.ts src/tooling.ts README.md
git commit -m "feat: add safari screenshot tool"
```

### Task 8: Polish docs and local install flow

**Files:**
- Modify: `README.md`
- Create: `test/smoke.test.mjs`

**Step 1: Add install docs**

Document:
- macOS Automation permissions
- Safari Develop menu requirement if needed
- Codex MCP config example
- example prompts
- tool list
- known limitations

**Step 2: Add smoke test coverage**

Add one basic end-to-end smoke test that validates:
- server boots
- tools list loads
- at least one bridge command returns structured data

**Step 3: Run full verification**

Run:
- `npm run typecheck`
- `npm test`
- `npm run build`

Expected: PASS for all three

**Step 4: Commit**

```bash
git add README.md test/smoke.test.mjs
git commit -m "docs: add safari mcp setup and smoke coverage"
```

### Task 9: Final review and packaging

**Files:**
- Modify: any files needed from review

**Step 1: Run review**

Run the requested review workflow and fix all P0 and P1 issues before shipping.

**Step 2: Re-run verification**

Run:
- `npm run typecheck`
- `npm test`
- `npm run build`

Expected: PASS

**Step 3: Prepare repo metadata**

If this becomes its own git repo:
- set remote
- point future PRs to `development` by default if the repo uses that branching model

**Step 4: Commit**

```bash
git add .
git commit -m "chore: finalize safari mcp package"
```
