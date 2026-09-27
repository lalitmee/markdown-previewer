# Markdown Previewer React Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the static offline markdown previewer as a served React SPA with IndexedDB-backed history, CodeMirror split editing, rich rendering (mermaid, highlight.js), and Chromium File System Access API.

**Architecture:** Vite + React SPA on localhost. File System Access API returns persistable handles (kills webkitdirectory 60-file cap, enables history). Handles stored in IndexedDB (LRU cap 20). Markdown pipeline: strip mermaid fences → marked (GFM) → DOMPurify → mermaid.render → highlight.js → inline images from folder handles. In-app navigation: Picker → Library → Preview/Editor. Theme CSS-vars, default light.

**Tech Stack:** Vite, React 18, marked, DOMPurify, mermaid, highlight.js, @uiw/react-codemirror + @codemirror/lang-markdown, Vitest + jsdom + fake-indexeddb.

**Spec:** Approved in chat on 2026-09-18 (user messages m0072–m0079). Key constraints: served app (tmux/sesh launch), Chrome/Edge-first (Chromium FSA), CodeMirror editor, skip math, in-app nav, light-by-default theme.

## Global Constraints

- Chromium File System Access API required for history persistence + folder reload; graceful fallback (one-shot webkitdirectory) for other browsers, history hidden.
- History LRU cap: default 20, dedupe by handle name.
- Theme: CSS variables, default `light`, persisted in localStorage.
- i18n/shorthand: no. All text in English.
- No math (KaTeX deferred)
- Everything bundles via npm; no CDN; deliverable run via `npm run dev` or build+serve.

---