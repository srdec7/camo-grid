/**
 * adBridge.ts
 * ────────────────────────────────────────────────────────────
 * Monetization bridge layer.
 *
 * AdMob:
 *   App ID    : ca-app-pub-5036571902202474~6522763042  (Camo Grid)
 *   Ad Unit ID: ca-app-pub-5036571902202474/5237601534  (Rewarded)
 *
 * In-App Purchases (capacitor-plugin-cdv-purchase):
 *   Product ID: com.camogrid.noads  ← must match your App Store Connect product ID exactly
 *
 * Environment detection:
 *   - Native (Capacitor) → Uses @capacitor-community/admob + capacitor-plugin-cdv-purchase
 *   - Web browser / dev  → Simulates everything with short delays
 * ────────────────────────────────────────────────────────────
 */

import { PurchasePlugin } from 'capacitor-plugin-cdv-purchase';

// ─── AdMob Configuration Constants ───────────────────────────────────────────
export const ADMOB_APP_ID      = "ca-app-pub-5036571902202474~6522763042";
export const ADMOB_REWARDED_ID = "ca-app-pub-5036571902202474/5237601534";

// Google's official test ad IDs (used in dev/debug builds to avoid policy violations)
export const ADMOB_REWARDED_TEST_ID = "ca-app-pub-3940256099942544/5224354917";

// ⚠️ Set this to FALSE only right before archiving for the App Store.
// AdMob will block real ads from showing on development devices, so keep this TRUE during testing.
export const USE_TEST_ADS = true;

const ACTIVE_REWARDED_ID = USE_TEST_ADS ? ADMOB_REWARDED_TEST_ID : ADMOB_REWARDED_ID;

// ─── In-App Purchase Product ID ───────────────────────────────────────────────
// ⚠️  This must exactly match the Product ID you set in App Store Connect.
export const IAP_NO_ADS_PRODUCT_ID = "com.camogrid.noads";

// ─── Native (Capacitor) detection ────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isNative = (): boolean => !!(window as any)?.Capacitor?.isNativePlatform?.();

// ─── Capacitor AdMob type shim ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdMobPlugin = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAdMob(): AdMobPlugin | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { AdMob } = (window as any).Capacitor.Plugins;
    return AdMob ?? null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── AdMob ──────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

let adMobInitialized = false;

export async function initAdMob(): Promise<void> {
  if (!isNative()) return;
  if (adMobInitialized) return;

  const AdMob = getAdMob();
  if (!AdMob) return;

  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true, // iOS ATT prompt
      initializeForTesting: USE_TEST_ADS,
    });
    adMobInitialized = true;
    console.log("[AdMob] Initialized. Test mode:", USE_TEST_ADS);
    await _preloadRewardedAd();
  } catch (err) {
    console.error("[AdMob] Initialization failed:", err);
  }
}

let rewardedAdReady = false;

async function _preloadRewardedAd(): Promise<void> {
  const AdMob = getAdMob();
  if (!AdMob) return;

  try {
    await AdMob.prepareRewardVideoAd({
      adId: ACTIVE_REWARDED_ID,
      isTesting: USE_TEST_ADS,
    });
    rewardedAdReady = true;
    console.log("[AdMob] Rewarded ad pre-loaded successfully.");
  } catch (err) {
    rewardedAdReady = false;
    console.warn("[AdMob] Failed to pre-load rewarded ad:", err);
  }
}

