import { ConfigContext, ExpoConfig } from "expo/config";
import os from "os";

type ExtraConfig = {
  apiUrl?: string;
};

function detectLocalNetworkAddress(): string | null {
  try {
    const networks = os.networkInterfaces();
    const groups = Object.values(networks);

    for (const group of groups) {
      if (!Array.isArray(group)) {
        continue;
      }

      for (let index = 0; index < group.length; index += 1) {
        const current = group[index];
        if (!current || typeof current !== "object") {
          continue;
        }

        const net = current as unknown as Record<string, unknown>;
        const familyRaw = net.family;
        const addressRaw = net.address;
        const internalRaw = net.internal;

        const family = typeof familyRaw === "string" ? familyRaw : String(familyRaw ?? "");
        const address = typeof addressRaw === "string" ? addressRaw : null;
        const isInternal = typeof internalRaw === "boolean" ? internalRaw : false;

        if ((family === "IPv4" || family === "4") && address && !isInternal) {
          return address;
        }
      }
    }
  } catch (err) {
    console.warn("Não foi possível detectar o IP local.", err);
  }
  return null;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const localAddress = detectLocalNetworkAddress();
  const inferredLocalApiUrl = localAddress ? `http://${localAddress}:4000` : undefined;

  const extra: ExtraConfig = {
    ...(config.extra as ExtraConfig | undefined),
    apiUrl: process.env.EXPO_PUBLIC_API_URL || process.env.API_URL || inferredLocalApiUrl || "http://10.0.2.2:4000",
  };

  return {
    ...config,
    name: "GoodValue",
    slug: "goodvalue",
    version: "1.0.0",
    sdkVersion: "54.0.0",
    scheme: "goodvalue",
    platforms: ["ios", "android"],
    icon: "./assets/brand/icon.png",
    splash: {
      image: "./assets/brand/splash.png",
      resizeMode: "contain",
      backgroundColor: "#2B6CB0",
    },
    extra,
    plugins: ["expo-router"],
    assetBundlePatterns: ["**/*"],
    android: {
      ...config.android,
      adaptiveIcon: {
        foregroundImage: "./assets/brand/icon.png",
        backgroundColor: "#2B6CB0",
      },
    },
    ios: {
      ...config.ios,
      icon: "./assets/brand/icon.png",
    },
  };
};
