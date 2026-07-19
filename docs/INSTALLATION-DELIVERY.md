# Ziepher AI installation and cloud-delivery architecture

## End-user promise

A Ziepher user installs only Ziepher AI, or opens its HTTPS application. The
user does not install Node.js, Docker, Git, a code editor, Supabase CLI, Stripe
CLI, AI SDKs, build tools, or deployment tools.

All planning, source generation, dependency installation, testing, repair,
preview publishing, storage, and deployment orchestration run in Ziepher-managed
cloud services.

## Delivery channels

### Installable web application

The Next.js application includes:

- `/manifest.webmanifest`;
- 192 px, 512 px, and maskable icons;
- a service worker;
- an offline status page;
- a visible **Install Ziepher** control;
- standalone display mode.

The service worker caches only public application-shell assets. It explicitly
does not cache API responses, authentication routes, private projects, or
generated previews.

### Desktop

`clients/desktop` is a Tauri 2 client. Release automation packages:

- Windows `.msi` and setup `.exe`;
- macOS `.dmg`/application bundles;
- Linux `.AppImage` and `.deb`.

The installed client opens the production HTTPS control plane. No build engine
or platform secret is stored on the device.

### Android and iOS

`clients/mobile` is a Capacitor 8 client with committed Android and iOS native
projects. It opens the same production HTTPS control plane and includes Ziepher
branding assets.

Android CI produces an installable debug APK and a release AAB. Production Play
Store publishing requires the operator's signing key and Google Play developer
account.

iOS CI validates an unsigned simulator application. App Store distribution
requires the operator's Apple Developer account, distribution certificate,
provisioning profile, privacy declarations, and Apple review.

## Cloud processes

1. **Web control plane** — authentication, projects, free planning, billing
   interface, build requests, preview gateway, version control, and deployment
   requests.
2. **Build worker** — private queue consumer that generates code and runs
   dependency installation, type checking, tests, production compilation,
   secret scanning, and repair in isolated containers.
3. **Deployment worker** — private queue consumer that publishes successful
   versions to approved hosting providers.

Only the build-worker host receives Docker access. The public web service must
never receive the Docker socket.

## Release gates

Before publishing one-click installers:

1. deploy the web control plane to its permanent HTTPS origin;
2. set `ZIEPHER_APP_URL` in the client release workflow;
3. configure desktop code-signing certificates;
4. configure Android release signing;
5. configure Apple signing and store metadata;
6. run root `npm run check`;
7. run mobile `npm run validate`;
8. build installers in GitHub Actions;
9. malware-scan and manually smoke-test every package;
10. publish from the draft release or app-store console.

Stripe remains disabled until the separate financial release gates pass.
