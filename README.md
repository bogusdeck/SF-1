# LF Online (Little Fighter Online)

A modern, cross-platform 2.5D beat-'em-up fighting game inspired by *Little Fighter 2*, built entirely with **TypeScript in strict mode**. Playable online multiplayer in modern web browsers and natively on **Android** and **iOS** devices from **one single codebase**.

---

## 🏗️ Architecture & Tech Stack

```
                              ┌───────────────────────────────────────────────┐
                              │               @lf-online/shared               │
                              │   Deterministic 30 TPS Physics & Simulation   │
                              │   Pure TypeScript, Zero DOM, Zero Phaser      │
                              └──────────────────────┬────────────────────────┘
                                                     │
                         ┌───────────────────────────┴───────────────────────────┐
                         ▼                                                       ▼
        ┌───────────────────────────────────┐                 ┌─────────────────────────────────────┐
        │        @lf-online/client          │                 │         @lf-online/server           │
        │ Phaser 3 + Vite + Colyseus SDK    │                 │ Node.js + Colyseus 0.18             │
        │ Responsive Scaling, Touch Overlay │                 │ Authoritative Room Matchmaker       │
        │ Client-side Prediction / Recon    │                 │ 30 TPS State Broadcasting           │
        └─────────────────┬─────────────────┘                 └──────────────────┬──────────────────┘
                          │                                                      │
              ┌───────────┴───────────┐                              ┌───────────┴───────────┐
              ▼                       ▼                              ▼                       ▼
      ┌──────────────┐        ┌──────────────┐               ┌───────────────┐       ┌───────────────┐
      │   Capacitor  │        │ Static Web   │               │ Docker Image  │       │ Fly.io/Render │
      │ Android / iOS│        │Vercel/Netlify│               │ (Multi-stage) │       │ (wss:// TLS)  │
      └──────────────┘        └──────────────┘               └───────────────┘       └───────────────┘
```

- **Monorepo**: `pnpm` workspaces, TypeScript strict mode across all packages.
- **`packages/shared`**: Fully deterministic game simulation running at fixed 30 TPS. No `Math.random` (seeded RNG) or `Date.now` inside simulation. Colyseus Schema definitions for network synchronization.
- **`packages/client`**: Phaser 3 with Vite. Renders the simulation, handles input buffers, audio, responsive scaling (`Phaser.Scale.FIT`, `pixelArt: true`), multi-touch virtual joystick and action buttons.
- **`packages/server`**: Node.js authoritative game server powered by Colyseus 0.18. Room codes (`5-char` alphanumeric), up to 4 players per room, synchronized character select, ping telemetry, and 30-second disconnect reconnection tolerance.
- **Mobile Native**: Capacitor wrapping `packages/client/dist` into native Android (Gradle) and iOS (Xcode) projects with sensor landscape orientation lock.
- **Testing**: Vitest for deterministic physics, 2.5D hitboxes/hurtboxes, combat states, and multiplayer room lifecycle.

---

## 📁 Workspace Structure

```
├── packages/
│   ├── shared/                # Deterministic simulation, character data & Colyseus schemas
│   │   ├── src/types/         # Frame, character, hitbox, and simulation interfaces
│   │   ├── src/schema/        # NetworkRoomState, NetworkPlayerState, NetworkProjectileState
│   │   ├── src/simulation/    # GameSimulation (30 TPS fixed-timestep physics & combat loop)
│   │   ├── src/data/          # Canonical davis.json and dennis.json frame definitions
│   │   └── src/__tests__/     # Vitest suites for character frames, physics, and combat
│   ├── client/                # Phaser 3 + Vite frontend application
│   │   ├── public/assets/     # Atlases, sounds, and stage backgrounds
│   │   ├── src/scenes/        # LobbyScene, GameScene (Local 2P), OnlineGameScene, DebugScene
│   │   ├── src/ui/            # TouchControls (virtual joystick, multi-touch buttons, FS)
│   │   ├── src/network/       # NetworkManager (Colyseus SDK connection and ping telemetry)
│   │   └── src/config/        # gameConfig.ts (FIT scaling) & keyboardConfig.ts (configurable keys)
│   └── server/                # Authoritative Colyseus game server
│       ├── src/rooms/         # LFRoom.ts (room matchmaking, inputs, 30 TPS simulation broadcast)
│       └── src/__tests__/     # Multiplayer room integration tests
├── android/                   # Capacitor native Android project
├── ios/                       # Capacitor native iOS project
├── resources/                 # 1024x1024 app icon and 2732x2732 splash screen templates
├── scripts/
│   ├── build-assets.ts        # Color-key transparency & TexturePacker atlas generator
│   ├── generate-mobile-assets.ts # High-res mobile icon & splash generator
│   └── generate-native-icons.ts  # Android mipmap & iOS AppIcon generator
├── Dockerfile                 # Multi-stage production container build for game server
├── fly.toml                   # Fly.io deployment blueprint
├── render.yaml                # Render web service deployment blueprint
└── capacitor.config.ts        # Capacitor native app configuration
```

