# Capacitor iOS/Android Monetization & Build Guide

이 문서는 모바일 하이브리드 앱(Capacitor) 개발 시 **AdMob 광고** 및 **인앱 결제(IAP)**를 적용하고 배포 빌드 시 발생하기 쉬운 문제들을 방지하기 위한 핵심 체크리스트와 개발 가이드라인입니다.

---

## 1. 빌드 및 동기화 프로세스 (가장 중요)

자바스크립트(JS) 코드를 수정한 후 바로 `npx cap sync`를 하면 변경 사항이 적용되지 않습니다. 반드시 아래 순서를 준수해야 합니다.

| 단계 | 명령어 | 설명 |
| :--- | :--- | :--- |
| **1단계** | `npm run build` | 최신 웹 리소스(React, Vue, TS 등)를 `dist/` 폴더에 빌드합니다. |
| **2단계** | `npx cap sync ios` (또는 `android`) | 빌드된 `dist/` 리소스를 native 플랫폼 폴더로 동기화합니다. |
| **3단계** | Xcode: `Shift + Cmd + K` (Clean Build) | Xcode에 남아있는 이전 빌드 캐시를 완전히 비웁니다. |
| **4단계** | Xcode: `Cmd + R` (Run) | 최종 시뮬레이터나 실기기에 앱을 올려 테스트합니다. |

> [!WARNING]
> 네이티브 코드가 있는 새 플러그인을 설치했을 경우, 반드시 `ios/App` 폴더(혹은 SPM 환경)에서 의존성 패키지를 갱신하거나 `npx cap update`를 먼저 실행해야 네이티브 코드가 정상 결합됩니다.

---

## 2. 인앱 결제 (IAP) 체크리스트

모바일 하이브리드 앱에서 Apple StoreKit / Google Play Billing 연동 시 아래 사항을 반드시 점검하십시오.

### ⚙️ 설정 단계 체크리스트
- [ ] **계약 상태 확인**: App Store Connect의 **비즈니스(Agreements)** 메뉴에서 **Paid Apps(유료 앱) 계약**이 서명 완료 및 활성화(`Active`) 상태인지 확인합니다.
- [ ] **Bundle ID 일치**: Xcode 프로젝트 of Bundle Identifier와 App Store Connect에 등록된 App ID가 완벽하게 일치해야 합니다.
- [ ] **인앱 상품 생성**: App Store Connect의 앱 내부에서 `com.domain.productid` 형식의 상품(비소모품/소모품/구독)을 생성하고 상태가 `Ready to Submit` 상태 이상인지 확인합니다.
- [ ] **기기 로그인**: 실기기 테스트 시 `설정 -> App Store -> 샌드박스 계정(Sandbox Account)`에 App Store Connect에서 생성한 테스터 계정으로 로그인되어 있어야 합니다.

### 💻 코드 작성 시 필수 패턴

#### ① 구매 시도 전 반드시 상품 정보 로드 (`load`)
StoreKit에 상품 ID를 사전에 로드하여 가격 정보와 유효성을 확인하지 않으면 결제 요청 시 `Product not loaded` 에러가 발생합니다.
```typescript
const { validProducts, invalidProductIds } = await PurchasePlugin.load({
  productIds: ['com.camogrid.noads']
});
```

#### ② 구매 결과 감지는 이벤트 리스너 사용 필수
`PurchasePlugin.purchase()` 함수는 결제창이 뜨고 닫힐 때 단순히 성공(resolve) 처리가 되므로, **실제 승인 여부는 네이티브 이벤트를 리스닝**해야 합니다.
```typescript
const listener = await PurchasePlugin.addListener("transactionUpdated", (data) => {
  if (data.productId === 'com.camogrid.noads') {
    if (data.state === "PaymentTransactionStatePurchased") {
      // 1. 서버 검증 혹은 로컬 검증 완료 후
      // 2. 반드시 트랜잭션 종료 처리 (중요!)
      PurchasePlugin.finish({ transactionId: data.transactionIdentifier });
      // 3. 사용자에게 아이템/기능 지급
      grantReward();
    } else if (data.state === "PaymentTransactionStateFailed") {
      // 결제 취소 또는 실패 처리
      handleFail();
    }
  }
});
```

#### ③ 트랜잭션 피니시 (`finish`) 필수 실행
결제가 승인된 후 `PurchasePlugin.finish()`를 호출해 주지 않으면 결제 대기열(queue)에 영구히 갇히게 되어, 다음 구매 시도가 먹통이 되거나 앱이 정지할 수 있습니다.

---

## 3. AdMob 광고 체크리스트

### ⚙️ 설정 단계 체크리스트
- [ ] **Info.plist / AndroidManifest.xml 설정**: AdMob 앱 ID가 네이티브 설정 파일에 정확히 기입되었는지 확인합니다.
- [ ] **SKAdNetwork 등록**: iOS 타겟팅의 경우 Info.plist에 구글이 제공하는 SKAdNetwork ID 목록이 누락되면 광고 수주율이 극도로 낮아지거나 차단됩니다.
- [ ] **테스트 모드 활성화**: 개발 중에는 무조건 `testDeviceIds`를 지정하거나 `useTestAds = true`를 사용하여 계정 정지(어뷰징 차단)를 예방합니다.

### 💻 코드 작성 시 필수 패턴

#### ① 광고 로딩과 재생 상태 동기화
광고가 재생되는 동안 사용자가 다른 UI를 누르지 못하도록 **로딩 상태 스피너**라고 제공하고, 광고가 닫힐 때 이를 해제해야 합니다.
```typescript
setIsPlayingAd(true); // 버튼 비활성화 및 스피너 표시
try {
  await AdMob.showRewardVideoAd();
} catch (e) {
  setIsPlayingAd(false); // 에러 발생 시 원래 상태로 복구
}
```

#### ② 리스너 등록 순서 주의
광고 재생 명령(`showRewardVideoAd`)을 호출하기 전에 리스너가 먼저 준비되어 있어야 유실되는 이벤트 없이 보상을 안전하게 지급할 수 있습니다.
```typescript
// 1. 리스너 먼저 준비
const rewardListener = await AdMob.addListener(
  RewardAdPluginEvents.Rewarded,
  (reward) => { grantReward(reward); }
);

// 2. 광고 띄우기
await AdMob.showRewardVideoAd();
```
