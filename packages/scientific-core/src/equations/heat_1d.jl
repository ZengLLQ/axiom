module Heat1D

export analytical_solution, exact_ut, exact_ux, exact_uxx, initial_condition, boundary_condition, pde_residual

"""
    analytical_solution(x, t; alpha=0.1)

Computes the exact analytical temperature for 1D heat equation with u(x,0) = sin(π*x)
and u(0,t) = u(1,t) = 0.
"""
function analytical_solution(x, t; alpha=0.1)
    return exp(-alpha * (pi^2) * t) * sin(pi * x)
end

"""
    exact_ut(x, t; alpha=0.1)

Exact partial derivative ∂u/∂t.
"""
function exact_ut(x, t; alpha=0.1)
    return -alpha * (pi^2) * exp(-alpha * (pi^2) * t) * sin(pi * x)
end

"""
    exact_ux(x, t; alpha=0.1)

Exact partial derivative ∂u/∂x.
"""
function exact_ux(x, t; alpha=0.1)
    return pi * exp(-alpha * (pi^2) * t) * cos(pi * x)
end

"""
    exact_uxx(x, t; alpha=0.1)

Exact second partial derivative ∂²u/∂x².
"""
function exact_uxx(x, t; alpha=0.1)
    return -(pi^2) * exp(-alpha * (pi^2) * t) * sin(pi * x)
end

"""
    initial_condition(x)

Initial temperature distribution u(x, 0) = sin(π*x).
"""
function initial_condition(x)
    return sin(pi * x)
end

"""
    boundary_condition(x, t)

Dirichlet boundary condition u(0, t) = u(1, t) = 0.
"""
function boundary_condition(x, t)
    return 0.0
end

"""
    pde_residual(ut, uxx; alpha=0.1)

Calculates the differential residual r = ut - alpha * uxx.
"""
function pde_residual(ut, uxx; alpha=0.1)
    return ut - alpha * uxx
end

end # module Heat1D
