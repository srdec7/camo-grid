# Camo Grid - App Store Launch & Metadata Guide

This document contains the final checklist for launching **Camo Grid** on the Apple App Store, along with the English and Korean app store metadata.

---

## 📋 Phase 1: App Store Launch Checklist

### 1. Technical & Native Wrapping (Capacitor Setup)
Since this project is currently a React/Vite-based web application (`camo-grid-web`), you need to wrap it into a native iOS project using Capacitor.

- [ ] **Install Capacitor Core & CLI:**
  ```bash
  npm install @capacitor/core @capacitor/cli
  npx cap init
  ```
  *(Fill in the app name: `Camo Grid` and bundle ID: e.g., `com.yourdomain.camogrid`)*
- [ ] **Add the iOS Platform:**
  ```bash
  npm install @capacitor/ios
  npx cap add ios
  ```
- [ ] **Implement AdMob Native Plugin:**
  Ensure the ad bridge connects to a native plugin (e.g., `@capacitor-community/admob`) instead of standard web-only script elements.
- [ ] **Configure App Tracking Transparency (ATT):**
  iOS requires user permission to track data for personalized ads. Add the target configuration and tracking description in your iOS project Info.plist.

### 2. Design Assets Preparation
Generate and configure all required visual assets.

- [ ] **App Icon:**
  Generate a `1024 x 1024 px` PNG file (no alpha/transparency allowed).
- [ ] **Launch Screen (Splash Screen):**
  Create a `2732 x 2732 px` square image with the game logo centered inside a `1024 x 1024 px` safe area. Use `@capacitor/assets` to automatically slice and resize it for all iOS screen ratios.
- [ ] **App Store Screenshots:** Prepare 3-5 screenshots for:
  - **6.5-inch iPhones** (iPhone 12/13/14/15/16 Pro Max, etc.) - `1284 x 2778 px`
  - **5.5-inch iPhones** (iPhone 8 Plus, etc.) - `1242 x 2208 px`

### 3. Apple Developer Setup
- [ ] **Register Developer Account:** Ensure you are enrolled in the **Apple Developer Program** ($99/year).
- [ ] **Create App Store Connect Listing:** Register a new app listing, choosing iOS and configuring your Bundle ID.
- [ ] **Generate Certificates & Profiles:** Set up iOS Distribution Certificates and Provisioning Profiles in the Apple Developer portal.

### 4. App Store Connect Metadata & Legal
- [ ] **App Metadata:** Set up Title, Subtitle, Category, Keywords, and Descriptions (see the next section).
- [ ] **Privacy Policy URL:** Host a simple Privacy Policy website (required by Apple, especially when showing ads). You can host this easily on GitHub Pages or Vercel.
- [ ] **Age Rating:** Complete the age rating questionnaire.

### 5. Build, Test, and Submit
- [ ] **Build Production Web Bundle:**
  ```bash
  npm run build
  npx cap sync ios
  ```
- [ ] **Archive & Upload via Xcode:** Open Xcode (`npx cap open ios`), select "Any iOS Device (arm64)", archive the app (`Product > Archive`), and upload it to App Store Connect.
- [ ] **TestFlight Testing:** Upload to TestFlight and test the game on a real device to ensure touch controls and ads work correctly.
- [ ] **Submit for App Review:** Link your build in App Store Connect and submit for review.

---

## 🌎 App Store Metadata (English) - Global Target

### App Title (Under 30 characters)
`Camo Grid: Pattern Puzzle`

### Subtitle / Short Description (Under 170 characters)
`Spot the defect and restore the digital camouflage! Camo Grid is a visual puzzle game. Cycle tile colors and match the target pattern within limited moves.`

### Full Description (Under 4,000 characters)
```text
Spot the defect, blend the grid, and master the art of digital camouflage!

Do you have a sharp eye for detail? Can you spot the tiniest mismatch in a sea of pixel patterns? Welcome to Camo Grid, a stylish, satisfying visual puzzle game designed to test your spatial intelligence and pattern recognition skills. 

Your mission is simple yet challenging: scan the grid, find the single scrambled zone of camouflage, and restore the tiles to blend seamlessly back into their surroundings.

🎮 How to Play
1. Analyze the Target: Look closely at the mini target patch displayed at the top of the screen.
2. Spot the Defect: Scan the large board to locate the mismatched "Defect Zone" where the pattern is disrupted.
3. Cycle and Match: Tap the tiles within the zone to cycle through four digital camo colors. 
4. Complete the Camouflage: Match the defect zone with the target template perfectly. Complete it within the move limit to clear the level and achieve perfection!

✨ Key Features
- Aesthetic Digital Camo Art: Immerse yourself in clean, beautiful pixel-art digital camouflage designs that are both visually satisfying and challenging.
- Infinite Levels of Variety: Powered by a seed-based procedural level generator, you will experience unique, fresh patterns every single time you play. No two games are ever the same!
- Three Immersive Environments: 
  * Jungle: Lush greens and earth tones that mimic dense forest environments.
  * Desert: Warm sand and clay shades representing arid tactical layouts.
  * Arctic: Cool whites and icy blues capture the frozen wilderness.
- Progressive Difficulty: Start with relaxed, easy-to-solve grids, and advance all the way to massive, brain-bending "Master" grids that will push your cognitive limits.
- Smooth UI & Tactile Feedback: Enjoy a minimalist interface, smooth transitions, and satisfying sound effects designed to keep you focused and relaxed.

🧐 Who is this game for?
- Puzzle Enthusiasts: If you love Sudoku, Nonograms, or Rubik's cubes, you will love the logical, color-cycling challenge of Camo Grid.
- Brain Training Seekers: A perfect daily exercise to improve visual acuity, attention to detail, and short-term memory.
- Casual Gamers: Ideal for quick pick-up-and-play sessions during your daily commute or relaxing downtime.
- Aesthetic Lovers: Anyone who appreciates clean pixel art and tactical camouflage design.

Can you achieve a perfect clear on every grid? 

Download Camo Grid today, sharpen your focus, and start blending!
```

