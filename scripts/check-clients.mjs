import { access, readFile } from "node:fs/promises";

const required = [
  "clients/desktop/src-tauri/tauri.conf.json",
  "clients/desktop/src-tauri/src/lib.rs",
  "clients/mobile/capacitor.config.ts",
  "clients/mobile/android/app/build.gradle",
  "clients/mobile/ios/App/App.xcodeproj/project.pbxproj",
  ".github/workflows/release-clients.yml"
];

await Promise.all(required.map((file) => access(file)));

const mobileConfig = await readFile("clients/mobile/capacitor.config.ts", "utf8");
const desktopSource = await readFile("clients/desktop/src-tauri/src/lib.rs", "utf8");
const desktopCapability = await readFile(
  "clients/desktop/src-tauri/capabilities/default.json",
  "utf8"
);

for (const source of [mobileConfig, desktopSource]) {
  if (!source.includes("https://app.ziepher.ai")) {
    throw new Error("Packaged clients must have a safe production HTTPS default.");
  }
}

for (const command of [
  "bridge_choose_workspace",
  "bridge_scan_workspace",
  "bridge_read_file",
  "bridge_write_file"
]) {
  if (!desktopSource.includes(command)) {
    throw new Error(`Desktop bridge command is missing: ${command}`);
  }
}

if (
  !desktopCapability.includes("https://app.ziepher.ai/*") ||
  desktopCapability.includes("https://*")
) {
  throw new Error("Desktop bridge remote access must remain exact-origin scoped.");
}

console.log("Desktop and mobile packaging sources verified.");
