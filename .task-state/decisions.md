# Decisions

- 2026-04-26: Use a Manifest V3 browser extension instead of an Obsidian plugin because the browser already has authenticated ChatGPT page access.
- 2026-04-26: Use download plus `obsidian://new` import instead of direct vault writes to avoid native host setup and keep first release simple.
- 2026-04-26: Keep Markdown conversion in `src/markdown.js` as a pure module so it can be tested with Node's built-in test runner.
- 2026-04-26: Store MRS artifacts in `.task-state/` and treat `task_state.md` as the source of truth for future recovery.