---

## 🚀 Quickstart & Development

### Prerequisites
- **Node.js** >= 20.x
- **pnpm** >= 10.x
- **Python 3** with `uv` (optional, for asset utilities)
- **Android Studio** (for Android builds) or **Xcode** on macOS (for iOS builds)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/lf-online.git
cd lf-online
pnpm install
```

### 2. Build Assets Pipeline
Generates transparent sprite sheets and TexturePacker JSON atlases for Davis, Dennis, and stages:
```bash
pnpm build:assets
```

### 3. Start Local Game Server
Runs the authoritative Colyseus server on `http://localhost:2567` (WebSocket: `ws://localhost:2567`):
```bash
pnpm dev:server
```

### 4. Start Client Development Server
In a second terminal, start Vite client dev server on `http://localhost:5173`:
```bash
pnpm dev:client
```

Open your browser to `http://localhost:5173`:
- **Main Lobby & Online Matchmaking**: `http://localhost:5173`
- **Local 2-Player Combat**: `http://localhost:5173?scene=local`
- **Mobile Touch Controls Emulation**: `http://localhost:5173?scene=local&touch=1`
- **Animation & Hitbox Debugger**: `http://localhost:5173?scene=debug`

---

---

## 🕹️ How to Play the Game

### 1. Browser Game Modes

Once the development or preview servers are running, access any game mode directly via your browser:

