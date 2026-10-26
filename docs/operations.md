# Axiom Operations & Deployment Guide

## 1. Local Development Quickstart

### Prerequisites
- Julia 1.10+ (recommended 1.13+)
- Node.js 18+ (tested with v20/v22)
- npm or pnpm

### Step 1: Start Backend API Service
```bash
julia --project="services/api" services/api/src/AxiomAPI.jl
```
The HTTP API server will start on `http://127.0.0.1:8080`.

### Step 2: Start Frontend Web Application
```bash
cd apps/web
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 2. Running Automated Tests

### Scientific Core Test Suite (26 tests)
```bash
julia --project="packages/scientific-core" packages/scientific-core/test/runtests.jl
```

### API Service Test Suite (19 tests)
```bash
julia --project="services/api" services/api/test/runtests.jl
```

### Full-System Integration & E2E Suite (42 tests)
```bash
julia --project="services/api" tests/integration/run_integration_tests.jl
```

### Web Frontend Test Suite (Vitest)
```bash
cd apps/web
npm test
```

### Frontend Production Build
```bash
cd apps/web
npm run build
```

---

## 3. Docker Compose Orchestration
Run the containerized application stack:
```bash
docker compose up --build
```
This launches the Julia scientific API container alongside the Vite static web container.
