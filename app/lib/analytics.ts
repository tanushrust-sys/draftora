export type AnalyticsEventName =
  | 'reward_awarded'
  | 'level_up'
  | 'streak_extended'
  | 'shop_viewed'
  | 'shop_item_clicked'
  | 'shop_purchase_attempted'
  | 'shop_purchase_success'
  | 'cosmetic_equipped'
  | 'inventory_viewed'
  | 'reward_toast_seen';

export function trackEvent(name: AnalyticsEventName, properties: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;

  const payload = {
    name,
    properties,
    timestamp: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent('draftora:analytics', { detail: payload }));

  const maybeDataLayer = (window as { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(maybeDataLayer)) {
    maybeDataLayer.push({
      event: name,
      ...properties,
    });
  }
}
