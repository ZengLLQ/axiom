module ExperimentRoutes

using HTTP
using JSON3
using UUIDs
using Dates
using DBInterface
using SQLite

include("../db.jl")
include(normpath(joinpath(@__DIR__, "..", "..", "..", "..", "packages", "scientific-core", "src", "AxiomScientificCore.jl")))

using .AxiomDB
using .AxiomScientificCore

export handle_request, ACTIVE_CHANNELS, CANCEL_FLAGS

const ACTIVE_CHANNELS = Dict{String, Vector{Channel{String}}}()
const CANCEL_FLAGS = Dict{String, Ref{Bool}}()
const RUNNING_TASKS = Dict{String, Task}()

function broadcast_event(exp_id::String, event_type::String, payload::Dict{String, Any})
    if haskey(ACTIVE_CHANNELS, exp_id)
        msg_json = JSON3.write(Dict{String, Any}("type" => event_type, "data" => payload))
        sse_chunk = "event: " * event_type * "\ndata: " * msg_json * "\n\n"
        for ch in ACTIVE_CHANNELS[exp_id]
            try
                if isopen(ch)
                    put!(ch, sse_chunk)
                end
            catch
            end
        end
    end
end

function json_response(data; status=200)
    body = JSON3.write(data)
    headers = [
        "Content-Type" => "application/json",
        "Access-Control-Allow-Origin" => "*",
        "Access-Control-Allow-Methods" => "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers" => "Content-Type, Authorization"
    ]
    return HTTP.Response(status, headers, body)
end

function error_response(msg::String; status=400)
    return json_response(Dict("error" => msg, "status" => status); status=status)
end

function get_capabilities()
    return Dict{String, Any}(
        "engine" => "Axiom Scientific AI Engine",
        "juliaVersion" => string(VERSION),
        "cpuThreads" => Threads.nthreads(),
        "hardwareBackend" => "CPU (Lux Vectorized BLAS Engine)",
        "cudaAvailable" => false,
        "supportedEquations" => ["heat_1d", "burgers_1d", "wave_1d", "harmonic_oscillator"],
        "supportedOptimizers" => ["adam", "lbfgs"],
        "precisionModes" => ["Float32", "Float64"],
        "features" => [
            "Analytical Solution Oracles",
            "Independent SciML Numerical Solvers (Method of Lines RK4)",
            "Physics-Informed Neural Networks (PINN)",
            "Inverse Physical Parameter Estimation",
            "Vectorized Higher-Order Derivatives",
            "Reproducible Code & Manifest Export"
        ]
    )
end

function get_equations()
    return [
        Dict{String, Any}(
            "id" => "heat_1d",
            "name" => "1D Heat Diffusion Equation",
            "category" => "parabolic",
            "pdeLatex" => "u_t = \\alpha u_{xx}",
            "description" => "Models thermal conduction and diffusive processes in a homogeneous rod with Dirichlet boundary conditions.",
            "parameters" => Dict{String, Any}(
                "alpha" => Dict{String, Any}("name" => "Thermal Diffusivity", "symbol" => "α", "default" => 0.1, "min" => 0.01, "max" => 1.0, "unit" => "m²/s")
            ),
            "domain" => Dict{String, Any}("x" => [0.0, 1.0], "t" => [0.0, 1.0]),
            "analyticalAvailable" => true,
            "referenceSolver" => "Exact Fourier Series + SciML Method of Lines RK4"
        ),
        Dict{String, Any}(
            "id" => "burgers_1d",
            "name" => "1D Viscous Burgers' Equation",
            "category" => "hyperbolic",
            "pdeLatex" => "u_t + u u_x = \\nu u_{xx}",
            "description" => "Combines nonlinear advection with viscous diffusion, leading to steep shock-front gradients.",
            "parameters" => Dict{String, Any}(
                "nu" => Dict{String, Any}("name" => "Kinematic Viscosity", "symbol" => "ν", "default" => 0.01 / pi, "min" => 0.001, "max" => 0.1, "unit" => "m²/s")
            ),
            "domain" => Dict{String, Any}("x" => [-1.0, 1.0], "t" => [0.0, 1.0]),
            "analyticalAvailable" => true,
            "referenceSolver" => "Cole-Hopf Quadrature Reference"
        ),
        Dict{String, Any}(
            "id" => "wave_1d",
            "name" => "1D Acoustic Wave Equation",
            "category" => "hyperbolic",
            "pdeLatex" => "u_{tt} = c^2 u_{xx}",
            "description" => "Second-order hyperbolic PDE describing the propagation of acoustic or mechanical oscillations.",
            "parameters" => Dict{String, Any}(
                "c" => Dict{String, Any}("name" => "Wave Speed", "symbol" => "c", "default" => 1.0, "min" => 0.1, "max" => 5.0, "unit" => "m/s")
            ),
            "domain" => Dict{String, Any}("x" => [0.0, 1.0], "t" => [0.0, 1.0]),
            "analyticalAvailable" => true,
            "referenceSolver" => "D'Alembert Standing Wave Exact Solution"
        ),
        Dict{String, Any}(
            "id" => "harmonic_oscillator",
            "name" => "Damped Harmonic Oscillator",
            "category" => "dynamical",
            "pdeLatex" => "m \\ddot{x} + \\mu \\dot{x} + k x = 0",
            "description" => "Canonical second-order dynamical ODE describing a mass on a spring subject to linear viscous damping.",
            "parameters" => Dict{String, Any}(
                "mass" => Dict{String, Any}("name" => "Mass", "symbol" => "m", "default" => 1.0, "min" => 0.1, "max" => 10.0, "unit" => "kg"),
                "damping" => Dict{String, Any}("name" => "Damping", "symbol" => "μ", "default" => 0.4, "min" => 0.0, "max" => 2.0, "unit" => "N·s/m"),
                "stiffness" => Dict{String, Any}("name" => "Stiffness", "symbol" => "k", "default" => 4.0, "min" => 0.5, "max" => 20.0, "unit" => "N/m")
            ),
            "domain" => Dict{String, Any}("x" => [0.0, 1.0], "t" => [0.0, 10.0]),
            "analyticalAvailable" => true,
            "referenceSolver" => "Characteristic Underdamped ODE Exact Solution"
        )
    ]
