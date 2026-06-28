/**
 * adBridge.ts
 * ────────────────────────────────────────────────────────────
 * Monetization bridge layer.
 *
 * App ID    : ca-app-pub-5036571902202474~6522763042  (Camo Grid)
 * Ad Unit ID: ca-app-pub-5036571902202474/5237601534  (Rewarded)
 * ────────────────────────────────────────────────────────────
 */

import { Purchases, PRODUCT_CATEGORY } from '@revenuecat/purchases-capacitor';

// ─── AdMob Configuration Constants ───────────────────────────────────────────
export const ADMOB_APP_ID     = "ca-app-pub-5036571902202474~6522763042";
export const ADMOB_REWARDED_ID = "ca-app-pub-5036571902202474/5237601534";

// Test ad unit IDs (use during development to avoid policy violations)
export const ADMOB_REWARDED_TEST_ID = "ca-app-pub-3940256099942544/5224354917";

// ─── RevenueCat Configuration Constants ──────────────────────────────────────
export const REVENUECAT_APPLE_KEY = "appl_your_revenuecat_api_key"; // Replace with your RevenueCat Apple API Key
export const REVENUECAT_ENTITLEMENT_ID = "no_ads"; // Entitlement ID configured in RevenueCat dashboard
export const REVENUECAT_PRODUCT_ID = "com.yourdomain.camogrid.noads"; // Product ID in App Store Connect

// Use Vite's production environment flag to distinguish development vs production build
const IS_PRODUCTION = import.meta.env.PROD;

const ACTIVE_REWARDED_ID = IS_PRODUCTION ? ADMOB_REWARDED_ID : ADMOB_REWARDED_TEST_ID;

// ─── Native (Capacitor) detection ────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isNative = (): boolean => !!(window as any)?.Capacitor?.isNativePlatform?.();

// ─── Capacitor AdMob type shim (avoids hard dependency on the npm package) ───
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

// ─── Initialize AdMob (call once, early in app lifecycle) ────────────────────
let adMobInitialized = false;

export async function initAdMob(): Promise<void> {
  if (!isNative()) return;
  if (adMobInitialized) return;

  const AdMob = getAdMob();
  if (!AdMob) return;

  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true,  // iOS ATT prompt
      initializeForTesting: !IS_PRODUCTION,
    });
    adMobInitialized = true;
    console.log("[AdMob] Initialized. Production mode:", IS_PRODUCTION);
    // Pre-load the first rewarded ad so it's ready when needed
    await _preloadRewardedAd();
  } catch (err) {
    console.error("[AdMob] Initialization failed:", err);
  }
}

// ─── Pre-load Rewarded Ad ─────────────────────────────────────────────────────
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

// ─── Show Rewarded Ad (Native) ────────────────────────────────────────────────
async function _showRewardedAdNative(): Promise<void> {
  const AdMob = getAdMob();
  if (!AdMob) throw new Error("AdMob plugin not available");

  // Ensure ad is loaded
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

        // ── Reward granted (user watched enough of the ad) ──
    // Try all known event name variants across plugin versions
    const onRewarded = () => {
      console.log("[AdMob] Reward earned!");
      rewardEarned = true;
      rewardedAdReady = false;
      _preloadRewardedAd();
    };

    // @capacitor-community/admob fires one of these depending on version:
    listeners.push(AdMob.addListener("onRewardedVideoAdReward",   onRewarded)); // v5/v6/v8
    listeners.push(AdMob.addListener("onRewardedVideoAdRewarded", onRewarded));
    listeners.push(AdMob.addListener("onRewardVideoAdReward",     onRewarded)); // v4

    // ── Ad closed (always fires when ad dismisses, rewarded or not) ──
    const onClosed = () => {
      console.log("[AdMob] Ad closed. Reward earned:", rewardEarned);
      rewardedAdReady = false;
      _preloadRewardedAd();
      cleanup();
      if (rewardEarned) {
        resolve(); // ← reward was granted before close
      } else {
        reject(new Error("Ad closed without reward")); // ← user skipped
      }
    };

    listeners.push(AdMob.addListener("onRewardedVideoAdDismissed", onClosed)); // v5/v6/v8
    listeners.push(AdMob.addListener("onRewardedVideoAdClosed",    onClosed)); // fallback
    listeners.push(AdMob.addListener("onRewardVideoAdClosed",     onClosed)); // fallback

    // ── Load/show failure ──
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

    // Show the ad
    AdMob.showRewardVideoAd().catch((err: unknown) => {
      cleanup();
      reject(new Error(`showRewardVideoAd error: ${err}`));
    });
  });
}

