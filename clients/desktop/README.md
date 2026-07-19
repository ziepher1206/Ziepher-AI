# Ziepher AI desktop client

This Tauri 2 shell loads the hosted Ziepher AI product. End users install the
signed `.exe`, `.msi`, `.dmg`, `.AppImage`, or `.deb`; they do not install
Node.js, Docker, Git, Supabase tools, or AI SDKs.

Set `ZIEPHER_APP_URL` in the release workflow to the production HTTPS origin.
The default is `https://app.ziepher.ai`.

## Project Sync Bridge foundation

The desktop client exposes a small, guarded bridge to the exact Ziepher web
origin. The user must choose a project folder through a native system dialog
before any local file command can run.

- scans at most 5,000 files and ignores dependency, build, Git, and backup folders;
- reads and writes UTF-8 text files up to 2 MiB;
- rejects absolute paths, parent traversal, symlinks, and paths outside the
  selected folder;
- requires the previously read SHA-256 before overwriting an existing file;
- creates a recovery copy under `.ziepher/backups` before every overwrite;
- sends only the workspace name and checkpoint hash to shared project state.

The web UI never receives unrestricted filesystem permissions or a reusable
arbitrary root-path command.

Building locally is for Ziepher operators only:

```bash
npm ci
npm run build
```

Production releases must be code-signed. Signing credentials belong in the CI
secret store and must never be committed.
