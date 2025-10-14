import Constants from "expo-constants";
import { Platform } from "react-native";

type ExtraConfig = {
  apiUrl?: string;
};

function readExtra(): ExtraConfig {
  const expoExtra = Constants.expoConfig?.extra as ExtraConfig | undefined;
  const manifestExtra = (Constants.manifest2?.extra || Constants.manifest?.extra) as
    | ExtraConfig
    | undefined;
  return {
    ...manifestExtra,
    ...expoExtra,
  };
}

export function resolveApiUrl(): string {
  const extra = readExtra();
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  const candidate = extra.apiUrl || envUrl;

  if (candidate && candidate.trim()) {
    return candidate.trim();
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }

  return "http://localhost:4000";
}
