// ============================================================
// Push Notification Helpers — ThesisForge
// ============================================================
// Thin abstraction over the Notification API with graceful
// degradation for browsers/environments that don't support it.
// ============================================================

/**
 * Check whether the Notification API is supported in the current context.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Request notification permission.
 * Returns the permission state, or "denied" if not supported.
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn("[ThesisForge] Notifications not supported in this environment.");
    return "denied";
  }

  // Already decided
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

/**
 * Show a notification.
 * Falls back to console.log if the Notification API is unavailable.
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if (!isNotificationSupported()) {
    console.log(`[ThesisForge Notification] ${title}: ${options?.body ?? ""}`);
    return;
  }

  // Only show if permission has been granted
  if (Notification.permission !== "granted") {
    console.warn(
      "[ThesisForge] Cannot show notification — permission not granted."
    );
    return;
  }

  try {
    const notification = new Notification(title, {
      icon: "/favicon-192.png",
      badge: "/favicon-192.png",
      ...options,
    });

    // Auto-close after 8 seconds if the user hasn't interacted
    notification.onshow = () => {
      setTimeout(() => notification.close(), 8000);
    };

    // Click to focus/open the app
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Some browsers throw if called from a non-user-gesture context
    console.log(`[ThesisForge Notification] ${title}: ${options?.body ?? ""}`);
  }
}

/**
 * Schedule a writing reminder notification.
 *
 * Uses setTimeout + the Notification API as a simpler fallback when
 * the Push API / service worker messaging is unavailable.
 *
 * @param minutesFromNow - Minutes until the reminder fires
 */
export function scheduleWritingReminder(minutesFromNow: number): void {
  const ms = Math.max(0, minutesFromNow) * 60 * 1000;

  setTimeout(() => {
    showNotification("Time to write!", {
      body: "Your thesis awaits — tap to continue where you left off.",
      tag: "thesisforge-reminder",
      // @ts-expect-error — 'renotify' is valid per the Web Notification spec
      // but TypeScript's DOM typings do not include it.
      renotify: true,
    });
  }, ms);
}
