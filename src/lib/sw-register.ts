// ============================================================
// Service Worker Registration — ThesisForge
// ============================================================
// Registers the service worker, requests notification permission,
// and exposes helper functions for scheduling reminders.
// Only runs in browser environment.
// ============================================================

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register the service worker and request notification permission.
 * Safe to call multiple times — idempotent.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) {
    console.warn("[ThesisForge] Service workers are not supported in this browser.");
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    swRegistration.addEventListener("updatefound", () => {
      const newWorker = swRegistration?.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "activated") {
          console.log("[ThesisForge] New service worker activated.");
        }
      });
    });

    console.log("[ThesisForge] Service worker registered successfully.");
    return swRegistration;
  } catch (error) {
    console.warn("[ThesisForge] Service worker registration failed:", error);
    return null;
  }
}

/**
 * Request notification permission from the user.
 * Returns the permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined") return "denied";
  if (!("Notification" in window)) {
    console.warn("[ThesisForge] Notifications not supported.");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Schedule a push notification reminder.
 * Sends a message to the service worker which sets a timer.
 *
 * @param minutes - Number of minutes from now to show the reminder
 */
export function scheduleReminder(minutes: number): void {
  if (typeof window === "undefined") return;

  if (!swRegistration) {
    console.warn("[ThesisForge] Cannot schedule reminder — service worker not registered.");
    return;
  }

  swRegistration.active?.postMessage({
    type: "SCHEDULE_REMINDER",
    payload: { minutes },
  });
}

/**
 * Signal to the service worker that a draft has been saved,
 * so it can cache a resume signal for offline detection.
 */
export function cacheDraftResumeSignal(payload?: {
  templateType?: string | null;
  savedAt?: number;
}): void {
  if (typeof window === "undefined") return;

  if (!swRegistration) {
    console.warn("[ThesisForge] Cannot cache draft signal — service worker not registered.");
    return;
  }

  swRegistration.active?.postMessage({
    type: "CACHE_DRAFT_RESUME",
    payload: {
      templateType: payload?.templateType ?? null,
      savedAt: payload?.savedAt ?? Date.now(),
    },
  });
}

/**
 * Register a background sync tag for save retry.
 * Falls back silently if background sync is not supported.
 */
export function registerSaveSync(): void {
  if (typeof window === "undefined") return;

  if (!swRegistration) return;

  if ("sync" in swRegistration) {
    (swRegistration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync
      .register("thesisforge-save")
      .catch(() => {
        // Background sync registration can fail in some contexts — that's OK
      });
  }
}
