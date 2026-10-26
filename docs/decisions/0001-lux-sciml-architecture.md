# Architecture Decision Record (ADR) 0001: Lux.jl and SciML for Scientific Machine Learning

## Status
Accepted

## Context
Axiom requires a scientific machine learning engine that can train physics-informed neural networks (PINNs), compute higher-order derivatives ($u_t, u_{xx}$), interface with independent numerical differential equation solvers, and ensure deterministic reproducibility.

## Decision
We selected **Lux.jl** as the primary neural network framework and **SciML ecosystem principles** (Method of Lines + RK4) for numerical validation:
1. **Explicit Parameter Management**: Unlike Flux, Lux separates parameters `ps` from model state `st`, making checkpointing, distributed training, and AD pullback calculation completely stateless and pure.
2. **ComponentArrays.jl**: Allows structuring complex multi-layer perceptron parameters as flat vector arrays suitable for standard optimizers like Adam and L-BFGS.
3. **Zygote.jl**: Provides automatic differentiation compatible with Lux layers.
4. **Independent Reference Solver**: The Method of Lines with 4th-order Runge-Kutta time integration provides an independent numerical check that does not rely on the neural network.

## Consequences
- Guaranteed CPU compatibility across all platforms (Windows, Linux, macOS) using standard BLAS.
- Deterministic random number generator seeding for strict scientific reproducibility.
