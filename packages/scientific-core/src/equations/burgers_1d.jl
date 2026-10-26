module Burgers1D

export initial_condition, boundary_condition, pde_residual, reference_solution

"""
    initial_condition(x)

Initial velocity distribution u(x, 0) = -sin(π*x).
"""
function initial_condition(x)
    return -sin(pi * x)
end

"""
    boundary_condition(x, t)

Dirichlet boundary conditions u(-1, t) = u(1, t) = 0.
"""
function boundary_condition(x, t)
    return 0.0
end

"""
    pde_residual(u, ut, ux, uxx; nu=0.01/pi)

Viscous Burgers residual: r = ut + u*ux - nu*uxx.
"""
function pde_residual(u, ut, ux, uxx; nu=0.01/pi)
    return ut + u * ux - nu * uxx
end

"""
    reference_solution(x, t; nu=0.01/pi)

Cole-Hopf numerical/series expansion or high-resolution quadrature for Burgers' equation.
"""
function reference_solution(x, t; nu=0.01/pi)
    # Numerical evaluation of Cole-Hopf transformation:
    # u(x, t) = - 2*nu * (∂ψ/∂x) / ψ
    # where ψ(x, t) = ∫ exp( - (cos(π*η) + 1)/(2π*nu) - (x - η)²/(4*nu*t) ) dη
    if t < 1e-6
        return initial_condition(x)
    end
    N_quad = 100
    eta_min = -2.0
    eta_max = 2.0
    d_eta = (eta_max - eta_min) / N_quad
    
    num = 0.0
    den = 0.0
    for i in 0:N_quad
        eta = eta_min + i * d_eta
        weight = (i == 0 || i == N_quad) ? 0.5 : 1.0
        exp_arg = -(cos(pi * eta) + 1.0) / (2.0 * pi * nu) - ((x - eta)^2) / (4.0 * nu * t)
        val = exp(clamp(exp_arg, -500.0, 500.0))
        d_val_dx = val * (-(x - eta) / (2.0 * nu * t))
        
        num += weight * d_val_dx * d_eta
        den += weight * val * d_eta
    end
    if abs(den) < 1e-12
        return 0.0
    end
    return -2.0 * nu * (num / den)
end

end # module Burgers1D
