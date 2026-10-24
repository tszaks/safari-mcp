# Contributing to safari-mcp

Thanks for helping. safari-mcp is a small server with a narrow job: give an agent safe, reliable control of Safari on a Mac. By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

- For bugs, open an issue with the template.
- For features, open an issue first and describe the problem you want to solve.
- Small fixes (typos, clear bugs) can go straight to a pull request.
- Security problems go through [SECURITY.md](SECURITY.md), not a public issue.

## Setup

You need macOS, Safari and Node.js 20 or later. Safari needs the Develop menu and `Allow JavaScript from Apple Events` turned on (see the [README](README.md#requirements)).

```bash
git clone https://github.com/tszaks/safari-mcp.git
cd safari-mcp
npm install
npm run build
```

## Run the checks

```bash
npm run typecheck
npm test
```

`npm test` builds first. Some tests drive your real Safari: they read the active tab, list tabs and open a URL in it. Save your work in Safari before you run them. CI runs only the typecheck and the build, because GitHub runners cannot drive Safari.

## Code style

- **Match the surrounding code.** Same naming, same comment density, same idiom as the file you are editing. There is no formatter to run, so read the neighbors.
- TypeScript, strict mode, ES modules (`.js` suffix on relative imports).
- Keep dependencies at a minimum. Talk to us before adding one.
- Tool names start with `safari_`. A new tool needs an entry in `src/tooling.ts`, a case in `src/index.ts` and a row in the README table.

## Safety

This server controls a person's real browser session. Do not add tools that open private windows, change Safari settings or read files outside the screenshot temp folder. Keep tool descriptions honest about side effects, because agents choose tools from them.

## Pull request checklist

- [ ] `npm run typecheck` and `npm run build` pass.
- [ ] `npm test` passes on a Mac with Safari (or say why not).
- [ ] The change is small and focused.
- [ ] The code matches the surrounding style and adds no dependency.
- [ ] README tools table and `docs/` updated if tools or behavior changed.
- [ ] A line under `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.

## Using AI agents to contribute

Fine, as long as you read and understand what you submit. [AGENTS.md](AGENTS.md) tells coding agents how this repository works.

## License

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE).