end

function list_experiments()
    db = AxiomDB.get_db()
    rows = DBInterface.execute(db, "SELECT e.id, e.project_id, e.name, e.equation_id, e.type, e.status, e.config_json, e.created_at, e.completed_at, r.metrics_json FROM experiments e LEFT JOIN results r ON e.id = r.experiment_id ORDER BY e.created_at DESC")
    
    items = []
    for r in rows
        config_obj = try JSON3.read(r.config_json, Dict{String, Any}) catch; Dict{String, Any}() end
        metrics_obj = if r.metrics_json !== nothing && !ismissing(r.metrics_json)
            try JSON3.read(r.metrics_json, Dict{String, Any}) catch; nothing end
        else
            nothing
        end
        
        push!(items, Dict{String, Any}(
            "id" => r.id,
            "name" => r.name,
            "equationId" => r.equation_id,
            "type" => r.type,
            "status" => r.status,
            "createdAt" => r.created_at,
            "completedAt" => r.completed_at,
            "config" => config_obj,
            "metrics" => metrics_obj
        ))
    end
    return items
end

function get_experiment(exp_id::String)
    db = AxiomDB.get_db()
    rows = DBInterface.execute(db, "SELECT e.id, e.project_id, e.name, e.equation_id, e.type, e.status, e.config_json, e.created_at, e.completed_at, r.result_json FROM experiments e LEFT JOIN results r ON e.id = r.experiment_id WHERE e.id = ?", (exp_id,))
    
    for r in rows
        config_obj = try JSON3.read(r.config_json, Dict{String, Any}) catch; Dict{String, Any}() end
        result_obj = if r.result_json !== nothing && !ismissing(r.result_json)
            try JSON3.read(r.result_json, Dict{String, Any}) catch; nothing end
        else
            nothing
        end
        
        return Dict{String, Any}(
            "id" => r.id,
            "name" => r.name,
            "equationId" => r.equation_id,
            "type" => r.type,
            "status" => r.status,
            "createdAt" => r.created_at,
            "completedAt" => r.completed_at,
            "config" => config_obj,
            "result" => result_obj
        )
    end
    return nothing
end

function create_experiment(req_body::Dict{String, Any})
    exp_id = string(UUIDs.uuid4())
    name = String(get(req_body, "name", "Experiment-" * string(Dates.now())[1:10]))
    eq_id = String(get(req_body, "equationId", "heat_1d"))
    exp_type = String(get(req_body, "type", "forward"))
    status = "draft"
    now_str = string(Dates.now())
    config_json = JSON3.write(req_body)
    
    db = AxiomDB.get_db()
    DBInterface.execute(db, "INSERT INTO experiments (id, project_id, name, equation_id, type, status, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (exp_id, "default", name, eq_id, exp_type, status, config_json, now_str)
    )
    AxiomDB.log_audit_event("EXPERIMENT_CREATED", JSON3.write(Dict("id" => exp_id, "name" => name, "equationId" => eq_id)))
    
    return Dict{String, Any}(
        "id" => exp_id,
        "name" => name,
        "equationId" => eq_id,
        "type" => exp_type,
        "status" => status,
        "createdAt" => now_str,
        "config" => req_body
    )
