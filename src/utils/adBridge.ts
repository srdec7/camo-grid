/**
 * adBridge.ts
 * ────────────────────────────────────────────────────────────
 * Monetization bridge layer.
 *
 * In a web browser / dev environment → simulates ads with a wait.
 * When wrapped as a native app (Capacitor / Cordova + AdMob):
 *   Replace the `_showRewardedAdWeb` stub with the SDK call.
 * ────────────────────────────────────────────────────────────
 */

/** Simulates a rewarded ad on the web with a fallback timeout to prevent infinite loading. */
async function _showRewardedAdWeb(): Promise<void> {
  return new Promise((resolve, reject) => {
    // In production native build, swap this body with the real AdMob call.
    // Simulating user watching an ad
    const timer = setTimeout(resolve, 3000);
    
    // Fallback: If native bridge fails to respond, reject after a reasonable timeout (e.g. 15s)
    // For this web mock, it always succeeds in 3s, but this pattern is safe.
    setTimeout(() => {
      clearTimeout(timer);
      reject(new Error("Ad load timeout"));
    }, 15000);
  });
}

/**
 * Shows a rewarded ad.
 * Calls onSuccess() if the user completes watching.
 * Calls onFail() if something went wrong or user skipped.
 */
export async function showRewardedAd(
  onSuccess: () => void,
  onFail?: () => void
): Promise<void> {
  try {
    await _showRewardedAdWeb();
    onSuccess();
  } catch (err) {
    console.error("Ad failed to show:", err);
    if (onFail) onFail();
  }
}

/**
 * Simulates an IAP (In-App Purchase).
 * In native build: hook up to RevenueCat / StoreKit / Google Play Billing.
 */
export async function purchaseNoAds(onSuccess: () => void, onFail?: () => void): Promise<void> {
  try {
    // Web mock — auto-succeed after brief delay
    await new Promise((r) => setTimeout(r, 800));
    onSuccess();
  } catch (err) {
    console.error("Purchase failed:", err);
    if (onFail) onFail();
  }
}

/**
 * Simulates Restoring Purchases.
 * Apple requires a "Restore Purchases" button for non-consumable items like No Ads.
 */
export async function restorePurchases(onSuccess: () => void, onFail?: () => void): Promise<void> {
  try {
    await new Promise((r) => setTimeout(r, 800));
    // Usually checks the app store receipt.
    // If the user previously bought it, we call onSuccess.
    onSuccess();
  } catch (err) {
    console.error("Restore failed:", err);
    if (onFail) onFail();
  }
}
