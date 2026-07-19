# Changelog

## 0.7.0 — Project Sync Bridge

- Added revisioned shared project snapshots and append-only event history.
- Added idempotent optimistic updates with explicit conflict responses.
- Added Supabase Realtime synchronization, 15-second reconnect polling, and a
  browser-local offline patch queue.
- Added a built-in AI context editor for vision, users, requirements, decisions,
  constraints, integrations, and project notes.
- Injected durable project context into planning, build, and repair prompts.
- Added authenticated sync, context, and desktop device APIs.
- Added a guarded Tauri desktop bridge with native folder approval, file scans,
  checkpoint hashing, safe text reads, compare-before-write updates, and backups.
- Restricted remote desktop IPC to the exact production and local-development origins.
- Added project sync contract tests and expanded client packaging checks.

## 0.6.0 — Working local builder

- Fixed the desktop studio layout so the idea composer remains visible.
- Added account-free local planning, building, previewing, and downloading.
- Added a standalone interactive HTML app generator with no runtime dependencies.
- Added working navigation, forms, item creation, completion, deletion, search,
  theme switching, responsive layouts, and browser-local persistence.
- Added automatic local project save and restore.
- Added a local build API and validation tests.
- Changed **Build app** so it no longer redirects unauthenticated users to sign-in.
- Added **Download app** and **New project** controls.
- Verified TypeScript, ESLint, unit tests, PWA checks, client checks, API smoke
  tests, and the optimized production build.

## 0.5.0 — One-click delivery

- Added installable PWA manifest, branded icons, service worker, offline page,
  and in-product install control.
- Added private-cache protections for API, authentication, project, and preview
  routes.
- Added Tauri 2 desktop client source for Windows, macOS, and Linux.
- Added Capacitor 8 Android and iOS projects with synchronized native assets.
- Added Android release-signing hooks.
- Added GitHub Actions packaging for desktop installers, Android APK/AAB, and
  iOS simulator validation.
- Added cloud runtime topology for web, build, and deployment services.
- Added installation and distribution documentation.
- Upgraded the repository version from 0.4.0 to 0.5.0.

## 0.4.0

- Production foundation for planning, projects, builds, previews, versions,
  deployments, billing, security, and operations.
