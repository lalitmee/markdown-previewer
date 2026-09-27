# Markdown Previewer

A browser-based Markdown reader and editor. Open a Markdown file or choose a folder to browse, search, preview, and edit your documents. Files stay on your device; the app does not upload them.

## Features

- Open one Markdown file or browse a folder recursively (`.md`, `.markdown`, `.mdown`, and `.mkd`).
- Preview GitHub-Flavored Markdown, syntax-highlighted code blocks, and Mermaid diagrams.
- Edit in a split editor/preview view and save changes back to the selected file.
- Search filenames and document contents in a selected folder; switch between grid and list layouts.
- Toggle light and dark themes, adjust preview width and editor font, and zoom Mermaid diagrams.
- Reopen recent files and folders from browser-stored history.

## Requirements

- Node.js and npm.
- A browser that supports the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API), such as a recent desktop version of Chrome or Edge.
- A secure context for local file access. `localhost` is suitable for development; deployed instances should use HTTPS.

The app asks the browser for access when you choose a file or folder. Folder browsing, editing, and saving depend on browser support and the permissions you grant.

## Run locally

Clone the repository, then install dependencies and start the development server:

```sh
git clone https://github.com/lalitmee/markdown-previewer.git
cd markdown-previewer
npm ci
npm run dev
```

Open the local URL printed by Vite in a supported browser.

## Use the app

1. Choose **Open single file** to preview one Markdown document, or **Choose folder** to browse a directory and its subdirectories.
2. Select a document to preview it. In a folder library, use the search field to find text in filenames and document contents.
3. Use the edit/preview control to switch to a split editor and preview. Select **Save** to write changes to the original file when the browser grants write access.
4. Use the toolbar to change theme, library layout, editor font, or preview width. Click Mermaid diagrams to zoom them.

## Data and privacy

Markdown files are read locally through browser file handles and are not sent to a server by this app. Recent file/folder handles are kept in IndexedDB, and interface preferences (such as theme and layout) are kept in local storage. The browser may require you to grant file or folder permission again when reopening an item.

## Development commands

```sh
npm test        # run the test suite
npm run build   # create a production build in dist/
npm run preview # serve the production build locally
```

## License

This repository does not currently include a license file. Add one to specify terms for using, modifying, or redistributing the project.
