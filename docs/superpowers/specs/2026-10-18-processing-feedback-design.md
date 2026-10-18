# Processing Feedback for Markdown Imports

## Goal

Give users timely, understandable feedback whenever opening or processing a file, folder, or pasted Markdown takes long enough to be noticeable. Cover fresh selections, drops, paste previews, and items reopened from Recents.

## Current behavior

- Folder selection and directory history both call `loadFolder`. It waits for a complete recursive `listMdFiles` scan before showing the library, then reads every Markdown file sequentially into the search cache. The library's existing `Indexing… n/total` message is visible only during this latter phase.
- Single-file selection and file history wait for file reading before showing the preview. Dropped files similarly wait for `file.text()`.
- Pasted Markdown opens the preview immediately, but Markdown rendering and image inlining are asynchronous and the preview initially has no status.
- The app already has a notice/toast for errors and a library progress count; there is no shared processing state.

## Design

### Shared processing lifecycle

- Add one app-level processing state with a user-facing phase message and optional progress counts. Use it across file picker, folder picker, drop, paste preview, and Recents open flows rather than implementing independent spinners.
- Publish the state before awaiting expensive work. Show visible feedback only after a short delay so fast operations do not flash a transient indicator.
- Use specific messages for the work underway, such as “Scanning folder,” “Loading Markdown (n of total),” “Reading file,” and “Rendering preview.” Include the selected file or folder name when available.
- For folders, show the loading view immediately after selection and while recursively enumerating. Once the file list is known, show the library and its existing indexed-file count while the search cache is populated. Do not imply a percentage during enumeration unless a reliable total exists.
- Keep current eager indexing and search behavior. Do not add parallel reads, lazy indexing, cancellation controls, or a general job framework in this change.
- Pasted Markdown should show processing feedback only if preview rendering/inlining exceeds the same display delay; fast previews remain unchanged.

### Reliability and accessibility

- Clear processing state on success, failure, and navigation away. Ensure an older async operation cannot overwrite a newer screen or publish stale progress after navigation.
- Preserve existing error notices and ensure errors do not leave the app stuck in a busy state. Permission denial behavior remains unchanged.
- Expose status updates with an appropriate polite live region and mark the busy content with `aria-busy`; motion must respect reduced-motion preferences.
- Do not disable navigation or make the app appear frozen while processing.

## Scope and constraints

- Reuse the existing React state, picker/library/preview surfaces, CSS tokens, and notice pattern.
- No new dependency, storage format, or change to file-selection semantics.
- Keep this focused on user-visible processing feedback; performance optimization is separate unless testing shows feedback cannot make current processing usable.

## Acceptance criteria

1. Folder selection and folder history show delayed feedback during recursive scanning, followed by measurable indexing progress.
2. Single-file selection, file history, dropped files, and pasted Markdown previews show phase-appropriate feedback when processing exceeds the display delay.
3. Fast operations do not flash a loading indicator.
4. Success, failure, permission denial, and navigation away all leave the UI in a correct non-stuck state; stale operations cannot replace newer UI state.
5. Status is announced accessibly, busy content is marked, and any indicator animation honors reduced motion.
6. Tests cover delayed visibility, each supported entry path, folder progress, error cleanup, and stale-operation/navigation behavior.
7. Existing tests, lint, formatting checks, and production build pass.
