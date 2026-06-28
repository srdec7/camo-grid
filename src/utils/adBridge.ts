/**
 * adBridge.ts
 * ────────────────────────────────────────────────────────────
 * Monetization bridge layer.
 *
 * AdMob:
 *   App ID    : ca-app-pub-5036571902202474~6522763042  (Camo Grid)
 *   Ad Unit ID: ca-app-pub-5036571902202474/5237601534  (Rewarded)
 *
 * In-App Purchases (cordova-plugin-purchase / CdvPurchase):
 *   Product ID: com.camogrid.noads  ← must match your App Store Connect product ID exactly
 *
 * Environment detection:
 *   - Native (Capacitor) → Uses @capacitor-community/admob + CdvPurchase (StoreKit)
 *   - Web browser / dev  → Simulates everything with short delays
 * ────────────────────────────────────────────────────────────
 */

// ─── AdMob Configuration Constants ───────────────────────────────────────────
export const ADMOB_APP_ID      = "ca-app-pub-5036571902202474~6522763042";
export const ADMOB_REWARDED_ID = "ca-app-pub-5036571902202474/5237601534";

// Google's official test ad IDs (used in dev/debug builds to avoid policy violations)
export const ADMOB_REWARDED_TEST_ID = "ca-app-pub-3940256099942544/5224354917";

// Use Vite's build-time flag: true when you run `npm run build`, false during `npm run dev`
const IS_PRODUCTION = import.meta.env.PROD;

const ACTIVE_REWARDED_ID = IS_PRODUCTION ? ADMOB_REWARDED_ID : ADMOB_REWARDED_TEST_ID;

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

// ─── CdvPurchase (cordova-plugin-purchase) type shim ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CdvStore = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCdvStore(): CdvStore | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (window as any).CdvPurchase?.store;
    return store ?? null;
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
      initializeForTesting: !IS_PRODUCTION,
    });
    adMobInitialized = true;
    console.log("[AdMob] Initialized. Production mode:", IS_PRODUCTION);
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
      isTesting: !IS_PRODUCTION,
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
// ── In-App Purchases (cordova-plugin-purchase / CdvPurchase) ───────────────────
// ═══════════════════════════════════════════════════════════════════════════════

let iapInitialized = false;

/**
 * Initializes the IAP store with the "No Ads" non-consumable product.
 * Call this once on app mount alongside initAdMob().
 */
export async function initIAP(): Promise<void> {
  if (!isNative()) return;
  if (iapInitialized) return;

  const store = getCdvStore();
  if (!store) {
    console.warn("[IAP] CdvPurchase.store not available (plugin may not be installed).");
    return;
  }

  try {
    // Register the "No Ads" non-consumable product
    store.register([
      {
        id: IAP_NO_ADS_PRODUCT_ID,
        type: store.NON_CONSUMABLE,  // One-time purchase, Apple keeps track of it
        platform: store.Platform?.APPLE_APPSTORE ?? "ios-appstore",
      },
    ]);

    // Handle successful purchases (new purchase OR restore)
    store.when().approved((transaction: CdvStore) => {
      // Apple requires you call finish() so the transaction completes in StoreKit
      transaction.finish();
      console.log("[IAP] Transaction approved and finished:", transaction);
    });

    // Initialize and fetch product info from the App Store
    await store.initialize([
      store.Platform?.APPLE_APPSTORE ?? "ios-appstore",
    ]);

    iapInitialized = true;
    console.log("[IAP] Store initialized. Products:", store.products);
  } catch (err) {
    console.error("[IAP] Initialization failed:", err);
  }
}

/**
 * Triggers a native "No Ads" In-App Purchase using Apple StoreKit.
 * Calls onSuccess() if the purchase completes (new or already owned).
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

  const store = getCdvStore();
  if (!store) {
    console.error("[IAP] Store not available.");
    if (onFail) onFail();
    return;
  }

  try {
    const product = store.get(IAP_NO_ADS_PRODUCT_ID);
    if (!product) {
      console.error("[IAP] Product not found:", IAP_NO_ADS_PRODUCT_ID);
      if (onFail) onFail();
      return;
    }

    // Present the native Apple payment sheet
    const offer = product.getOffer();
    if (!offer) {
      console.error("[IAP] No offer available for product:", IAP_NO_ADS_PRODUCT_ID);
      if (onFail) onFail();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      // Listen specifically for this product's lifecycle
      store.when()
        .productId(IAP_NO_ADS_PRODUCT_ID)
        .approved(() => {
          console.log("[IAP] Purchase approved!");
          resolve();
          onSuccess();
        })
        .cancelled(() => {
          console.log("[IAP] Purchase cancelled by user.");
          reject(new Error("Purchase cancelled"));
          if (onFail) onFail();
        });

      // Open the native purchase sheet
      offer.order().catch((err: unknown) => {
        reject(new Error(`order() failed: ${err}`));
        if (onFail) onFail();
      });
    });

  } catch (err) {
    console.error("[IAP] purchaseNoAds failed:", err);
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

  const store = getCdvStore();
  if (!store) {
    console.error("[IAP] Store not available.");
    if (onFail) onFail();
    return;
  }

  try {
    console.log("[IAP] Restoring purchases...");

    let restored = false;

    // Watch for any restored approved transaction for our product
    store.when()
      .productId(IAP_NO_ADS_PRODUCT_ID)
      .approved((transaction: CdvStore) => {
        transaction.finish();
        if (!restored) {
          restored = true;
          console.log("[IAP] Restore successful!");
          onSuccess();
        }
      });

    // Trigger the native restore flow (shows Apple's login prompt if needed)
    await store.restorePurchases();

    // If no restore event fired within 4s, assume nothing to restore
    await new Promise<void>((resolve) => setTimeout(resolve, 4000));

    if (!restored) {
      console.log("[IAP] Nothing to restore.");
      if (onFail) onFail();
    }
  } catch (err) {
    console.error("[IAP] restorePurchases failed:", err);
    if (onFail) onFail();
  }
}
