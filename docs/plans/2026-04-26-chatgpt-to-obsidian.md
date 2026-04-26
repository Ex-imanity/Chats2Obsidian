# ChatGPT to Obsidian Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local Chrome/Edge extension that exports the current ChatGPT conversation to Obsidian-friendly Markdown.

**Architecture:** Keep conversion as a pure tested module, then connect browser-specific extraction and popup actions around it. Avoid native file writes; use download and `obsidian://new` import for a simple first version.

**Tech Stack:** Manifest V3, plain JavaScript, HTML/CSS, Node built-in test runner.

---

### Task 1: Markdown Converter

**Files:**
- Create: `src/markdown.js`
- Create: `test/markdown.test.js`

**Step 1:** Write tests for frontmatter escaping, role sections, tags, source callout, and filename sanitizing.

**Step 2:** Run `node --test` and confirm it fails because the module does not exist.

**Step 3:** Implement the converter with no external dependencies.

**Step 4:** Run `node --test` and confirm it passes.

### Task 2: Extension Shell

**Files:**
- Create: `manifest.json`
- Create: `popup.html`
- Create: `popup.css`
- Create: `popup.js`
- Create: `content.js`
- Create: `background.js`

**Step 1:** Implement Manifest V3 permissions for `activeTab`, `scripting`, `downloads`, and `storage`.

**Step 2:** Implement content extraction with multiple selectors and accessible fallbacks.

**Step 3:** Implement popup controls for vault, folder, tags, preview, download, and Obsidian import.

**Step 4:** Add clear errors for unsupported pages and empty conversations.

### Task 3: Documentation and Verification

**Files:**
- Create: `README.md`

**Step 1:** Document installation via Chrome/Edge developer mode.

**Step 2:** Document usage and privacy notes.

**Step 3:** Run `node --test`, inspect JSON validity, and list extension files.
