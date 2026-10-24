# Changelog

All notable changes to safari-mcp are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- README rewrite with a tools table, client configs for Claude Code, Codex and Claude Desktop, and a permissions and privacy section.
- CONTRIBUTING, SECURITY, Code of Conduct, AGENTS.md, issue and pull request templates, an agent guide in `docs/agents.md`, and a CI workflow that runs the typecheck and build.

## [1.2.0] - 2026-05-12

### Added
- `safari_find_tab` to search open tabs by URL or title.
- Tools now prefer existing tabs and reuse the active tab for navigation.

### Fixed
- Private window detection.

## [1.1.0] - 2026-04-02

### Added
- Playwright-style page snapshots (`safari_snapshot_page`).
- `safari_wait_for_navigation` and `safari_wait_for_text`.

## Initial commit - 2026-03-09

Untagged first commit: a local macOS Safari MCP server with tab and window control, page reading, DOM interaction and JavaScript execution over stdio.