end

function run_experiment_task(exp_id::String, config::Dict{String, Any})
    CANCEL_FLAGS[exp_id] = Ref(false)
    db = AxiomDB.get_db()
    DBInterface.execute(db, "UPDATE experiments SET status = 'running' WHERE id = ?", (exp_id,))
    broadcast_event(exp_id, "STATUS_CHANGE", Dict{String, Any}("status" => "running"))
    
    task = @async begin
        try
            exp_type = String(get(config, "type", "forward"))
            
            if exp_type == "inverse"
                # Inverse problem run
                inv_config = Dict{String, Any}(
                    "trueValue" => get(get(config, "inverse", Dict{String, Any}()), "trueValue", 0.1),
                    "initialGuess" => get(get(config, "inverse", Dict{String, Any}()), "initialGuess", 0.3),
                    "sensorCount" => get(get(config, "inverse", Dict{String, Any}()), "sensorCount", 120),
                    "noiseStd" => get(get(config, "inverse", Dict{String, Any}()), "noiseStd", 0.01),
                    "steps" => get(get(config, "training", Dict{String, Any}()), "steps", 200),
                    "learningRate" => get(get(config, "training", Dict{String, Any}()), "learningRate", 0.005),
                    "seed" => get(get(config, "training", Dict{String, Any}()), "seed", 42)
                )
                
                result = InverseEstimator.run_inverse_estimation(
                    inv_config;
                    on_progress = (point) -> begin
                        broadcast_event(exp_id, "TRAINING_STEP", point)
                    end,
                    is_cancelled = () -> CANCEL_FLAGS[exp_id][]
                )
                
                if CANCEL_FLAGS[exp_id][]
                    DBInterface.execute(db, "UPDATE experiments SET status = 'stopped' WHERE id = ?", (exp_id,))
                    broadcast_event(exp_id, "STATUS_CHANGE", Dict{String, Any}("status" => "stopped"))
                    return
                end
                
                now_str = string(Dates.now())
                res_json = JSON3.write(result)
                metrics_json = JSON3.write(Dict{String, Any}(
                    "estimatedValue" => result["estimatedValue"],
                    "relativeError" => result["relativeError"],
                    "status" => result["status"]
                ))
                
                DBInterface.execute(db, "INSERT OR REPLACE INTO results (experiment_id, status, metrics_json, result_json, created_at) VALUES (?, ?, ?, ?, ?)",
                    (exp_id, result["status"], metrics_json, res_json, now_str)
                )
                DBInterface.execute(db, "UPDATE experiments SET status = 'completed', completed_at = ? WHERE id = ?", (now_str, exp_id))
                broadcast_event(exp_id, "EXPERIMENT_COMPLETED", result)
            else
                # Forward PINN run
                result = PINNTrainer.train_pinn(
                    config;
                    on_progress = (point, elapsed) -> begin
                        point["elapsedTimeSec"] = round(elapsed, digits=2)
                        broadcast_event(exp_id, "TRAINING_STEP", point)
                    end,
                    is_cancelled = () -> CANCEL_FLAGS[exp_id][]
                )
                
                if CANCEL_FLAGS[exp_id][]
                    DBInterface.execute(db, "UPDATE experiments SET status = 'stopped' WHERE id = ?", (exp_id,))
                    broadcast_event(exp_id, "STATUS_CHANGE", Dict{String, Any}("status" => "stopped"))
                    return
                end
                
                now_str = string(Dates.now())
                res_json = JSON3.write(result)
                metrics_json = JSON3.write(result["metrics"])
                
                DBInterface.execute(db, "INSERT OR REPLACE INTO results (experiment_id, status, metrics_json, result_json, created_at) VALUES (?, ?, ?, ?, ?)",
                    (exp_id, result["status"], metrics_json, res_json, now_str)
                )
                DBInterface.execute(db, "UPDATE experiments SET status = 'completed', completed_at = ? WHERE id = ?", (now_str, exp_id))
                broadcast_event(exp_id, "EXPERIMENT_COMPLETED", result)
            end
        catch e
            @error "Experiment execution failed" exception=(e, catch_backtrace())
            DBInterface.execute(db, "UPDATE experiments SET status = 'failed' WHERE id = ?", (exp_id,))
            broadcast_event(exp_id, "STATUS_CHANGE", Dict{String, Any}("status" => "failed", "error" => string(e)))
        end
    end
    RUNNING_TASKS[exp_id] = task
    return true
