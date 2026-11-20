# TÀI LIỆU KỸ THUẬT & HƯỚNG DẪN TRIỂN KHAI FRONTEND (FE)

**Dự án:** Game Giáo Dục Phiêu Lưu Đa Nền Tảng (VD: *Rừng Chữ Cái*)  
**Tech Stack:** Nuxt 4 (SPA Mode), Vue 3 (Composition API + TypeScript), Pinia, TailwindCSS, **Phaser 3**, **Capacitor 6** (Android & iOS), Yarn Classic (`yarn`).

---

## 1. Kiến trúc Hybrid: Nuxt 4 + Phaser 3 + Capacitor

Thay vì vẽ toàn bộ chữ tiếng Việt và nút bấm trong Canvas (dễ mờ chữ, khó căn chỉnh trên các tỷ lệ màn hình điện thoại/máy tính bảng), hệ thống áp dụng **kiến trúc 2 lớp (Layered Architecture)**:

```text
+-------------------------------------------------------------------+
|  LỚP TRÊN: Vue 3 / Nuxt 4 (HTML/CSS Overlay - pointer-events)     |
|  - Popup câu hỏi (Chữ tiếng Việt sắc nét, nút A/B/C to rõ)        |
|  - Nút loa nghe giọng đọc, HUD (Xu, Sao, Túi đồ), Parent Gate     |
+-------------------------------▲-----------------------------------+
                                │ EventBus (mitt)
+-------------------------------▼-----------------------------------+
|  LỚP DƯỚI: Phaser 3 (WebGL / Canvas 2D Engine)                    |
|  - Bản đồ Rừng Chữ Cái (10–15 điểm mốc)                           |
|  - Nhân vật di chuyển, cây cầu bị gãy, animation ghép ván sửa cầu |
|  - Hiệu ứng hạt (particle), pháo hoa, âm thanh hiệu ứng (SFX)     |
+-------------------------------------------------------------------+
|  LỚP ĐÓNG GÓI: Capacitor 6 (Web -> Android .aab / iOS .ipa)       |
+-------------------------------------------------------------------+
```

---

## 2. Cấu trúc thư mục dự án

```text
edu-game-fe/
├── app/
│   ├── assets/css/
│   │   └── main.css                    # Tailwind + font chữ thân thiện trẻ em (VD: Nunito/Quicksand)
│   ├── components/
│   │   ├── game/
│   │   │   ├── PhaserCanvas.vue        # Mount & hủy Phaser Engine (Client-only)
│   │   │   ├── WorldHud.vue            # Thanh trạng thái (Xu, Sao, Túi đồ, Tắt/bật nhạc)
│   │   │   ├── ChallengeModal.vue      # Popup thử thách (Trắc nghiệm / Kéo thả / Nghe chọn)
│   │   │   ├── RewardModal.vue         # Popup mở rương nhận vật phẩm sau khi qua cầu
│   │   │   └── InventoryModal.vue      # Túi đồ & mặc trang bị cho nhân vật
│   │   └── parent/
│   │       └── ParentGateModal.vue     # Cổng phụ huynh (yêu cầu giải phép tính trước khi mở cài đặt)
│   ├── game/                           # Mã nguồn Phaser 3 độc lập hoàn toàn với Vue
│   │   ├── config.ts                   # Cấu hình Phaser (Scale Manager, Scenes, WebGL)
│   │   ├── eventBus.ts                 # Cầu nối giao tiếp 2 chiều Phaser <-> Vue
│   │   ├── types.ts                    # Interface dữ liệu truyền vào Scene
│   │   └── scenes/
│   │       ├── BootScene.ts            # Preload asset cơ bản (nhân vật, SFX chung)
│   │       ├── WorldMapScene.ts        # Bản đồ vùng đất (hiển thị 10-15 màn chơi)
│   │       └── StageScene.ts           # Cảnh chướng ngại vật (cầu gãy) & animation sửa cầu
│   ├── stores/
│   │   ├── auth.ts                     # Quản lý JWT Token (lưu qua Capacitor Preferences)
│   │   ├── game.ts                     # State vùng đất, màn chơi, túi đồ, hồ sơ bé
│   │   └── audio.ts                    # Quản lý âm lượng nhạc nền & giọng đọc
│   ├── services/
│   │   ├── api.ts                      # HTTP Client gắn JWT & X-Profile-ID
│   │   └── storage.ts                  # Adapter lưu trữ an toàn (Capacitor Preferences / localStorage)
│   └── pages/
│       ├── index.vue                   # Màn hình chào + Nút "Bắt đầu" (Unlock AudioContext)
│       ├── login.vue                   # Đăng nhập phụ huynh
│       ├── profiles.vue                # Chọn hoặc tạo hồ sơ bé
│       ├── worlds/index.vue            # Chọn vùng đất (Rừng Chữ Cái, Đảo Phép Tính...)
│       └── play/[worldId].vue          # Màn chơi chính (PhaserCanvas + Vue Overlays)
├── public/
│   └── assets/                         # Asset nhẹ tối thiểu để hiện màn hình loading ban đầu
├── android/                            # Native project sinh bởi Capacitor
├── ios/                                # Native project sinh bởi Capacitor
├── capacitor.config.ts
├── nuxt.config.ts
├── package.json
└── .env.example
```

