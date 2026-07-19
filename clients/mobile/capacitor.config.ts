import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = process.env.ZIEPHER_APP_URL ?? "https://app.ziepher.ai";
const appHost = new URL(appUrl).host;

const config: CapacitorConfig = {
  appId: "ai.ziepher.mobile",
  appName: "Ziepher AI",
  webDir: "www",
  server: {
    url: appUrl,
    cleartext: false,
    allowNavigation: [appHost]
  },
  android: {
    allowMixedContent: false
  },
  ios: {
    contentInset: "automatic"
  }
};

export default config;
