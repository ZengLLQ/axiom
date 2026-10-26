# Scientific Methodology & Mathematical Foundations

## 1. Governing Heat Diffusion Formulation

The canonical forward research problem in Axiom is the 1D Heat Equation:

$$\frac{\partial u}{\partial t} = \alpha \frac{\partial^2 u}{\partial x^2}, \quad x \in [0, 1], \quad t \in [0, T]$$

Subject to initial condition:
$$u(x, 0) = \sin(\pi x)$$

and homogeneous Dirichlet boundary conditions:
$$u(0, t) = 0, \quad u(1, t) = 0$$

### Analytical Solution Oracle

Separation of variables yields the exact analytical solution:
$$u(x, t) = e^{-\alpha \pi^2 t} \sin(\pi x)$$

Partial derivatives:
$$\frac{\partial u}{\partial t} = -\alpha \pi^2 e^{-\alpha \pi^2 t} \sin(\pi x)$$
$$\frac{\partial^2 u}{\partial x^2} = -\pi^2 e^{-\alpha \pi^2 t} \sin(\pi x)$$

Hence the differential residual:
$$r(x, t) = \frac{\partial u}{\partial t} - \alpha \frac{\partial^2 u}{\partial x^2} \equiv 0$$

## 2. Independent SciML Method of Lines Numerical Solver

To ensure results do not depend on analytical simplicity, Axiom incorporates a high-order numerical finite difference solver:
$$\frac{du_j}{dt} = \alpha \frac{u_{j+1} - 2u_j + u_{j-1}}{\Delta x^2}$$

Integrated with explicit 4th-order Runge-Kutta (RK4) time stepping and adaptive sub-cycling satisfying the Courant-Friedrichs-Lewy (CFL) parabolic stability condition:
$$\Delta t_{sub} \le 0.35 \frac{\Delta x^2}{\alpha}$$

## 3. Physics-Informed Neural Network (PINN) Formulation

A neural network $u_\theta(x, t)$ is parameterized using `Lux.jl`:

$$\mathcal{L}(\theta) = \lambda_r \mathcal{L}_r + \lambda_b \mathcal{L}_b + \lambda_0 \mathcal{L}_0$$

Where:
- Residual Loss: $\mathcal{L}_r = \frac{1}{N_r} \sum_{i=1}^{N_r} \left( \frac{\partial u_\theta}{\partial t} - \alpha \frac{\partial^2 u_\theta}{\partial x^2} \right)^2$
- Boundary Loss: $\mathcal{L}_b = \frac{1}{2 N_b} \sum_{i=1}^{N_b} \left( u_\theta(0, t_i)^2 + u_\theta(1, t_i)^2 \right)$
- Initial Loss: $\mathcal{L}_0 = \frac{1}{N_0} \sum_{i=1}^{N_0} \left( u_\theta(x_i, 0) - \sin(\pi x_i) \right)^2$

Gradients with respect to network parameters $\theta$ are evaluated via reverse-mode AD (`Zygote.jl`), while spatial and temporal differentials are computed via vectorized dual-stencil operations.

## 4. Inverse Parameter Estimation

In the inverse problem, thermal diffusivity $\alpha$ is treated as an unobserved variable. Given sparse measurements $u_{obs}$ at sensor locations $(x_s, t_s)$:

$$\mathcal{L}(\theta, \alpha) = \lambda_r \mathcal{L}_r(\alpha) + \lambda_b \mathcal{L}_b + \lambda_0 \mathcal{L}_0 + \lambda_{data} \frac{1}{N_s} \sum_{s=1}^{N_s} (u_\theta(x_s, t_s) - u_{obs})^2$$

Gradient updates for physical parameter $\alpha$:
$$\frac{\partial \mathcal{L}}{\partial \alpha} = -\frac{2}{N_r} \sum_{i=1}^{N_r} r_\theta(x_i, t_i) \frac{\partial^2 u_\theta}{\partial x^2}(x_i, t_i)$$

Parameterizing $\alpha = \exp(\log \alpha)$ guarantees strict positivity throughout training.

## 5. References
- Raissi, M., Perdikaris, P., & Karniadakis, G. E. (2019). Physics-informed neural networks: A deep learning framework for solving forward and inverse problems involving nonlinear partial differential equations. *Journal of Computational Physics*, 378, 686-707.
