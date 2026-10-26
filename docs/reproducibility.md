# Reproducibility Framework in Axiom

Scientific integrity requires that every result can be independently audited, inspected, and reproduced.

## 1. Deterministic Seeding
Every experiment configuration includes an explicit integer `seed` (default: `42`). This seed initializes:
- Model parameter weights and biases via deterministic Glorot Uniform / He initialization.
- Spatiotemporal Latin hypercube / uniform collocation sampling.
- Synthetic sensor placement and noise realization for inverse problems.

## 2. Independent Verification Oracles
Axiom strictly forbids evaluating a model against its own outputs.
For every supported PDE, Axiom pairs the PINN with:
1. **Closed-form Analytical Oracles** (e.g. Fourier series $u(x,t) = e^{-\alpha \pi^2 t}\sin(\pi x)$ for Heat 1D).
2. **SciML Method of Lines RK4 Solver** with CFL sub-stepping for numerical convergence checking.

## 3. Machine-Readable Provenance Manifests
Every completed run produces an immutable JSON manifest storing:
- Exact Julia runtime version, OS architecture, and BLAS configuration.
- Complete hyperparameters (network architecture, learning rate, loss weights $\lambda_r, \lambda_b, \lambda_0$).
- Discretized spacetime evaluation grid.
- Full loss convergence history.
- Validation criteria outcomes.

## 4. Standalone Code Export
Axiom provides one-click export of a standalone Julia script (`/export/julia`) that runs independently outside the Axiom web UI, allowing external verification by third-party peer reviewers.