end

function generate_standalone_julia_script(config::Dict{String, Any})
    eq_id = get(config, "equationId", "heat_1d")
    alpha = get(get(config, "parameters", Dict{String, Any}()), "alpha", 0.1)
    steps = get(get(config, "training", Dict{String, Any}()), "steps", 500)
    lr = get(get(config, "training", Dict{String, Any}()), "learningRate", 0.005)
    
    return """
    # ==============================================================================
    # Axiom Scientific AI Laboratory — Standalone Reproducibility Script
    # Generated: $(string(Dates.now()))
    # Problem: $(eq_id) | Diffusivity α = $(alpha)
    # ==============================================================================
    using Lux, Random, ComponentArrays, Zygote, Optimisers, LinearAlgebra

    println("Initializing Axiom PINN standalone replication...")
    rng = Random.default_rng()
    Random.seed!(rng, 42)

    # 1. Architecture
    model = Chain(
        Dense(2 => 32, tanh),
        Dense(32 => 32, tanh),
        Dense(32 => 32, tanh),
        Dense(32 => 1)
    )
    ps, st = Lux.setup(rng, model)
    ps_ca = ComponentArray(ps)

    # 2. Domain & Hyperparameters
    alpha = Float32($(alpha))
    total_steps = $(steps)
    lr = Float32($(lr))
    N_r = 400
    N_b = 64
    N_0 = 64

    # 3. Collocation Points
    x_col = rand(rng, Float32, N_r)
    t_col = rand(rng, Float32, N_r)
    t_bc = rand(rng, Float32, N_b)
    x_ic = rand(rng, Float32, N_0)
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

    X_bc0 = vcat(transpose(zeros(Float32, N_b)), transpose(t_bc))
    X_bc1 = vcat(transpose(ones(Float32, N_b)), transpose(t_bc))
    X_ic = vcat(transpose(x_ic), transpose(zeros(Float32, N_0)))

    # 4. Optimization
    opt = Optimisers.Adam(lr)
    opt_st = Optimisers.setup(opt, ps_ca)

    function total_loss(p)
        u_all, _ = Lux.apply(model, X_res_all, p, st)
        u_c = u_all[1, 1:N_r]
        u_tp = u_all[1, N_r+1:2N_r]
        u_tm = u_all[1, 2N_r+1:3N_r]
        u_xp = u_all[1, 3N_r+1:4N_r]
        u_xm = u_all[1, 4N_r+1:5N_r]
        
        ut = (u_tp .- u_tm) .* inv_2eps
        uxx = (u_xp .- 2.0f0 .* u_c .+ u_xm) .* inv_eps2
        res = ut .- alpha .* uxx
        loss_r = sum(abs2, res) / Float32(N_r)
        
        u_bc0, _ = Lux.apply(model, X_bc0, p, st)
        u_bc1, _ = Lux.apply(model, X_bc1, p, st)
        loss_b = (sum(abs2, u_bc0) + sum(abs2, u_bc1)) / Float32(2 * N_b)
        
        u_0, _ = Lux.apply(model, X_ic, p, st)
        loss_0 = sum(abs2, vec(u_0) .- u_ic_true) / Float32(N_0)
        
        return loss_r + 20.0f0 * loss_b + 20.0f0 * loss_0
    end

    p_curr = ps_ca
    println("Beginning optimization for \$total_steps steps...")
    for s in 1:total_steps
        loss_val, back = Zygote.pullback(total_loss, p_curr)
        grads = back(1.0f0)[1]
        global opt_st, p_curr = Optimisers.update(opt_st, p_curr, grads)
        if s % 50 == 0 || s == 1
            println("Step \$s | Loss: \$loss_val")
        end
    end

    # 5. Verification against Analytical Oracle
    test_x = Float32[0.25, 0.5, 0.75]
    test_t = Float32[0.5, 0.5, 0.5]
    X_test = vcat(transpose(test_x), transpose(test_t))
    u_pred, _ = Lux.apply(model, X_test, p_curr, st)

    for i in 1:3
        u_exact = exp(-alpha * (Float32(pi)^2) * test_t[i]) * sin(Float32(pi) * test_x[i])
        println("Point x=\$(test_x[i]), t=\$(test_t[i]) => PINN: \$(u_pred[i]), Exact: \$u_exact, Error: \$(abs(u_pred[i] - u_exact))")
    end
    println("Replication complete successfully!")
    """
end

end # module ExperimentRoutes