async function _showRewardedAdNative(): Promise<void> {
  const AdMob = getAdMob();
  if (!AdMob) throw new Error("AdMob plugin not available");

  if (!rewardedAdReady) {
    console.log("[AdMob] Ad not pre-loaded, loading now...");
    await _preloadRewardedAd();
  }

  return new Promise((resolve, reject) => {
    let rewardEarned = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listeners: any[] = [];

    const cleanup = () => {
      listeners.forEach(l => { try { l.remove(); } catch {} });
    };

    // Reward event — try all known event name variants across plugin versions
    const onRewarded = () => {
      console.log("[AdMob] Reward earned!");
      rewardEarned = true;
      rewardedAdReady = false;
      _preloadRewardedAd();
    };

    listeners.push(AdMob.addListener("onRewardedVideoAdReward",   onRewarded)); // v5/v6/v8
    listeners.push(AdMob.addListener("onRewardedVideoAdRewarded", onRewarded));
    listeners.push(AdMob.addListener("onRewardVideoAdReward",     onRewarded)); // v4

    // Dismiss event — always fires when user closes the ad
    const onClosed = () => {
      console.log("[AdMob] Ad closed. Reward earned:", rewardEarned);
      rewardedAdReady = false;
      _preloadRewardedAd();
      cleanup();
      if (rewardEarned) {
        resolve();
      } else {
        reject(new Error("Ad closed without reward"));
      }
    };

    listeners.push(AdMob.addListener("onRewardedVideoAdDismissed", onClosed)); // v5/v6/v8
    listeners.push(AdMob.addListener("onRewardedVideoAdClosed",    onClosed)); // fallback
    listeners.push(AdMob.addListener("onRewardVideoAdClosed",      onClosed)); // fallback

    // Failure events
    listeners.push(AdMob.addListener("onRewardedVideoAdFailedToLoad", (error: unknown) => {
      console.error("[AdMob] Ad failed to load:", error);
      rewardedAdReady = false;
      cleanup();
      reject(new Error(`Rewarded ad failed to load: ${JSON.stringify(error)}`));
    }));

    listeners.push(AdMob.addListener("onRewardedVideoAdFailedToShow", (error: unknown) => {
      console.error("[AdMob] Ad failed to show:", error);
      rewardedAdReady = false;
      cleanup();
      reject(new Error(`Rewarded ad failed to show: ${JSON.stringify(error)}`));
    }));

    AdMob.showRewardVideoAd().catch((err: unknown) => {
      cleanup();
      reject(new Error(`showRewardVideoAd error: ${err}`));
    });
  });
}

async function _showRewardedAdWeb(): Promise<void> {
  return new Promise((resolve) => {
    // Simulates user watching a 3-second ad in browser / Vercel preview
    setTimeout(resolve, 3000);
  });
}

/**
 * Shows a rewarded ad.
 * Calls onSuccess() if the user earns the reward.
 * Calls onFail() if something went wrong or the user skipped.
 */
