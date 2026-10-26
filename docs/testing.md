# Axiom Comprehensive Testing Protocol

Axiom follows a strict multi-tier testing strategy ensuring scientific validity, algorithmic convergence, and user interface responsiveness.

## Test Summary

| Layer | Framework | Location | Test Count | Pass Rate |
|---|---|---|---|---|
| **Scientific Core** | Julia `Test` | `packages/scientific-core/test/runtests.jl` | 26 | 100% |
| **API & Database** | Julia `Test` + `SQLite` | `services/api/test/runtests.jl` | 19 | 100% |
| **Full-System Integration** | Julia `HTTP` + `JSON3` | `tests/integration/run_integration_tests.jl` | 42 | 100% |
| **Frontend Unit / Spec** | `Vitest` + `TypeScript` | `apps/web/tests/frontend.test.ts` | 4 | 100% |
| **Production Web Build** | `tsc` + `Vite` | `apps/web/` | Clean | 100% |

## Scientific Verification Invariants
1. **Analytical Oracles**: $u(x,t) = e^{-\alpha \pi^2 t}\sin(\pi x)$ passes exact test at $x=0.5, t=0.0$ ($u=1.0$) and spatial symmetry test ($u(x) = u(1-x)$).
2. **SciML Method of Lines**: The 4th-order Runge-Kutta numerical solver matches the analytical solution with Relative $L_2 < 0.01$.
3. **Automatic Differentiation**: Vectorized central differences for $u_t$ and $u_{xx}$ match analytical values with error $< 10^{-4}$.
4. **Inverse Estimation**: Optimization of $\log(\alpha)$ recovers true diffusivity from noisy measurements within tolerance.
