# Axiom Security & Operational Policy

## 1. Code Injection Prevention
Axiom strictly treats mathematical equations as typed structural configurations, never as raw Julia string expressions passed to `eval()`. Equation parameters are bounded and validated against numeric domain constraints.

## 2. Resource & Memory Bounds
- Evaluation grids are capped (default: $25 \times 25$, maximum: $200 \times 200$) to prevent memory exhaustion.
- Optimizer steps are bounded (default: 200, maximum: 10,000) with timeout guards.
- Collocation point sampling is bounded to avoid out-of-memory errors on CPU and GPU.

## 3. Cooperative Cancellation
Long-running scientific computations listen to asynchronous `CANCEL_FLAGS` channels, allowing researchers to halt divergent or unwanted experiments immediately without leaving orphaned worker threads.

## 4. Audit Logging
Every experiment creation, status transition, and parameter estimation call is recorded in the SQLite/PostgreSQL `audit_logs` table with timestamp and event metadata.
