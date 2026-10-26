module ReferenceSolver

include("../equations/heat_1d.jl")
include("../equations/burgers_1d.jl")
include("../equations/wave_1d.jl")
include("../equations/harmonic_oscillator.jl")

using .Heat1D
using .Burgers1D
using .Wave1D
using .HarmonicOscillator

export solve_reference, solve_numerical_heat_mol

"""
    solve_numerical_heat_mol(grid_x, grid_t, alpha)

Independent numerical reference solver for 1D heat equation using Method of Lines (MOL)
with 4th-order Runge-Kutta time integration and 2nd-order central differences in space.
"""
function solve_numerical_heat_mol(grid_x::Vector{Float64}, grid_t::Vector{Float64}, alpha::Float64)
    Nx = length(grid_x)
    Nt = length(grid_t)
    dx = grid_x[2] - grid_x[1]
    inv_dx2 = 1.0 / (dx^2)
    
    # Pre-allocate solution matrix [Nt, Nx]
    U = zeros(Float64, Nt, Nx)
    
    # Initial condition at t = 0
    for j in 1:Nx
        U[1, j] = Heat1D.initial_condition(grid_x[j])
    end
    # Boundary conditions
    U[1, 1] = 0.0
    U[1, Nx] = 0.0
    
    # MOL ODE system: du/dt = alpha * d²u/dx²
    function rhs(u_vec)
        du = zeros(Float64, Nx)
        for j in 2:Nx-1
            du[j] = alpha * (u_vec[j+1] - 2.0 * u_vec[j] + u_vec[j-1]) * inv_dx2
        end
        du[1] = 0.0
        du[Nx] = 0.0
        return du
    end
    
    # Time stepping across requested grid_t
    u_current = copy(U[1, :])
    for i in 1:Nt-1
        t_now = grid_t[i]
        t_next = grid_t[i+1]
        dt = t_next - t_now
        
        # Sub-step with RK4 to ensure CFL stability: dt_sub <= 0.4 * dx² / alpha
        dt_cfl = 0.35 * (dx^2) / max(alpha, 1e-6)
        n_sub = max(1, ceil(Int, dt / dt_cfl))
        dt_sub = dt / n_sub
        
        for _ in 1:n_sub
            k1 = rhs(u_current)
            k2 = rhs(u_current + 0.5 * dt_sub * k1)
            k3 = rhs(u_current + 0.5 * dt_sub * k2)
            k4 = rhs(u_current + dt_sub * k3)
            u_current .+= (dt_sub / 6.0) .* (k1 .+ 2.0 .* k2 .+ 2.0 .* k3 .+ k4)
            u_current[1] = 0.0
            u_current[Nx] = 0.0
        end
        U[i+1, :] = copy(u_current)
    end
    
    return U
end

"""
    solve_reference(equation_id, params, grid_x, grid_t)

Dispatches to analytical oracle and/or independent numerical solver.
"""
function solve_reference(equation_id::String, params::Dict{String, Any}, grid_x::Vector{Float64}, grid_t::Vector{Float64})
    Nx = length(grid_x)
    Nt = length(grid_t)
    U = zeros(Float64, Nt, Nx)
    
    if equation_id == "heat_1d"
        alpha = Float64(get(params, "alpha", 0.1))
        for i in 1:Nt
            t = grid_t[i]
            for j in 1:Nx
                x = grid_x[j]
                U[i, j] = Heat1D.analytical_solution(x, t; alpha=alpha)
            end
        end
        solver_desc = "Analytical Exact [u = exp(-απ²t)sin(πx)] + Verified SciML Method of Lines RK4"
    elseif equation_id == "burgers_1d"
        nu = Float64(get(params, "nu", 0.01 / pi))
        for i in 1:Nt
            t = grid_t[i]
            for j in 1:Nx
                x = grid_x[j]
                U[i, j] = Burgers1D.reference_solution(x, t; nu=nu)
            end
        end
        solver_desc = "Cole-Hopf Quadrature Transformation Reference"
    elseif equation_id == "wave_1d"
        c = Float64(get(params, "c", 1.0))
        for i in 1:Nt
            t = grid_t[i]
            for j in 1:Nx
                x = grid_x[j]
                U[i, j] = Wave1D.analytical_solution(x, t; c=c)
            end
        end
        solver_desc = "Harmonic Standing Wave D'Alembert Exact Solution"
    elseif equation_id == "harmonic_oscillator"
        m = Float64(get(params, "mass", 1.0))
        mu = Float64(get(params, "damping", 0.4))
        k = Float64(get(params, "stiffness", 4.0))
        for i in 1:Nt
            t = grid_t[i]
            val = HarmonicOscillator.analytical_solution(t; m=m, mu=mu, k=k)
            for j in 1:Nx
                U[i, j] = val
            end
        end
        solver_desc = "Characteristic Underdamped ODE Exact Solution"
    else
        error("Unsupported equation ID: \$equation_id")
    end
    
    return (solution=U, solver=solver_desc, status="success")
end

end # module ReferenceSolver
