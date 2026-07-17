// Push Notification Utilities
// Handles browser push notification subscriptions and management

import { supabase } from './supabase';

// VAPID public key - must match the key set in Supabase Edge Function
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BGTEAag0_lKOToSElyiwSSMmtLG7V6paCY8EE51pC6FI6IJBl2uPoHb3KaVydzxQHmQJZ6izx_eN_Dq7bYv8dOk';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Check if browser supports push notifications
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    console.log('Push notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscriptionJSON | null> {
  try {
    // Ensure service worker is registered
    let registration = await navigator.serviceWorker.ready;
    
    if (!registration) {
      registration = await registerServiceWorker();
      if (!registration) {
        throw new Error('Service Worker registration failed');
      }
    }

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('Already subscribed to push notifications');
      return subscription.toJSON();
    }

    // Create new subscription
    const urlBase64ToUint8Array = (base64String: string) => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log('Subscribed to push notifications:', subscription);
    return subscription.toJSON();
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

/**
 * Save push subscription to database
 */
export async function savePushSubscription(subscription: PushSubscriptionJSON, sessionId: string, userId?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        session_id: sessionId,
        subscription: subscription,
        endpoint: subscription.endpoint,
        updated_at: new Date().toISOString(),
        ...(userId ? { user_id: userId } : {}),
      }, {
        onConflict: 'session_id'
      });

    if (error) {
      console.error('Error saving push subscription:', error);
      return false;
    }

    console.log('Push subscription saved to database');
    return true;
  } catch (error) {
    console.error('Failed to save push subscription:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(sessionId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
    }

    // Remove from database
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error removing push subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Check if user is subscribed
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/**
 * Send test notification (local only, not push)
 */
export async function sendLocalNotification(title: string, body: string, url?: string): Promise<void> {
  if (!isPushNotificationSupported()) {
    console.log('Notifications not supported');
    return;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.log('Notification permission denied');
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    icon: '/Edu51Portal.png',
    badge: '/Edu51Portal.png',
    data: { url: url || '/' },
    tag: 'local-test-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: '📖 View Now'
      },
      {
        action: 'close',
        title: '❌ Dismiss'
      }
    ]
  });
  
  console.log('✅ Test notification shown locally');
}

/**
 * Test the service worker by simulating a push event
 */
export async function testPushNotification(): Promise<void> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications not supported');
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  // Send a local test notification
  await sendLocalNotification(
    '🧪 Test Notification',
    'This is a test notification from Edu51Portal. If you see this, notifications are working!',
    '/'
  );
  
  console.log('Test notification triggered');
}

/**
 * Validate current subscription has valid encryption keys
 * Returns true if subscription is valid and can receive push notifications
 */
export async function validateCurrentSubscription(sessionId: string): Promise<boolean> {
  try {
    // Get the current subscription from the browser
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('❌ No active subscription in browser');
      return false;
    }

    // Check if subscription has required keys
    const subJson = subscription.toJSON();
    const hasP256dh = !!subJson.keys?.p256dh;
    const hasAuth = !!subJson.keys?.auth;

    if (!hasP256dh || !hasAuth) {
      console.warn('⚠️ Subscription missing encryption keys');
      console.log('Unsubscribing and requesting fresh subscription...');

      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('session_id', sessionId);

      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Request fresh subscription
      const newSub = await subscribeToPushNotifications();
      if (newSub) {
        await savePushSubscription(newSub, sessionId);
        console.log('✅ Fresh subscription created and saved');
        return true;
      }

      return false;
    }

    console.log('✅ Subscription is valid with encryption keys');
    return true;
  } catch (error) {
    console.error('Error validating subscription:', error);
    return false;
  }
}

