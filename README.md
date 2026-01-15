
# Nexora Pro: Hybrid Real-Time Architecture

Nexora Pro is a professional-grade paper trading platform designed for the Nepal Stock Market, utilizing a sophisticated hybrid data sync strategy.

## 🏆 Competition Presentation Overview

### The Problem: Cloud Quota & External API Limits
Trading apps struggle with two limits:
1. **Firestore Quotas**: High-frequency writes are expensive and rate-limited.
2. **External API Limits**: Most free/open stock APIs for NEPSE (like kokomo.workers.dev) have strict rate limits and **CORS restrictions** that prevent direct browser-side fetching.

### The Nexora Solution: "The Triple-Tier Broadcast"
Nexora Pro solves this using an **Admin-Aggregator Model**:
1. **Live Scraping (10m)**: Only the **Admin Client** fetches data from the external NEPSE worker API. We use a **CORS Proxy (AllOrigins)** and a robust **Retry & Throttling Engine** to bypass browser-side security blocks and handle proxy instability.
2. **Local Drift (4s)**: To maintain a snappy UI, the market "drifts" every 4 seconds based on stochastic volatility modeling relative to the last real NEPSE price.
3. **RTDB Broadcast (15s)**: The Admin pushes the drifted state to **Firebase Realtime Database**.
4. **Firestore Archive (2m)**: The state is persisted in Firestore every 2 minutes for long-term auditability.

---

## 🏗 Admin Protocol
- **Admin UID**: `wL3xCPtylQc5pxcuaFOWNdW62UW2`
- **CORS Bypass**: Implemented via `api.allorigins.win` with a custom-built retry handler (`retryFetch`) to ensure successful data ingestion even during proxy fluctuations.
- **Data Parser**: Fixed to handle flat-object responses (direct `ltp` extraction) from the NEPSE worker node.
- **Sync Trigger**: Admin handles all external API calls and broadcasts to the userbase.
