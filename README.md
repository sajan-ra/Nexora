
# Nexora Pro: Hybrid Snapshot Architecture

Nexora Pro is a professional-grade paper trading platform designed for high-performance simulation of the Nepal Stock Market.

## 🏆 Competition Presentation Overview

### The Problem: Cloud Quota & High-Frequency Scalability
Traditional trading apps fail on serverless architectures (like standard Firestore) because high-frequency updates (multiple per second) quickly exhaust "Write" quotas. 

### The Nexora Solution: "Hybrid Realtime Protocol"
Nexora Pro utilizes a custom-engineered **Triple-Layer Data Protocol**:
1.  **Client-Side Drift (4s)**: To maintain sub-pixel price movement visuals for a snappy UI.
2.  **Realtime Database Sync (15s)**: High-frequency market states are pushed to **Firebase Realtime Database**. RTDB is designed for low-latency, high-throughput updates without the per-write cost overhead of Firestore.
3.  **Firestore Archival (2m)**: Every 2 minutes, the system takes a "Deep Archive" of the market state and commits it to **Cloud Firestore**. This ensures long-term persistence and auditability while reducing Firestore costs by **99.9%**.

---

## 🛠 Technical Specifications

### Core Technologies
- **UI Framework**: React 19 (Concurrent Mode) for seamless rendering.
- **Backend Hybrid**: Firebase RTDB (Live Feed) + Firestore (Portfolio & Archive).
- **Intelligence**: Nvidia NIM / DeepSeek-V3 (Neural Reasoning Model).
- **Styling**: Tailored Dark-Mode System (HEX #080A0C).
- **Visualization**: Custom SVG Candlestick Engine.

---

## 📂 Full Project File Breakdown

### 🏗 Architecture & Core
- **`App.tsx`**: The Central Nerve System. Manages the hybrid simulation, dual-database routing, and global state.
- **`index.tsx`**: Entry point for the React application.
- **`index.html`**: The host document using ESM Import Maps.
- **`types.ts`**: Strict TypeScript interfaces for data integrity.
- **`database.rules.json`**: Security rules for the Realtime Database (RTDB) ensuring Admin-only broadcasting.

### 🛡 Services (The Logic Layer)
- **`services/firebase.ts`**: Configuration for both Firestore and Realtime Database (RTDB).
- **`services/aiService.ts`**: The Bridge to Nvidia's inference cloud for token-streaming analysis.
- **`firestore.rules`**: Security logic for Firestore assets.

### 📊 Components (The User Interface)
- **`components/MainTerminal.tsx`**: High-fidelity chart engine with anatomical candlesticks.
- **`components/OrderPanel.tsx`**: Transaction processing with margin logic.
- **`components/Sidebar.tsx`**: Searchable high-density watchlist.
- **`components/PortfolioView.tsx`**: Personal wealth tracker and P&L calculator.
- **`components/AIInsights.tsx`**: DeepSeek-V3 analysis with Neural Reasoning display.
- **`components/DashboardStats.tsx`**: Visual analytics using Recharts.
- **`components/Auth.tsx`**: Secure identity management.

---

## ⚡ Key Technical Innovations for Presentation
1.  **Hybrid DB Steering**: We use RTDB for live price action (speed) and Firestore for portfolios (durability).
2.  **Anatomical Candlesticks**: Includes terminal pins and shadows for professional price-action context.
3.  **Neural Thought Stream**: Displays AI's internal reasoning process before the final verdict.

---

## 🏗 Admin Protocol
- **Admin UID**: `wL3xCPtylQc5pxcuaFOWNdW62UW2`
- **RTDB Rules**: Only the Admin UID can write to `market/snapshot` and `settings/market`. All authenticated users have read access to the market feed.
- **Capabilities**: RTDB Broadcasting, Global Market Control, and Firestore Archiving.
