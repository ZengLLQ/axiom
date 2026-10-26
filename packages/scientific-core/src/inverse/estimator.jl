module InverseEstimator

using Lux
using Random
using ComponentArrays
using Zygote
using Optimisers
using LinearAlgebra

include("../models/mlp.jl")
include("../losses/pinn_losses.jl")
include("../equations/heat_1d.jl")

using .MLPModel
using .PINNLosses
using .Heat1D

export run_inverse_estimation

"""
    run_inverse_estimation(config; on_progress=nothing, is_cancelled=()->false)

Solves the inverse physics problem: recovers unknown thermal diffusivity α from sparse noisy sensor measurements.
"""
function run_inverse_estimation(config::Dict{String, Any}; on_progress=nothing, is_cancelled=()->false)
    t_start = time()
    
    # Configuration
    true_alpha = Float32(get(config, "trueValue", 0.1))
    init_alpha = Float32(get(config, "initialGuess", 0.3))
    num_sensors = Int(get(config, "sensorCount", 120))
    noise_std = Float32(get(config, "noiseStd", 0.01))
    total_steps = Int(get(config, "steps", 250))
    lr = Float32(get(config, "learningRate", 0.005))
    seed = Int(get(config, "seed", 42))
    
    rng = Random.default_rng()
    Random.seed!(rng, seed)
    
    # Generate synthetic sensor data from true physical law
    sensor_x = 0.05f0 .+ rand(rng, Float32, num_sensors) .* 0.90f0
    sensor_t = 0.05f0 .+ rand(rng, Float32, num_sensors) .* 0.90f0
    u_true_clean = [Float32(Heat1D.analytical_solution(Float64(sensor_x[i]), Float64(sensor_t[i]); alpha=Float64(true_alpha))) for i in 1:num_sensors]
    # Add Gaussian noise
    sensor_u = u_true_clean .+ noise_std .* randn(rng, Float32, num_sensors)
    X_sensor = vcat(transpose(sensor_x), transpose(sensor_t))
    
    # Setup PINN network
    layer_dims = [2, 32, 32, 1]
    model_obj = MLPModel.build_mlp(layer_dims; activation="tanh", seed=seed)
    model = model_obj.model
    ps_ca = model_obj.ps
    st = model_obj.st
    
    # Collocation samples
    N_r = 300
    x_col = rand(rng, Float32, N_r)
    t_col = rand(rng, Float32, N_r)
    
    N_b = 40
    t_bc = rand(rng, Float32, N_b)
    bc_x0 = zeros(Float32, N_b)
    bc_x1 = ones(Float32, N_b)
    
    N_0 = 40
    x_ic = rand(rng, Float32, N_0)
    t_ic = zeros(Float32, N_0)
    u_ic_true = sin.(Float32(pi) .* x_ic)
    
    eps = 1.0f-3
    inv_2eps = 1.0f0 / (2.0f0 * eps)
    inv_eps2 = 1.0f0 / (eps * eps)
    
    X_c = vcat(transpose(x_col), transpose(t_col))
    X_tp = vcat(transpose(x_col), transpose(t_col .+ eps))
    X_tm = vcat(transpose(x_col), transpose(t_col .- eps))
    X_xp = vcat(transpose(x_col .+ eps), transpose(t_col))
    X_xm = vcat(transpose(x_col .- eps), transpose(t_col))
    X_res_all = hcat(X_c, X_tp, X_tm, X_xp, X_xm)
    
    X_bc0 = vcat(transpose(bc_x0), transpose(t_bc))
    X_bc1 = vcat(transpose(bc_x1), transpose(t_bc))
    X_ic = vcat(transpose(x_ic), transpose(t_ic))
    
    # Combined parameter vector: [weights_biases..., log_alpha]
    # Parameterize alpha as exp(log_alpha) to ensure strict positivity
    log_alpha_curr = log(init_alpha)
    p_curr = ps_ca
    
    opt_net = Optimisers.Adam(lr)
    opt_net_st = Optimisers.setup(opt_net, p_curr)
    
    lr_alpha = 0.008f0
    history = []
    
    for step in 1:total_steps
        if is_cancelled()
            break
        end
        
        curr_alpha = exp(log_alpha_curr)
        
        # Loss w.r.t network params
        function loss_fn(p)
            res_tuple = PINNLosses.compute_heat_residual_loss(model, X_res_all, p, st, N_r, curr_alpha, inv_2eps, inv_eps2)
            loss_r = res_tuple.loss
            loss_b = PINNLosses.compute_dirichlet_boundary_loss(model, X_bc0, X_bc1, p, st, N_b)
            loss_0 = PINNLosses.compute_initial_loss(model, X_ic, u_ic_true, p, st, N_0)
            loss_data = PINNLosses.compute_sensor_loss(model, X_sensor, sensor_u, p, st, num_sensors)
            return loss_r + 15.0f0 * loss_b + 15.0f0 * loss_0 + 40.0f0 * loss_data
        end
        
        loss_val, back = Zygote.pullback(loss_fn, p_curr)
        grads = back(1.0f0)[1]
        opt_net_st, p_curr = Optimisers.update(opt_net_st, p_curr, grads)
        
        # Gradient w.r.t alpha:
        # L_res = 1/Nr * sum (ut - alpha * uxx)^2
        # dL_res/d(alpha) = -2/Nr * sum( (ut - alpha * uxx) * uxx )
        # dL_res/d(log_alpha) = (dL_res/d(alpha)) * alpha
        u_all, _ = Lux.apply(model, X_res_all, p_curr, st)
        u_c = u_all[1, 1:N_r]
        u_tp = u_all[1, N_r+1:2N_r]
        u_tm = u_all[1, 2N_r+1:3N_r]
        u_xp = u_all[1, 3N_r+1:4N_r]
        u_xm = u_all[1, 4N_r+1:5N_r]
        
        u_t = (u_tp .- u_tm) .* inv_2eps
        u_xx = (u_xp .- 2.0f0 .* u_c .+ u_xm) .* inv_eps2
        res = u_t .- curr_alpha .* u_xx
        
        grad_alpha = -2.0f0 * sum(res .* u_xx) / Float32(N_r)
        grad_log_alpha = grad_alpha * curr_alpha
        
        # Update log_alpha
        log_alpha_curr -= lr_alpha * clamp(grad_log_alpha, -2.0f0, 2.0f0)
        curr_alpha_new = exp(log_alpha_curr)
        rel_err = abs(curr_alpha_new - true_alpha) / true_alpha
        
        if step % 10 == 0 || step == 1 || step == total_steps
            item = Dict{String, Any}(
                "step" => step,
                "estimatedAlpha" => round(Float64(curr_alpha_new), digits=5),
                "trueAlpha" => round(Float64(true_alpha), digits=5),
                "relativeError" => round(Float64(rel_err), digits=5),
                "loss" => round(Float64(loss_val), digits=5)
            )
            push!(history, item)
            
            if on_progress !== nothing
                on_progress(item)
            end
        end
    end
    
    final_alpha = exp(log_alpha_curr)
    final_rel_err = abs(final_alpha - true_alpha) / true_alpha
    
    return Dict{String, Any}(
        "targetParameter" => "alpha",
        "trueValue" => round(Float64(true_alpha), digits=5),
        "initialGuess" => round(Float64(init_alpha), digits=5),
        "estimatedValue" => round(Float64(final_alpha), digits=5),
        "relativeError" => round(Float64(final_rel_err), digits=5),
        "sensorCount" => num_sensors,
        "noiseStd" => Float64(noise_std),
        "convergenceHistory" => history,
        "sensorPoints" => [
            Dict{String, Any}("x" => sensor_x[i], "t" => sensor_t[i], "measured_u" => sensor_u[i]) for i in 1:min(num_sensors, 60)
        ],
        "durationSec" => round(time() - t_start, digits=3),
        "status" => final_rel_err < 0.15 ? "passed" : "inconclusive"
    )
end

end # module InverseEstimator