---

## 3. Luồng tương tác mẫu: Màn "Cây cầu bị gãy" (Rừng Chữ Cái)

1. Bé chọn màn 1 trên `WorldMapScene` -> Phaser chuyển sang `StageScene`.
2. `StageScene` cho nhân vật đi bộ từ mép trái tới sát **cây cầu bị gãy** -> dừng lại, chạy animation suy nghĩ.
3. Phaser phát sự kiện qua EventBus:
   ```ts
   gameEventBus.emit('stage:reached-obstacle', { stageId, obstacleType: 'broken_bridge' })
   ```
4. Trang `play/[worldId].vue` nhận sự kiện -> gọi API `POST /api/v1/stages/:stageId/start` -> mở `ChallengeModal.vue` hiển thị câu hỏi *"Chọn từ viết đúng chính tả"* (A. Chân thành / B. Trân thành / C. Chân thàng) và tự động phát giọng đọc đề bài.
5. Bé chạm đáp án **A. Chân thành** -> Vue gọi `POST /api/v1/stages/:stageId/submit`.
6. **Trường hợp ĐÚNG:**
   * Vue đóng `ChallengeModal.vue`, lưu phần thưởng vào Store, phát sự kiện:
     ```ts
     gameEventBus.emit('challenge:answered-correct', { stageId })
     ```
   * `StageScene` nhận sự kiện -> phát SFX đóng gỗ -> chạy Tween ghép từng tấm ván sửa cây cầu -> nhân vật nhảy mừng và chạy qua bờ bên kia -> phát sự kiện `stage:completed-animation`.
   * Vue mở `RewardModal.vue` hiển thị vật phẩm thưởng + số sao + nút đi tiếp màn sau (hoặc hiệu ứng mở khóa vùng đất mới nếu là màn cuối).
7. **Trường hợp SAI:**
   * Giữ nguyên Modal, phát âm thanh khích lệ nhẹ nhàng (*"Gần đúng rồi, bé thử lại nhé!"*), rung nhẹ nút đáp án sai và hiện gợi ý (`hint`) từ Backend.

---

## 4. Cấu hình & Mã nguồn nền tảng

### 4.1. Cài đặt Dependencies (`package.json`)

```bash
yarn add phaser mitt pinia @pinia/nuxt @nuxtjs/tailwindcss
yarn add @capacitor/core @capacitor/app @capacitor/preferences @capacitor/screen-orientation @capacitor/status-bar
yarn add -D @capacitor/cli @capacitor/android @capacitor/ios
```

### 4.2. Cấu hình `nuxt.config.ts` (Bắt buộc tắt SSR cho Capacitor)