// ─── Show Rewarded Ad (Web / Dev fallback) ───────────────────────────────────
async function _showRewardedAdWeb(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Simulates user watching a 3-second ad in browser / Vercel preview
    const timer = setTimeout(resolve, 3000);
    setTimeout(() => {
      clearTimeout(timer);
      reject(new Error("Ad load timeout"));
    }, 15000);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Shows a rewarded ad.
 * Automatically selects native AdMob or web simulation based on environment.
 * Calls onSuccess() if the user earns the reward.
 * Calls onFail() if something went wrong or no reward was granted.
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
    console.error("[AdBridge] Ad failed to show:", err);
    if (onFail) onFail();
  }
}

// ─── Initialize RevenueCat (call once early in app lifecycle) ──────────────────
let purchasesInitialized = false;

export async function initPurchases(): Promise<void> {
  if (!isNative()) return;
  if (purchasesInitialized) return;

  try {
    await Purchases.configure({ apiKey: REVENUECAT_APPLE_KEY });
    purchasesInitialized = true;
    console.log("[RevenueCat] Initialized successfully.");
  } catch (err) {
    console.error("[RevenueCat] Initialization failed:", err);
  }
}

/**
 * Executes IAP via RevenueCat (with Web mock fallback).
 */
export async function purchaseNoAds(onSuccess: () => void, onFail?: () => void): Promise<void> {
  try {
    if (isNative()) {
      console.log("[RevenueCat] Fetching product details for:", REVENUECAT_PRODUCT_ID);
      const { products } = await Purchases.getProducts({
        productIdentifiers: [REVENUECAT_PRODUCT_ID],
        type: PRODUCT_CATEGORY.NON_SUBSCRIPTION
      });
      
      if (!products || products.length === 0) {
        throw new Error(`Product ${REVENUECAT_PRODUCT_ID} could not be fetched from store.`);
      }

      console.log("[RevenueCat] Triggering purchase for product:", REVENUECAT_PRODUCT_ID);
      const { customerInfo } = await Purchases.purchaseStoreProduct({ product: products[0] });
      
      // Verify if the active entitlements list includes our entitlement ID
      if (customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID] !== undefined) {
        console.log("[RevenueCat] Purchase successful!");
        onSuccess();
      } else {
        console.warn("[RevenueCat] Purchase completed, but entitlement was not active.");
        if (onFail) onFail();
      }
    } else {
      // Web mock — auto-succeed after brief delay
      await new Promise((r) => setTimeout(r, 800));
      onSuccess();
    }
  } catch (err) {
    console.error("[RevenueCat] Purchase failed:", err);
    if (onFail) onFail();
  }
}

/**
 * Restores Purchases via RevenueCat (with Web mock fallback).
 * Apple requires a "Restore Purchases" button for non-consumable items like No Ads.
 */
export async function restorePurchases(onSuccess: () => void, onFail?: () => void): Promise<void> {
  try {
    if (isNative()) {
      console.log("[RevenueCat] Triggering restore purchases...");
      const { customerInfo } = await Purchases.restorePurchases();
      
      if (customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID] !== undefined) {
        console.log("[RevenueCat] Restore successful!");
        onSuccess();
      } else {
        console.warn("[RevenueCat] Restore completed, but entitlement was not found.");
        if (onFail) onFail();
      }
    } else {
      // Web mock — auto-succeed after brief delay
      await new Promise((r) => setTimeout(r, 800));
      onSuccess();
    }
  } catch (err) {
    console.error("[RevenueCat] Restore failed:", err);
    if (onFail) onFail();
  }
}
