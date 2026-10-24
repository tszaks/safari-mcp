# safari-mcp

A local MCP server (stdio) that controls Safari on macOS. TypeScript, ES modules, Node 20+, one dependency (`@modelcontextprotocol/sdk`). Safari is driven through `osascript -l JavaScript` (JXA) and injected page JavaScript.

This file is for AI agents that work **on** this code. If you are an agent that **uses** the tools, read [docs/agents.md](docs/agents.md).

## Build and test
- `npm install`, then `npm run typecheck`, `npm run build`. The build writes `dist/` (git-ignored).
- `npm test` builds and runs `test/*.test.mjs`. `bridge.test.mjs` and `screenshot.test.mjs` drive the user's real Safari (read tabs, open a URL in the active tab, take a screenshot). Do not run them unless the user is fine with that. `registry.test.mjs` and `playwright-parity.test.mjs` are pure unit tests.
- Never launch or quit Safari on your own.

## Code map
- `src/index.ts`: stdio server, argument validation, and the `switch` that maps each tool name to a call.
- `src/tooling.ts`: `TOOL_DEFINITIONS`, the registered tools with their names, descriptions and JSON schemas.
- `src/safari.ts`: `SafariBridge`, the high-level API. Runs `osascript`, screenshots (`safaridriver`, Chrome fallback).
- `src/safari-jxa.ts`: the JXA script that lists, opens, closes and activates windows and tabs and runs page JavaScript.
- `src/page.ts`: page reading (visible, readability, full DOM), markdown, snapshots, links, images.
- `src/automation.ts`: query, click, type, submit, scroll and wait helpers.
- `docs/plans/`: the original design and plan.

## Conventions
- Match the surrounding code: naming, comment density, idiom.
- A new tool needs an entry in `src/tooling.ts`, a case in `src/index.ts`, and a row in the README tools table. Names start with `safari_`.
- Tool descriptions steer agents. Keep them accurate about side effects.
- Do not add tools that open private windows or change Safari settings. Do not add network calls.
- Do not add dependencies without discussion.
- Update `README.md`, `docs/` and `CHANGELOG.md` when behavior changes.
