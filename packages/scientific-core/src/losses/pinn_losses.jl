module PINNLosses

using Lux
using LinearAlgebra

export compute_heat_residual_loss, compute_dirichlet_boundary_loss, compute_initial_loss, compute_sensor_loss

"""
    compute_heat_residual_loss(model, X_res_all, ps, st, N_r, alpha, inv_2eps, inv_eps2)

Vectorized evaluation of heat PDE residual: r = ut - alpha * uxx.
X_res_all contains [X_center, X_t+, X_t-, X_x+, X_x-].
"""
function compute_heat_residual_loss(model, X_res_all, ps, st, N_r::Int, alpha::Float32, inv_2eps::Float32, inv_eps2::Float32)
    u_all, _ = Lux.apply(model, X_res_all, ps, st)
    u_c = u_all[1, 1:N_r]
    u_tp = u_all[1, N_r+1:2N_r]
    u_tm = u_all[1, 2N_r+1:3N_r]
    u_xp = u_all[1, 3N_r+1:4N_r]
    u_xm = u_all[1, 4N_r+1:5N_r]
    
    u_t = (u_tp .- u_tm) .* inv_2eps
    u_xx = (u_xp .- 2.0f0 .* u_c .+ u_xm) .* inv_eps2
    res = u_t .- alpha .* u_xx
    
    loss_r = sum(abs2, res) / Float32(N_r)
    return (loss=loss_r, residual_vec=res)
end

"""
    compute_burgers_residual_loss(model, X_res_all, ps, st, N_r, nu, inv_2eps, inv_eps2)

Viscous Burgers residual: r = ut + u*ux - nu*uxx.
"""
function compute_burgers_residual_loss(model, X_res_all, ps, st, N_r::Int, nu::Float32, inv_2eps::Float32, inv_eps2::Float32)
    u_all, _ = Lux.apply(model, X_res_all, ps, st)
    u_c = u_all[1, 1:N_r]
    u_tp = u_all[1, N_r+1:2N_r]
    u_tm = u_all[1, 2N_r+1:3N_r]
    u_xp = u_all[1, 3N_r+1:4N_r]
    u_xm = u_all[1, 4N_r+1:5N_r]
    
    u_t = (u_tp .- u_tm) .* inv_2eps
    u_x = (u_xp .- u_xm) .* inv_2eps
    u_xx = (u_xp .- 2.0f0 .* u_c .+ u_xm) .* inv_eps2
    res = u_t .+ u_c .* u_x .- nu .* u_xx
    
    loss_r = sum(abs2, res) / Float32(N_r)
    return (loss=loss_r, residual_vec=res)
end

"""
    compute_dirichlet_boundary_loss(model, X_bc0, X_bc1, ps, st, N_b)

Dirichlet boundary loss at x = 0 and x = 1: (u(0, t)² + u(1, t)²) / (2*Nb).
"""
function compute_dirichlet_boundary_loss(model, X_bc0, X_bc1, ps, st, N_b::Int)
    u_bc0, _ = Lux.apply(model, X_bc0, ps, st)
    u_bc1, _ = Lux.apply(model, X_bc1, ps, st)
    loss_b = (sum(abs2, u_bc0) + sum(abs2, u_bc1)) / Float32(2 * N_b)
    return loss_b
end

"""
    compute_initial_loss(model, X_ic, u_ic_true, ps, st, N_0)

Initial condition loss: 1/N0 * sum((u(x, 0) - u_ic_true)²).
"""
function compute_initial_loss(model, X_ic, u_ic_true, ps, st, N_0::Int)
    u_0, _ = Lux.apply(model, X_ic, ps, st)
    loss_0 = sum(abs2, vec(u_0) .- u_ic_true) / Float32(N_0)
    return loss_0
end

"""
    compute_sensor_loss(model, X_sensor, u_sensor_true, ps, st, N_s)

Data loss for sparse sensor measurements in inverse problems.
"""
function compute_sensor_loss(model, X_sensor, u_sensor_true, ps, st, N_s::Int)
    u_pred, _ = Lux.apply(model, X_sensor, ps, st)
    loss_data = sum(abs2, vec(u_pred) .- u_sensor_true) / Float32(N_s)
    return loss_data
end

end # module PINNLosses
