module PINNTrainer

using Lux
using Random
using ComponentArrays
using Zygote
using Optimisers
using LinearAlgebra

include("../models/mlp.jl")
include("../losses/pinn_losses.jl")
include("../solvers/reference_solver.jl")
include("../evaluation/metrics.jl")

using .MLPModel
using .PINNLosses
using .ReferenceSolver
using .EvaluationMetrics

export train_pinn

"""
    train_pinn(config; on_progress=nothing, is_cancelled=()->false)

Runs complete PINN experiment with Lux, Zygote, and Optimisers.
"""
function train_pinn(config::Dict{String, Any}; on_progress=nothing, is_cancelled=()->false)
    t_start = time()
    
    # 1. Parse configuration
    eq_id = String(get(config, "equationId", "heat_1d"))
    params = Dict{String, Any}(get(config, "parameters", Dict{String, Any}("alpha" => 0.1)))
    alpha = Float32(get(params, "alpha", 0.1))
    
    domain_dict = get(config, "domain", Dict{String, Any}("xMin" => 0.0, "xMax" => 1.0, "tMin" => 0.0, "tMax" => 1.0))
    x_min = Float32(get(domain_dict, "xMin", 0.0))
    x_max = Float32(get(domain_dict, "xMax", 1.0))
    t_min = Float32(get(domain_dict, "tMin", 0.0))
    t_max = Float32(get(domain_dict, "tMax", 1.0))
    
    net_dict = get(config, "network", Dict{String, Any}())
    layer_dims = Vector{Int}(get(net_dict, "layers", [2, 32, 32, 32, 1]))
    act_str = String(get(net_dict, "activation", "tanh"))
    
    train_dict = get(config, "training", Dict{String, Any}())
    lr = Float32(get(train_dict, "learningRate", 0.005))
    total_steps = Int(get(train_dict, "steps", 200))
    N_r = Int(get(train_dict, "collocationPoints", 400))
    N_b = Int(get(train_dict, "boundaryPoints", 64))
    N_0 = Int(get(train_dict, "initialPoints", 64))
    log_interval = Int(get(train_dict, "logInterval", 20))
    seed = Int(get(train_dict, "seed", 42))
    
    weights_dict = get(train_dict, "lossWeights", Dict{String, Any}())
    lambda_r = Float32(get(weights_dict, "lambda_r", 1.0))
    lambda_b = Float32(get(weights_dict, "lambda_b", 20.0))
    lambda_0 = Float32(get(weights_dict, "lambda_0", 20.0))
    
    eval_dict = get(config, "evaluation", Dict{String, Any}())
    Nx = Int(get(eval_dict, "gridX", 25))
    Nt = Int(get(eval_dict, "gridT", 25))
    
    # 2. Setup RNG and Model
    rng = Random.default_rng()
    Random.seed!(rng, seed)
    
    model_obj = MLPModel.build_mlp(layer_dims; activation=act_str, seed=seed)
    model = model_obj.model
    ps_ca = model_obj.ps
    st = model_obj.st
    n_params = MLPModel.count_parameters(layer_dims)
    
    # 3. Collocation and Boundary Sampling
    x_col = x_min .+ rand(rng, Float32, N_r) .* (x_max - x_min)
    t_col = t_min .+ rand(rng, Float32, N_r) .* (t_max - t_min)
    
    t_bc = t_min .+ rand(rng, Float32, N_b) .* (t_max - t_min)
    bc_x0 = fill(x_min, N_b)
    bc_x1 = fill(x_max, N_b)
    
    x_ic = x_min .+ rand(rng, Float32, N_0) .* (x_max - x_min)
    t_ic = fill(t_min, N_0)
    u_ic_true = sin.(Float32(pi) .* ((x_ic .- x_min) ./ (x_max - x_min)))
    
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
    
    # 4. Setup Optimizer
    opt = Optimisers.Adam(lr)
    opt_st = Optimisers.setup(opt, ps_ca)
    
    # Loss objective
    function total_loss_fn(p)
        res_tuple = PINNLosses.compute_heat_residual_loss(model, X_res_all, p, st, N_r, alpha, inv_2eps, inv_eps2)
        loss_r = res_tuple.loss
        loss_b = PINNLosses.compute_dirichlet_boundary_loss(model, X_bc0, X_bc1, p, st, N_b)
        loss_0 = PINNLosses.compute_initial_loss(model, X_ic, u_ic_true, p, st, N_0)
        return lambda_r * loss_r + lambda_b * loss_b + lambda_0 * loss_0
    end
    
    loss_history = []
    p_curr = ps_ca
    
    # 5. Training Loop
    for step in 1:total_steps
        if is_cancelled()
            break
        end
        
        loss_val, back = Zygote.pullback(total_loss_fn, p_curr)
        grads = back(1.0f0)[1]
        opt_st, p_curr = Optimisers.update(opt_st, p_curr, grads)
        
        if step % log_interval == 0 || step == 1 || step == total_steps
            # Detailed loss diagnostics
            res_tuple = PINNLosses.compute_heat_residual_loss(model, X_res_all, p_curr, st, N_r, alpha, inv_2eps, inv_eps2)
            lb = PINNLosses.compute_dirichlet_boundary_loss(model, X_bc0, X_bc1, p_curr, st, N_b)
            l0 = PINNLosses.compute_initial_loss(model, X_ic, u_ic_true, p_curr, st, N_0)
            
            point = Dict{String, Any}(
                "step" => step,
                "total" => round(Float64(loss_val), digits=6),
                "residual" => round(Float64(res_tuple.loss), digits=6),
                "boundary" => round(Float64(lb), digits=6),
                "initial" => round(Float64(l0), digits=6)
            )
            push!(loss_history, point)
            
            if on_progress !== nothing
                elapsed = time() - t_start
                on_progress(point, elapsed)
            end
        end
    end
    
    training_duration = time() - t_start
    t_eval_start = time()
    
    # 6. Scientific Evaluation on Grid
    grid_x = collect(range(Float64(x_min), Float64(x_max), length=Nx))
    grid_t = collect(range(Float64(t_min), Float64(t_max), length=Nt))
    
    # Independent reference solution
    ref_result = ReferenceSolver.solve_reference(eq_id, params, grid_x, grid_t)
    U_ref = ref_result.solution # [Nt, Nx]
    
    # PINN prediction on grid
    U_pred = zeros(Float64, Nt, Nx)
    U_res = zeros(Float64, Nt, Nx)
    
    for i in 1:Nt
        ti = Float32(grid_t[i])
        X_grid_row = vcat(transpose(Float32.(grid_x)), fill(ti, 1, Nx))
        u_out, _ = Lux.apply(model, X_grid_row, p_curr, st)
        U_pred[i, :] = vec(Float64.(u_out))
        
        # Residual on grid row
        X_c_row = X_grid_row
        X_tp_row = vcat(transpose(Float32.(grid_x)), fill(ti + eps, 1, Nx))
        X_tm_row = vcat(transpose(Float32.(grid_x)), fill(ti - eps, 1, Nx))
        X_xp_row = vcat(transpose(Float32.(grid_x) .+ eps), fill(ti, 1, Nx))
        X_xm_row = vcat(transpose(Float32.(grid_x) .- eps), fill(ti, 1, Nx))
        X_all_row = hcat(X_c_row, X_tp_row, X_tm_row, X_xp_row, X_xm_row)
        
        u_all_row, _ = Lux.apply(model, X_all_row, p_curr, st)
        u_c_row = u_all_row[1, 1:Nx]
        u_tp_row = u_all_row[1, Nx+1:2Nx]
        u_tm_row = u_all_row[1, 2Nx+1:3Nx]
        u_xp_row = u_all_row[1, 3Nx+1:4Nx]
        u_xm_row = u_all_row[1, 4Nx+1:5Nx]
        
        ut_row = (u_tp_row .- u_tm_row) .* inv_2eps
        uxx_row = (u_xp_row .- 2.0f0 .* u_c_row .+ u_xm_row) .* inv_eps2
        res_row = ut_row .- alpha .* uxx_row
        U_res[i, :] = vec(Float64.(res_row))
    end
    
    U_abs_error = abs.(U_pred .- U_ref)
    
    # Boundary and IC errors
    ic_err = sqrt(sum((U_pred[1, :] .- U_ref[1, :]) .^ 2) / Nx)
    bc_err = sqrt((sum(U_pred[:, 1] .^ 2) + sum(U_pred[:, Nx] .^ 2)) / (2 * Nt))
    
    metrics = EvaluationMetrics.calculate_metrics(U_pred, U_ref, U_res, ic_err, bc_err)
    val_status_data = EvaluationMetrics.determine_validation_status(metrics)
    
    # Time slices for cross-sectional analysis
    slice_indices = unique([1, round(Int, Nt * 0.25), round(Int, Nt * 0.5), round(Int, Nt * 0.75), Nt])
    time_slices = []
    for idx in slice_indices
        push!(time_slices, Dict{String, Any}(
            "t" => grid_t[idx],
            "x" => grid_x,
            "predicted" => U_pred[idx, :],
            "reference" => U_ref[idx, :],
            "error" => U_abs_error[idx, :]
        ))
    end
    
    eval_duration = time() - t_eval_start
    
    # 7. Assemble final result payload
    result = Dict{String, Any}(
        "status" => val_status_data.status,
        "metrics" => Dict{String, Any}(
            "mae" => round(metrics.mae, digits=6),
            "rmse" => round(metrics.rmse, digits=6),
            "relativeL2" => round(metrics.relative_l2, digits=6),
            "maxResidual" => round(metrics.max_residual, digits=6),
            "residualRms" => round(metrics.residual_rms, digits=6),
            "icError" => round(metrics.ic_error, digits=6),
            "bcError" => round(metrics.bc_error, digits=6),
            "trainingLoss" => isempty(loss_history) ? 0.0 : loss_history[end]["total"],
            "validationLoss" => isempty(loss_history) ? 0.0 : loss_history[end]["residual"],
            "optimizerSteps" => total_steps,
            "trainingDurationSec" => round(training_duration, digits=3),
            "evalDurationSec" => round(eval_duration, digits=3),
            "parametersCount" => n_params
        ),
        "grid" => Dict{String, Any}(
            "x" => grid_x,
            "t" => grid_t
        ),
        "predicted" => [U_pred[i, :] for i in 1:Nt],
        "reference" => [U_ref[i, :] for i in 1:Nt],
        "absoluteError" => [U_abs_error[i, :] for i in 1:Nt],
        "residualField" => [U_res[i, :] for i in 1:Nt],
        "timeSlices" => time_slices,
        "lossHistory" => loss_history,
        "validationCriteria" => [
            Dict{String, Any}(
                "metric" => c.metric,
                "threshold" => c.threshold,
                "actual" => round(c.actual, digits=6),
                "passed" => c.passed
            ) for c in val_status_data.criteria
        ],
        "hardware" => Dict{String, Any}(
            "backend" => "CPU (Lux Vectorized BLAS Engine)",
            "juliaVersion" => string(VERSION),
            "threads" => Threads.nthreads(),
            "precision" => "Float32"
        )
    )
    
    return result
end

end # module PINNTrainer
