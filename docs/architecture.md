# Axiom System Architecture

## Component Separation & Data Boundaries

```
[ Web Frontend (React 19 + TypeScript + Vite 6) ]
      │
      │ REST API (/api/v1) & SSE (/events)
      ▼
[ Julia API Service (HTTP.jl + SQLite.jl) ]
      │
      │ In-process asynchronous task dispatch
      ▼
[ Julia Scientific Core (AxiomScientificCore.jl) ]
      ├── Equations (Heat1D, Burgers1D, Wave1D, HarmonicOscillator)
      ├── Reference Solvers (Analytical Oracles + SciML MOL RK4)
      ├── Neural Models (Lux.jl + ComponentArrays.jl)
      ├── Automatic Differentiation (Zygote.jl + ForwardDiff.jl)
      ├── Loss Module (Residual, Boundary, Initial, Sensor)
      ├── Metric Suite (MAE, RMSE, Relative L2, Residual RMS)
      └── Inverse Estimator (Dual Parameter & Weight Optimization)
```

## Security & Reliability Design
- Zero SQL injection: All SQLite statements use prepared parameter queries (`?`).
- Strict error boundaries: Frontend gracefully handles disconnection and displays failure banners.
- SSE connection management: Auto-closes terminated streams, prevents memory leaks.
- Resilient background worker: Experiments run in asynchronous Julia Tasks without blocking the HTTP listener.
