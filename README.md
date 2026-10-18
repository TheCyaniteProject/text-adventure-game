# Solo Adventure

An Electron solo text RPG. MVP in progress; see [PLAN.md](PLAN.md).

## Run the UI prototype

Requires Node.js 22.12+ and npm and Electron system dependencies.

```sh
npm install
npm run dev
```

`npm start` also opens the desktop app. The renderer uses plain JavaScript, HTML and CSS. You can preview `src/index.html` using a local static HTTP server as well.

`npm run dev` automatically reloads the window when UI files under `src/` change. Reloading resets the prototype's in-memory session. `npm start` does not watch files. Restart Electron manually after changes to the main process or preload code.

This is an offline UI prototype: generation is simulated, changes last only for the current window session, and no API requests or disk saves occur. Import/export and model fetching are explicitly marked placeholders. The full timeline editor is planned after the in-house MVP.

The main process uses an isolated, sandboxed renderer with Node integration disabled. A narrow preload bridge exposes only the desktop Quit action, with sender validation in the main process. A full security audit is required before leaving MVP.

Project-local `.env` and `saves/` are reserved for later backend integration; never commit credentials or private saves.

## Checks

```sh
npm run check
```

License: Unlicense.

If your development shell sets `ELECTRON_RUN_AS_NODE`, unset it before launching Electron. Desktop launch also requires a graphical session and working Chromium sandbox support.
