/* eslint-disable */
/**
 * Firebase Cloud Messaging service worker stub.
 *
 * This file is intentionally minimal until FCM_PROJECT_ID etc. are set.
 * When real FCM creds are provisioned, swap this stub for the official
 * firebase-messaging service worker (importScripts of firebase-app-compat
 * and firebase-messaging-compat).
 *
 * Per Lovable PWA rules, this is a messaging worker — NOT an app-shell
 * cache. It does not intercept fetches and does not register itself.
 * Registration happens from client code only on the production origin.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle background push payloads from FCM. Until FCM is wired this is a
// no-op — push events simply won't be received in the absence of a token.
self.addEventListener("push", (event) => {
  let payload = { notification: { title: "EasyBlue", body: "New update" } };
  try {
    if (event.data) payload = event.data.json();
  } catch (_e) { /* keep default */ }

  const n = payload.notification || {};
  event.waitUntil(
    self.registration.showNotification(n.title || "EasyBlue", {
      body: n.body || "",
      icon: "/favicon.ico",
      data: payload.data || {},
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.openWindow(url));
});