| Game Mode | Direct URL | Description |
| :--- | :--- | :--- |
| **Online Multiplayer & Lobby** | [**`http://localhost:5173`**](http://localhost:5173) | Main menu: Create a room, get a 5-letter code, select Davis or Dennis, and battle online. |
| **Local 2-Player Combat** | [**`http://localhost:5173?scene=local`**](http://localhost:5173?scene=local) | Instant local fighting match: Player 1 vs Player 2 on the same keyboard. |
| **Mobile Touch Controls** | [**`http://localhost:5173?scene=local&touch=1`**](http://localhost:5173?scene=local&touch=1) | Enables on-screen virtual joystick and Attack/Jump/Defend buttons (touch or mouse). |
| **Animation & Hitbox Inspector** | [**`http://localhost:5173?scene=debug`**](http://localhost:5173?scene=debug) | Debug tool to inspect individual character frames, state machine, and hitboxes/hurtboxes. |

---

### 2. Testing Online Multiplayer with Two Browser Tabs

You can test full online multiplayer on your local machine using two browser windows:
1. Open [**`http://localhost:5173`**](http://localhost:5173) in your primary browser window.
2. Click **CREATE ROOM** — the server generates an authoritative 5-character room code (e.g., `V7KL2`).
3. Open an **Incognito / Private Window** or a second tab to [**`http://localhost:5173`**](http://localhost:5173).
4. Enter the 5-letter room code into the input field and click **JOIN ROOM**.
5. Select your character on each client (**DAVIS** or **DENNIS**) and click **READY**.
6. When both players are ready, a 3-second countdown initiates, transitioning both players into the live authoritative online arena with client-side prediction, reconciliation, and real-time ping tracking!

---

### 3. Controls & Combat Moves

#### 🥋 Player 1 (Configurable via `keyboardConfig.ts`)
- **Move 2.5D**: Arrow keys (`←` `↑` `→` `↓`)
  - *Double-tap* `→` or `←` to **Sprint/Run**.
- **Attack**: `A`
  - Tap repeatedly for Davis's **3-Hit Punch Combo**.
  - While running + `A`: **Dash Attack / Slide Kick**.
  - While jumping + `A`: **Flying Jump Kick**.
- **Jump**: `S` (Vertical jump with realistic gravity).
- **Defend (Guard)**: `D` (Reduces incoming damage by 75% and prevents knockdowns from standard hits).
- 🔥 **Special Move — Dragon Blast (`D + F + A`)**:
  - While facing right: Press `D` ➔ `→` ➔ `A`
  - While facing left: Press `D` ➔ `←` ➔ `A`
  - Launches an energy ball projectile (costs 50 MP). Projectiles collide and clash mid-air!

#### 🥊 Player 2 (Local 2-Player Mode)
- **Move 2.5D**: `I` (Up), `K` (Down), `J` (Left), `L` (Right)
- **Attack**: `U` (or `Z`)
- **Jump**: `O` (or `X`)
- **Defend**: `P` (or `C`)

#### 🛠️ HUD & In-Game Toggles
- **`B`**: Toggle collision debug boxes (Red = Attack Hitboxes, Green = Body Hurtboxes).
- **`[🎮 TOUCH CONTROLS]`**: Toggle the touch overlay on or off at any time.
- **`[SZ: S / M / L]`**: Cycle virtual button sizes (Small, Medium, Large).
- **`[⛶ FS]`**: Toggle fullscreen mode with landscape orientation lock.

---

### 4. Mobile Touch Controls
When playing on touch devices (phones/tablets) or with `?touch=1`:
- **Left Side**: 8-way responsive virtual joystick for walking, diagonal movement, and sprinting.
- **Right Side**: Multi-touch action buttons:
  - 🔴 **A (Attack)**: Crimson button
  - 🔵 **J (Jump)**: Cyan button
  - 🟡 **D (Defend)**: Amber button
- Multi-touch enabled: move the joystick with your left thumb while simultaneously executing jump attacks or special combos with your right thumb!

---

## 🧪 Running Automated Tests

Run the full Vitest suite (22 tests verifying deterministic simulation, combat knockdowns, projectile clashes, and authoritative Colyseus room networking):

```bash
# Run all shared simulation and server multiplayer tests
pnpm test

# Run a package suite individually
pnpm test:shared
pnpm test:server
```

---

## 📱 Mobile Native Builds (Capacitor)

LF Online wraps the client into native Android and iOS apps using Capacitor with landscape orientation lock.

### 1. Build Client and Sync to Native Projects
```bash
# Build client and sync web bundle to android/ and ios/
pnpm cap:build
```

### 2. Regenerate App Icons & Splash Screens (Optional)
```bash
pnpm mobile:assets
pnpm exec tsx scripts/generate-native-icons.ts
pnpm cap:sync
```

### 3. Android Build & Run
To open in Android Studio:
```bash
pnpm cap:android
```
To run directly on a connected Android phone or emulator:
```bash
pnpm cap:run:android
```
Or via Gradle CLI directly:
```bash
cd android
./gradlew assembleDebug
# APK generated at android/app/build/outputs/apk/debug/app-debug.apk
```

### 4. iOS Build & Run (macOS required)
To open in Xcode:
```bash
pnpm cap:ios
```
To run directly on a connected iPhone or iOS Simulator:
```bash
pnpm cap:run:ios
```

---

## 🌐 Production Deployment

### 1. Authoritative Game Server Deployment

#### Option A: Dockerfile (Any VPS, Fly.io, Railway, DigitalOcean)
Build and run the production Docker container:
```bash
docker build -t lf-online-server .
docker run -p 2567:2567 -e PORT=2567 -e NODE_ENV=production lf-online-server
```

#### Option B: Fly.io
The repository includes a ready-to-deploy `fly.toml`:
```bash
# 1. Install Fly CLI and login
fly auth login

# 2. Launch or deploy the app
fly launch --no-deploy
fly deploy
```

#### Option C: Render
Connect your repository to Render using `render.yaml` Blueprint or create a Docker Web Service pointing to `Dockerfile` with port `2567`.

---

### 2. Static Web Client Deployment

#### Configure Server URL
In `packages/client/`, create a `.env.production` file pointing to your production server with secure WebSockets (`https://` or `wss://`):
```env
VITE_SERVER_URL=https://lf-online-server.fly.dev
```

#### Option A: Vercel
Deploy using the included `packages/client/vercel.json`:
```bash
pnpm --filter @lf-online/client build
vercel --prod
```

#### Option B: Netlify
Deploy using the included `packages/client/netlify.toml`:
```bash
pnpm --filter @lf-online/client build
netlify deploy --prod --dir=packages/client/dist
```

---

## 📜 License
MIT License. Inspired by Marti Wong and Starsky Wong's *Little Fighter 2*.