export async function showRewardedAd(
  onSuccess: () => void,
  onFail?: () => void
): Promise<void> {
  try {
    if (isNative()) {
      await _showRewardedAdNative();
    } else {
      await _showRewardedAdWeb();
    }
    onSuccess();
  } catch (err) {
    console.error("[AdBridge] Ad failed:", err);
    if (onFail) onFail();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── In-App Purchases (capacitor-plugin-cdv-purchase) ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * initIAP is a no-op here — capacitor-plugin-cdv-purchase initializes lazily
 * on the first call to purchase() or restore(). No setup needed.
 */
export async function initIAP(): Promise<void> {
  // capacitor-plugin-cdv-purchase is a proper Capacitor plugin injected at
  // app startup by the Capacitor runtime — no manual init step required.
  if (!isNative()) return;
  try {
    await PurchasePlugin.init();
    console.log("[IAP] PurchasePlugin initialized.");
  } catch (err) {
    console.warn("[IAP] PurchasePlugin.init() failed (non-fatal):", err);
  }
}

/**
 * Triggers a native "No Ads" In-App Purchase using Apple StoreKit.
 * PurchasePlugin.purchase() presents the native payment sheet and resolves
 * when the transaction is approved. Rejects if the user cancels.
 * Calls onSuccess() if the purchase completes.
 * Calls onFail() if the user cancels or an error occurs.
 */
export async function purchaseNoAds(
  onSuccess: () => void,
  onFail?: () => void
): Promise<void> {
  if (!isNative()) {
    // Web simulator: auto-succeed after a short delay for UI testing
    await new Promise((r) => setTimeout(r, 800));
    onSuccess();
    return;
  }

  try {
    console.log("[IAP] Checking if device can make payments...");
    const { canMakePayments } = await PurchasePlugin.canMakePayments();
    if (!canMakePayments) {
      console.warn("[IAP] This device cannot make payments (parental controls?).");
      if (onFail) onFail();
      return;
    }

    console.log("[IAP] Loading product:", IAP_NO_ADS_PRODUCT_ID);
    const { validProducts, invalidProductIds } = await PurchasePlugin.load({ productIds: [IAP_NO_ADS_PRODUCT_ID] });

    if (invalidProductIds.includes(IAP_NO_ADS_PRODUCT_ID) || validProducts.length === 0) {
      console.error("[IAP] Product is invalid or not available in StoreKit:", IAP_NO_ADS_PRODUCT_ID);
      console.warn("Make sure the Paid Apps Agreement is signed and the Bundle ID matches.");
      if (onFail) onFail();
      return;
    }

    console.log("[IAP] Starting purchase for:", IAP_NO_ADS_PRODUCT_ID);

    return new Promise<void>(async (resolve, reject) => {
      // Listen for the transaction update
      const listener = await PurchasePlugin.addListener("transactionUpdated", (data: any) => {
        console.log("[IAP] transactionUpdated event:", data);
        if (data.productId === IAP_NO_ADS_PRODUCT_ID) {
          if (data.state === "PaymentTransactionStatePurchased" || data.state === "PaymentTransactionStateRestored") {
            if (data.transactionIdentifier) {
              PurchasePlugin.finish({ transactionId: data.transactionIdentifier }).catch(e => console.warn(e));
            }
            listener.remove();
            console.log("[IAP] Purchase successful!");
            onSuccess();
            resolve();
          } else if (data.state === "PaymentTransactionStateFailed") {
            listener.remove();
            console.error("[IAP] Purchase failed/cancelled.");
            if (onFail) onFail();
            reject(new Error("Purchase failed"));
          }
        }
      });

      try {
        await PurchasePlugin.purchase({ productId: IAP_NO_ADS_PRODUCT_ID });
      } catch (err) {
        listener.remove();
        console.error("[IAP] purchase() call threw an error:", err);
        if (onFail) onFail();
        reject(err);
      }
    });

  } catch (err: unknown) {
    const msg = String(err);
    if (msg.toLowerCase().includes("cancel")) {
      console.log("[IAP] Purchase cancelled by user.");
    } else {
      console.error("[IAP] purchaseNoAds failed:", err);
    }
    if (onFail) onFail();
  }
}

/**
 * Restores previous purchases. Apple requires this button by App Store guidelines.
 * If the user previously bought "No Ads" on any device, this re-grants it.
 * Calls onSuccess() if the entitlement is found.
 * Calls onFail() if nothing was found to restore.
 */
export async function restorePurchases(
  onSuccess: () => void,
  onFail?: () => void
): Promise<void> {
  if (!isNative()) {
    await new Promise((r) => setTimeout(r, 800));
    onSuccess();
    return;
  }

  try {
    console.log("[IAP] Restoring purchases...");

    // Check existing purchases first (StoreKit receipt)
    const { purchases } = await PurchasePlugin.getPurchases();
    console.log("[IAP] Found purchases:", purchases);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const owned = (purchases as any[]).some(
      (p: { productId?: string }) => p.productId === IAP_NO_ADS_PRODUCT_ID
    );

    if (owned) {
      console.log("[IAP] Restore successful — product already owned.");
      onSuccess();
      return;
    }

    // Trigger Apple's native restore flow (prompts Apple ID login if needed)
    await PurchasePlugin.restore();

    // Re-check purchases after restore
    const { purchases: after } = await PurchasePlugin.getPurchases();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const restored = (after as any[]).some(
      (p: { productId?: string }) => p.productId === IAP_NO_ADS_PRODUCT_ID
    );

    if (restored) {
      console.log("[IAP] Restore confirmed.");
      onSuccess();
    } else {
      console.log("[IAP] Nothing to restore.");
      if (onFail) onFail();
    }
  } catch (err) {
    console.error("[IAP] restorePurchases failed:", err);
    if (onFail) onFail();
  }
}
