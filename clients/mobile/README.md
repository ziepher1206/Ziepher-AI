# Ziepher AI mobile client

This Capacitor 8 client packages the hosted Ziepher AI experience for Android
and iOS. All AI planning, application generation, testing, storage, previews,
and deployment run in the Ziepher cloud. End users install from Google Play,
the Apple App Store, or a signed enterprise distribution link.

The native projects are generated from this directory with:

```bash
npm ci
npx cap add android
npx cap add ios
npm run sync
```

Set `ZIEPHER_APP_URL` to the production HTTPS origin before syncing. Mobile store
publishing requires operator-owned Apple and Google developer accounts, app
signing keys, privacy disclosures, screenshots, and store approval.