---

## 🇰🇷 App Store Metadata (Korean) - Domestic Target

### 앱 이름 (30자 이내)
`카모 그리드 - 디지털 위장 퍼즐`

### 간단한 설명 (170자 이내)
`잘못된 위장 패턴을 찾아내어 완벽한 카무플라주를 완성하세요! 카모 그리드는 미세한 색상 차이를 분석하고 격자를 맞추는 고도의 관찰력 퍼즐 게임입니다. 정글, 사막, 남극 테마 속에 숨겨진 패턴 오류를 제한된 터치 횟수 내에 완벽히 수정해 보세요. 지금 당신의 집중력과 인지 한계에 도전해 보세요!`

### 상세 설명 (4,000자 이내)
```text
숨겨진 틈을 찾아 완벽한 위장을 완성하세요!

눈앞에 펼쳐진 디지털 위장(Camouflage) 패턴 속, 아주 미세하고 어색하게 뒤틀린 오류를 발견하셨나요? 
《카모 그리드(Camo Grid)》는 당신의 시각적 인지 능력과 논리적 사고력을 자극하는 새롭고 감각적인 디지털 격자 퍼즐 게임입니다. 

수많은 타일 속에 숨겨진 단 하나의 결함 구역을 찾아내고, 주변 환경과 완벽하게 동화되도록 패턴을 올바르게 복원해 보세요!

🎮 어떻게 플레이하나요?
1. 타겟 패턴 확인하기: 화면 상단에 제시되는 완벽한 패턴(Target Patch)을 유심히 살펴보세요.
2. 결함 구역 찾기: 전체 그리드 화면을 훑어보며, 타겟 패턴과 일치하지 않는 '위장 불량 구역(Defect Zone)'을 찾아내야 합니다.
3. 색상 변경하여 숨기기: 결함 구역 내의 타일을 탭하여 색상을 변경하세요. 타일을 누를 때마다 색상이 순환하며 바뀝니다.
4. 위장 완료: 제한된 터치 횟수(Move Limit) 안에 모든 타일의 색상을 타겟 패턴과 완벽하게 일치시켜 오류를 완전히 숨기면 스테이지가 클리어됩니다!

✨ 게임의 핵심 특징
- 독특한 디지털 카무플라주 비주얼: 실제 군복 및 장비에 사용되는 감각적인 디지털 픽셀 카모 아트를 테마로 하여, 단순한 퍼즐을 넘어 시각적인 만족감을 선사합니다.
- 무한에 가까운 다양성: 시드 기반의 무작위 레벨 생성 시스템을 도입하여 매 플레이마다 새롭고 신선한 패턴을 마주하게 됩니다. 질릴 틈 없는 도전을 경험하세요!
- 다채로운 3대 환경 테마: 
  * jungle (정글): 짙은 녹색과 갈색이 어우러진 울창한 숲 속의 위장
  * desert (사막): 모래와 황토색으로 뒤덮인 뜨거운 황무지의 위장
  * arctic (남극): 차가운 흰색과 푸른빛이 감도는 만년설의 위장
- 부드러운 난이도 설계: 쉬운 입문자 코스(Easy)부터, 복잡한 대형 그리드가 주어지는 숙련자 코스(Master)까지 준비되어 있어 남녀노소 누구나 자신의 페이스대로 즐길 수 있습니다.
- 깔끔하고 미니멀한 UI & 사운드: 몰입을 방해하지 않는 깔끔한 화면 구성과 타일을 터치할 때마다 흘러나오는 기분 좋은 햅틱 피드백 및 사운드로 손맛을 극대화했습니다.

🧐 이런 분들께 추천합니다!
- 색감이나 미세한 패턴 차이를 기가 막히게 잘 찾아내는 '절대 시각'의 소유자
- 복잡하고 머리 아픈 게임 대신, 짧고 굵게 집중하여 두뇌를 리프레시하고 싶으신 분
- 규칙성 있는 패턴을 올바르게 맞춰나갈 때 카타르시스를 느끼는 퍼즐 매니아
- 픽셀 아트나 카무플라주 특유의 세련된 밀리터리 감성을 사랑하시는 분

단순히 타일을 누르는 것을 넘어, 주변 환경과 완벽히 동화시키는 아름다운 규칙을 만드는 여정.
지금 바로 《카모 그리드》를 다운로드하고, 당신의 한계에 도전해 퍼펙트 클리어를 달성해 보세요!
```