```ts
export default defineNuxtConfig({
  ssr: false, // Bắt buộc: Capacitor đóng gói static HTML/JS chạy trong WebView
  compatibilityDate: '2025-07-01',
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'https://api.yourdomain.com/api/v1',
      assetCdnUrl: process.env.NUXT_PUBLIC_ASSET_CDN_URL || 'https://assets.yourdomain.com',
    },
  },

  app: {
    head: {
      title: 'Rừng Chữ Cái - Phiêu Lưu Học Tập',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
        },
      ],
    },
  },
})
```

### 4.3. EventBus giao tiếp Phaser <-> Vue (`app/game/eventBus.ts`)

```ts
import mitt from 'mitt'

export type GameEvents = {
  // Phaser -> Vue
  'world:select-stage': { stageId: string }
  'stage:reached-obstacle': { stageId: string; obstacleType: string }
  'stage:completed-animation': { stageId: string }

  // Vue -> Phaser
  'game:load-world': { worldId: string; mapBgUrl: string; stages: any[] }
  'game:enter-stage': { stageId: string; obstacleType: string }
  'challenge:answered-correct': { stageId: string }
  'challenge:answered-wrong': { stageId: string }
  'audio:toggle-mute': { muted: boolean }
}

export const gameEventBus = mitt<GameEvents>()
```

### 4.4. Cấu hình Phaser 3 (`app/game/config.ts`)

Sử dụng độ phân giải thiết kế chuẩn `1280x720` (tỷ lệ 16:9 ngang) kết hợp `Phaser.Scale.ENVELOP` hoặc `Phaser.Scale.FIT` để hiển thị đẹp trên cả Desktop, iPad lẫn điện thoại tai thỏ.

```ts
import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { WorldMapScene } from './scenes/WorldMapScene'
import { StageScene } from './scenes/StageScene'

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#1b3b2b',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    audio: {
      disableWebAudio: false,
    },
    scene: [BootScene, WorldMapScene, StageScene],
  }
}
```

### 4.5. Component gắn Phaser vào Nuxt (`app/components/game/PhaserCanvas.vue`)

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import type Phaser from 'phaser'

const containerRef = ref<HTMLElement | null>(null)
let gameInstance: Phaser.Game | null = null

onMounted(async () => {
  // Dynamic import đảm bảo chỉ chạy trên Client
  const PhaserLib = await import('phaser')
  const { createGameConfig } = await import('~/game/config')

  if (containerRef.value) {
    gameInstance = new PhaserLib.default.Game(createGameConfig(containerRef.value))
  }
})

onBeforeUnmount(() => {
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
  }
})
</script>

<template>
  <div
    ref="containerRef"
    class="fixed inset-0 w-screen h-screen overflow-hidden touch-none select-none bg-[#1b3b2b]"
  />
</template>
```

### 4.6. Tải Asset từ Cloudflare R2 & Animation sửa cầu (`app/game/scenes/StageScene.ts`)

```ts
import Phaser from 'phaser'
import { gameEventBus } from '../eventBus'

export class StageScene extends Phaser.Scene {
  private stageId = ''
  private player!: Phaser.GameObjects.Sprite
  private brokenBridge!: Phaser.GameObjects.Image
  private fixedBridge!: Phaser.GameObjects.Image

  constructor() {
    super('StageScene')
  }

  init(data: { stageId: string; assetCdnUrl: string }) {
    this.stageId = data.stageId
    // Bắt buộc set CORS để WebGL vẽ được ảnh từ Cloudflare R2
    this.load.setCORS('anonymous')
    this.load.setBaseURL(data.assetCdnUrl)
  }

  preload() {
    this.load.image('bg-forest-river', '/worlds/rung-chu-cai/river_bg.webp')
    this.load.image('bridge-broken', '/obstacles/bridge_broken.webp')
    this.load.image('bridge-fixed', '/obstacles/bridge_fixed.webp')
    this.load.audio('sfx-hammer', '/audio/sfx_bridge_fix.mp3')
  }

