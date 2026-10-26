# Axiom — Scientific AI Laboratory

> **Precision Scientific Instrument for Scientific Machine Learning (SciML) and Physics-Informed Neural Networks (PINN)**

Built on **Julia 1.13 + Lux.jl** scientific core, independent **SciML numerical Runge-Kutta Method of Lines (MOL)** solvers, exact Fourier analytical oracles, and a **Linear midnight precision instrument** web application.

---

## 🔬 Non-Negotiable Scientific Principles

1. **Empirical Numerical Integrity**: Metrics (MAE, RMSE, Relative L2, Residual RMS, Boundary & Initial Condition Errors) originate from real mathematical computations—never simulated or faked.
2. **Independent Oracle Baselines**: Every PINN prediction is compared against an independent analytical Fourier oracle and a numerical finite difference Runge-Kutta solver.
3. **Rigorous Validation Status**: Training completion is distinct from scientific validation. Models that do not satisfy $\text{Rel } L_2 \le 0.08$ and $\text{Residual RMS} \le 0.10$ are explicitly labeled `failed` or `inconclusive`.
4. **Parameter Discovery (Inverse Problems)**: Physics residuals are backpropagated directly to physical constants (e.g., thermal diffusivity $\alpha$) to recover unknown parameters from sparse, noisy sensor measurements.
5. **Deterministic Open Science**: Every experiment exports an independent, standalone executable Julia script (`.jl`), JSON manifest, and evaluation CSV dataset.

---

## 📐 System Architecture

```text
AXIOM
├── WEB APPLICATION (apps/web)
│   ├── React 19 + TypeScript + Vite 6
│   ├── Tailwind CSS v4 + Linear midnight tokens (#08090a, #e4f222 acid lime)
│   ├── Canvas 2D Heatmap & Multi-series Line Charting
│   ├── Studio workbench, Live Monitor, Results Dossier, Inverse Workbench
│   └── Server-Sent Events (SSE) Client
│
├── API SERVICE (services/api)
│   ├── HTTP.jl v2.12 async router
│   ├── SQLite.jl with WAL mode & ACID persistence
│   ├── Real-time SSE streaming for live loss curves
│   └── Standalone replication script and CSV/JSON export generators
│
└── SCIENTIFIC CORE (packages/scientific-core)
    ├── Equations: 1D Heat (parabolic), 1D Burgers (hyperbolic), 1D Wave (hyperbolic), Damped Harmonic Oscillator (ODE)
    ├── Solvers: Exact analytical Fourier oracles & SciML Method of Lines RK4 numerical solvers
    ├── Models: Lux.jl functional MLPs with ComponentArrays.jl
    ├── Automatic Differentiation: Zygote.jl reverse-mode + ForwardDiff.jl dual numbers
    ├── Losses: Separate residual L_r, boundary L_b, initial L_0, and sensor data L_data
    └── Inverse Estimator: Simultaneous network & physical constant gradient descent
```

---

## 🚀 Quickstart

### 1. Requirements
- **Julia >= 1.10** (installed: Julia 1.13.3)
- **Node.js >= 20** (installed: Node v26.7.0)

### 2. Start the API Server
```bash
# Terminal 1: Launch Julia Scientific API Service (Port 8080)
julia services/api/src/AxiomAPI.jl
```

### 3. Start the Web Dashboard
```bash
# Terminal 2: Launch Vite Frontend (Port 5173)
cd apps/web
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing Record

### Run Scientific Core Tests (26 Unit Tests)
```bash
julia packages/scientific-core/test/runtests.jl
```
- Tests exact analytical derivatives ($u_t, u_x, u_{xx}$) and verifies PDE residual $u_t - \alpha u_{xx} \equiv 0$.
- Tests independent Method of Lines RK4 numerical solver against analytical solution ($\Delta < 0.005$).
- Tests Lux MLP parameter counting and topology.
- Tests metric calculations (MAE, RMSE, Relative L2).
- Tests full PINN training loop and loss reduction.
- Tests inverse parameter recovery from noisy sensor data.

### Run API Service Tests (19 Unit Tests)
```bash
julia services/api/test/runtests.jl
```
- Tests `/health` and `/api/v1/capabilities`.
- Tests `/api/v1/equations` catalog and metadata.
- Tests experiment creation, retrieval, and SQLite persistence.
- Tests `/api/v1/experiments/quick-solve`.
- Tests standalone Julia script generation and CSV dataset export.

### Run Full-System Integration & E2E Suite (42 Tests)
```bash
julia --project="services/api" tests/integration/run_integration_tests.jl
```
- Tests live server startup, health, and capabilities.
- Tests equation catalog API routes.
- Tests full experiment lifecycle: creation, quick-solve, DB persistence, result retrieval.
- Tests standalone Julia script export, Manifest JSON export, and evaluation CSV export.
- Tests inverse parameter estimation via API.

### Run Frontend Unit Tests (4 Tests)
```bash
cd apps/web
npm test
```
- Tests equation catalog integrity and default network hyperparameters.

### Build Web Production Bundle
```bash
cd apps/web
npm run build
```

---

## 📄 License
Apache-2.0
