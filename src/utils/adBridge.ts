/**
 * adBridge.ts
 * ────────────────────────────────────────────────────────────
 * Monetization bridge layer.
 *
 * App ID    : ca-app-pub-5036571902202474~6522763042  (Camo Grid)
 * Ad Unit ID: ca-app-pub-5036571902202474/5237601534  (Rewarded)
 *
 * Environment detection:
 *   - Native (Capacitor) → Uses @capacitor-community/admob plugin
 *   - Web browser / dev  → Simulates ad with a 3 second wait
 * ────────────────────────────────────────────────────────────
 */

// ─── AdMob Configuration Constants ───────────────────────────────────────────
export const ADMOB_APP_ID     = "ca-app-pub-5036571902202474~6522763042";
export const ADMOB_REWARDED_ID = "ca-app-pub-5036571902202474/5237601534";

// Test ad unit IDs (use during development to avoid policy violations)
export const ADMOB_REWARDED_TEST_ID = "ca-app-pub-3940256099942544/5224354917";

// Set to true only when building a real release binary
const IS_PRODUCTION = typeof window !== "undefined" &&
  !window.location.hostname.includes("localhost") &&
  !window.location.hostname.includes("127.0.0.1") &&
  !window.location.hostname.includes("vercel.app");

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
    // Listen for reward event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AdMob.addListener("onRewardedVideoAdRewarded", () => {
      rewardedAdReady = false;
      // Pre-load next ad in background
      _preloadRewardedAd();
      resolve();
    });

    // Listen for close without reward
    AdMob.addListener("onRewardedVideoAdClosed", () => {
      rewardedAdReady = false;
      _preloadRewardedAd();
      // If reward event did not fire, this will still resolve —
      // but caller should check via the onSuccess/onFail callbacks.
    });

    // Listen for load failure
    AdMob.addListener("onRewardedVideoAdFailedToLoad", (error: unknown) => {
      rewardedAdReady = false;
      reject(new Error(`Rewarded ad failed to load: ${JSON.stringify(error)}`));
    });

    // Show the ad
    AdMob.showRewardVideoAd().catch((err: unknown) => {
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

/**
 * Simulates an IAP (In-App Purchase).
 * In native build: hook up to RevenueCat / StoreKit / Google Play Billing.
 */
export async function purchaseNoAds(onSuccess: () => void, onFail?: () => void): Promise<void> {
  try {
    // Web mock — auto-succeed after brief delay
    // TODO: Replace with RevenueCat or native IAP SDK call for production build
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
    // TODO: Replace with RevenueCat or native StoreKit restore call for production build
    onSuccess();
  } catch (err) {
    console.error("Restore failed:", err);
    if (onFail) onFail();
  }
}