  create() {
    this.add.image(640, 360, 'bg-forest-river').setDisplaySize(1280, 720)

    this.brokenBridge = this.add.image(640, 480, 'bridge-broken')
    this.fixedBridge = this.add.image(640, 480, 'bridge-fixed').setAlpha(0)

    // Nhân vật đi từ bờ trái đến sát cầu gãy
    this.player = this.add.sprite(150, 440, 'hero-idle')
    this.tweens.add({
      targets: this.player,
      x: 420,
      duration: 1400,
      ease: 'Power1',
      onComplete: () => {
        gameEventBus.emit('stage:reached-obstacle', {
          stageId: this.stageId,
          obstacleType: 'broken_bridge',
        })
      },
    })

    // Lắng nghe kết quả đúng từ Vue Modal
    gameEventBus.on('challenge:answered-correct', this.onAnswerCorrect)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameEventBus.off('challenge:answered-correct', this.onAnswerCorrect)
    })
  }

  private onAnswerCorrect = ({ stageId }: { stageId: string }) => {
    if (stageId !== this.stageId) return

    this.sound.play('sfx-hammer')

    // Hiệu ứng chuyển từ cầu gãy sang cầu lành
    this.tweens.add({
      targets: this.brokenBridge,
      alpha: 0,
      duration: 400,
    })

    this.tweens.add({
      targets: this.fixedBridge,
      alpha: 1,
      scaleFrom: 0.85,
      scale: 1,
      duration: 600,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Nhân vật băng qua cầu sang bờ bên kia
        this.tweens.add({
          targets: this.player,
          x: 1080,
          duration: 1600,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            gameEventBus.emit('stage:completed-animation', { stageId: this.stageId })
          },
        })
      },
    })
  }
}
```

### 4.7. Lưu trữ Token an toàn cho Web & Mobile (`app/services/storage.ts`)

Không dùng `localStorage` trực tiếp trên iOS vì hệ điều hành có thể tự động xóa dữ liệu WebView khi bộ nhớ máy thấp. Dùng `@capacitor/preferences` (tự động fallback sang `localStorage` khi chạy trên trình duyệt Web):

```ts
import { Preferences } from '@capacitor/preferences'

export const appStorage = {
  async set(key: string, value: string) {
    await Preferences.set({ key, value })
  },
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key })
    return value
  },
  async remove(key: string) {
    await Preferences.remove({ key })
  },
}
```

---

## 5. Hướng dẫn triển khai Bản Web

### 5.1. Biến môi trường (`.env`)

```env
NUXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
NUXT_PUBLIC_ASSET_CDN_URL=https://assets.yourdomain.com
```

### 5.2. Build bộ file tĩnh (Static Generation)

```bash
yarn install
yarn generate
```
Toàn bộ sản phẩm build nằm tại thư mục `.output/public`.

### 5.3. Triển khai Production (Chọn 1 trong 2 cách)

* **Cách 1: Cloudflare Pages (Khuyên dùng - miễn phí băng thông, đồng bộ với R2)**
  * Kết nối Git Repo trên Cloudflare Pages.
  * Build command: `yarn generate`
  * Build output directory: `.output/public`
  * Khai báo 2 biến môi trường `NUXT_PUBLIC_*` trong phần Settings -> Environment variables.

* **Cách 2: Self-host bằng Docker + Nginx**
  Tạo `Dockerfile` tại thư mục FE:
  ```dockerfile
  FROM node:22-alpine AS builder
  WORKDIR /app
  COPY package.json yarn.lock ./
  RUN yarn install --frozen-lockfile
  COPY . .
  RUN yarn generate

  FROM nginx:1.27-alpine
  COPY --from=builder /app/.output/public /usr/share/nginx/html
  RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / { try_files $uri $uri/ /index.html; }\n\
    location ~* \\.(js|css|webp|png|mp3|woff2)$ { expires 1y; add_header Cache-Control "public, immutable"; }\n\
  }\n' > /etc/nginx/conf.d/default.conf
  EXPOSE 80
  ```

---

## 6. Hướng dẫn đóng gói & triển khai Mobile App (Capacitor 6)

### 6.1. Cấu hình `capacitor.config.ts`

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'vn.yourdomain.rungchucai',
  appName: 'Rừng Chữ Cái',
  webDir: '.output/public',
  server: {
    androidScheme: 'https', // Bắt buộc dùng https để gọi API không bị lỗi Mixed Content
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
    },
  },
}

export default config
```

