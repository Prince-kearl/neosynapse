import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function bootstrapNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await SplashScreen.hide();
  } catch {
    // Ignore if splash is already hidden.
  }

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    // Ignore on platforms where status bar APIs are not available.
  }

  try {
    await Keyboard.setResizeMode({ mode: "body" });
  } catch {
    // Ignore on platforms where keyboard APIs are not available.
  }

  CapacitorApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    CapacitorApp.exitApp();
  });
}