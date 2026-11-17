/**
 * Shows a system notification. Through the service worker when there is one: Android only
 * shows notifications from an installed PWA that way (`new Notification` throws there).
 * Best effort: no permission or no support means nothing happens.
 */
export async function notifyUser(title: string, body: string, url = "/pomodoro"): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const options = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "pipo-timer",
    data: { url },
  };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch {
    // Some browsers refuse page notifications even with permission; the in-app toast remains
  }
}