### 6.2. Khởi tạo Project Android & iOS (Chạy 1 lần đầu)

```bash
yarn generate
npx cap add android
npx cap add ios
```

### 6.3. Quy trình đồng bộ mỗi khi sửa code FE

```bash
yarn generate
npx cap sync
```

### 6.4. Cấu hình Native bắt buộc cho Game trẻ em

1. **Khóa màn hình ngang (Landscape):**
   * **Android:** Mở `android/app/src/main/AndroidManifest.xml`, thêm thuộc tính vào thẻ `<activity android:name=".MainActivity">`:
     ```xml
     android:screenOrientation="sensorLandscape"
     ```
   * **iOS:** Chạy `npx cap open ios` -> Chọn Target `App` -> Tab **General** -> **Deployment Info** -> Chỉ giữ tích **Landscape Left** và **Landscape Right**.

2. **Ẩn thanh trạng thái & Tôn trọng vùng Safe Area (Tai thỏ / Dynamic Island):**
   * Gọi `StatusBar.hide()` khi khởi động App trên thiết bị Native.
   * Các nút HUD (Xu, Túi đồ, Cài đặt) ở lớp Vue dùng padding an toàn: `pt-[env(safe-area-inset-top)] px-[env(safe-area-inset-left)]`.

3. **Xử lý Autoplay Audio trên iOS WebView & Safari:**
   * iOS chặn phát âm thanh nếu người dùng chưa có tương tác chạm. Luôn thiết kế màn hình mở đầu (`index.vue`) có nút **"Bắt đầu phiêu lưu"** to rõ; sự kiện click nút này đồng thời kích hoạt `AudioContext.resume()` cho cả giọng đọc và nhạc nền Phaser.

### 6.5. Xuất bản lên Store

* **Android (Google Play):**
  1. Mở `npx cap open android` trong Android Studio.
  2. Menu **Build -> Generate Signed App Bundle / APK -> Android App Bundle (`.aab`)**.
  3. Upload `.aab` lên Google Play Console và khai báo mục **Families Policy** (không SDK quảng cáo bên thứ 3, không thu thập dữ liệu định danh trẻ em).

* **iOS (Apple App Store - yêu cầu máy macOS + Xcode):**
  1. Mở `npx cap open ios` trong Xcode.
  2. Chọn Signing Team & Bundle Identifier khớp với `capacitor.config.ts`.
  3. Menu **Product -> Archive -> Distribute App** lên App Store Connect.
  4. Tuân thủ **Kids Category Guidelines**: mọi liên kết ra ngoài, cài đặt tài khoản phụ huynh hoặc thanh toán bắt buộc phải đi qua `ParentGateModal.vue` (VD: yêu cầu nhập kết quả phép nhân/cộng 2 chữ số).

---

## 7. Checklist tối ưu & kiểm thử Frontend

- [ ] **Tối ưu Asset:** Toàn bộ ảnh bản đồ/sprite chuyển sang **WebP** (dưới 300KB/map); âm thanh giọng đọc nén **MP3 64–96kbps mono**.
- [ ] **UX cho trẻ nhỏ:** Nút đáp án tối thiểu `56px x 56px`, khoảng cách giữa các nút đủ rộng để bé bấm không bị nhầm, có nút loa nghe lại đề bài không giới hạn.
- [ ] **WebGL CORS:** Test tải ảnh từ Cloudflare R2 trên cả Chrome, Safari iOS và Android WebView đảm bảo không bị lỗi màn hình đen hoặc texture lỗi.
- [ ] **Memory Leak:** Chuyển qua lại giữa các vùng đất nhiều lần đảm bảo `PhaserCanvas.vue` gọi `gameInstance.destroy(true)` và `gameEventBus.off(...)` sạch sẽ.