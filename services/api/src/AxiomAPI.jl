module AxiomAPI

using HTTP
using JSON3
using Sockets
using Dates
using DBInterface
using SQLite

include("db.jl")
include("routes/experiments.jl")

using .AxiomDB
using .ExperimentRoutes

export start_server, stop_server

const SERVER_REF = Ref{Any}(nothing)

function cors_headers()
    return [
        "Access-Control-Allow-Origin" => "*",
        "Access-Control-Allow-Methods" => "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers" => "Content-Type, Authorization, Cache-Control",
        "Access-Control-Max-Age" => "86400"
    ]
end

function handle_http(req::HTTP.Request)
    if req.method == "OPTIONS"
        return HTTP.Response(204, cors_headers(), "")
    end
    
    path = split(req.target, '?')[1]
    
    # 1. Health
    if req.method == "GET" && (path == "/health" || path == "/api/v1/health")
        return ExperimentRoutes.json_response(Dict(
            "status" => "healthy",
            "service" => "Axiom Scientific AI Laboratory",
            "version" => "1.0.0",
            "juliaVersion" => string(VERSION),
            "timestamp" => string(Dates.now())
        ))
    end
    
    # 2. Capabilities
    if req.method == "GET" && path == "/api/v1/capabilities"
        return ExperimentRoutes.json_response(ExperimentRoutes.get_capabilities())
    end
    
    # 3. Equations
    if req.method == "GET" && path == "/api/v1/equations"
        return ExperimentRoutes.json_response(ExperimentRoutes.get_equations())
    end
    
    if req.method == "GET" && startswith(path, "/api/v1/equations/")
        eq_id = replace(path, "/api/v1/equations/" => "")
        eqs = ExperimentRoutes.get_equations()
        for eq in eqs
            if eq["id"] == eq_id
                return ExperimentRoutes.json_response(eq)
            end
        end
        return ExperimentRoutes.error_response("Equation not found: $eq_id"; status=404)
    end
    
    # 4. List Experiments
    if req.method == "GET" && path == "/api/v1/experiments"
        return ExperimentRoutes.json_response(ExperimentRoutes.list_experiments())
    end
    
    # 5. Create Experiment
    if req.method == "POST" && path == "/api/v1/experiments"
        body_str = String(req.body)
        body = isempty(body_str) ? Dict{String, Any}() : JSON3.read(body_str, Dict{String, Any})
        created = ExperimentRoutes.create_experiment(body)
        return ExperimentRoutes.json_response(created; status=201)
    end
    
    # 6. Quick Solve (Fast slice execution for live UI interactivity)
    if req.method == "POST" && path == "/api/v1/experiments/quick-solve"
        body_str = String(req.body)
        body = isempty(body_str) ? Dict{String, Any}() : JSON3.read(body_str, Dict{String, Any})
        created = ExperimentRoutes.create_experiment(body)
        exp_id = created["id"]
        
        # Run synchronously or wait for quick result
        res = ExperimentRoutes.PINNTrainer.train_pinn(body)
        db = AxiomDB.get_db()
        now_str = string(Dates.now())
        res_json = JSON3.write(res)
        metrics_json = JSON3.write(res["metrics"])
        DBInterface.execute(db, "INSERT OR REPLACE INTO results (experiment_id, status, metrics_json, result_json, created_at) VALUES (?, ?, ?, ?, ?)",
            (exp_id, res["status"], metrics_json, res_json, now_str)
        )
        DBInterface.execute(db, "UPDATE experiments SET status = 'completed', completed_at = ? WHERE id = ?", (now_str, exp_id))
        
        return ExperimentRoutes.json_response(Dict(
            "experiment" => created,
            "result" => res
        ))
    end
    
    # 7. Inverse Estimation
    if req.method == "POST" && path == "/api/v1/inverse/estimate"
        body_str = String(req.body)
        body = isempty(body_str) ? Dict{String, Any}() : JSON3.read(body_str, Dict{String, Any})
        res = ExperimentRoutes.InverseEstimator.run_inverse_estimation(body)
        return ExperimentRoutes.json_response(res)
    end
    
    # 8. Single Experiment Operations
    m_exp = match(r"^/api/v1/experiments/([a-zA-Z0-9\-]+)(/.*)?$", path)
    if m_exp !== nothing
        exp_id = String(m_exp.captures[1])
        subpath = m_exp.captures[2] === nothing ? "" : m_exp.captures[2]
        
        # GET /api/v1/experiments/{id}
        if req.method == "GET" && isempty(subpath)
            exp = ExperimentRoutes.get_experiment(exp_id)
            if exp === nothing
                return ExperimentRoutes.error_response("Experiment not found: $exp_id"; status=404)
            end
            return ExperimentRoutes.json_response(exp)
        end
        
        # POST /api/v1/experiments/{id}/start
        if req.method == "POST" && subpath == "/start"
            exp = ExperimentRoutes.get_experiment(exp_id)
            if exp === nothing
                return ExperimentRoutes.error_response("Experiment not found: $exp_id"; status=404)
            end
            ExperimentRoutes.run_experiment_task(exp_id, exp["config"])
            return ExperimentRoutes.json_response(Dict("message" => "Experiment job started", "id" => exp_id, "status" => "running"))
        end
        
        # POST /api/v1/experiments/{id}/stop
        if req.method == "POST" && subpath == "/stop"
            if haskey(ExperimentRoutes.CANCEL_FLAGS, exp_id)
                ExperimentRoutes.CANCEL_FLAGS[exp_id][] = true
            end
            db = AxiomDB.get_db()
            DBInterface.execute(db, "UPDATE experiments SET status = 'stopped' WHERE id = ?", (exp_id,))
            return ExperimentRoutes.json_response(Dict("message" => "Experiment stopped", "id" => exp_id, "status" => "stopped"))
        end
        
        # GET /api/v1/experiments/{id}/result
        if req.method == "GET" && subpath == "/result"
            exp = ExperimentRoutes.get_experiment(exp_id)
            if exp === nothing || exp["result"] === nothing
                return ExperimentRoutes.error_response("Result not ready or not found for experiment: $exp_id"; status=404)
            end
            return ExperimentRoutes.json_response(exp["result"])
        end
        
        # GET /api/v1/experiments/{id}/export/{format}
        if req.method == "GET" && startswith(subpath, "/export/")
            fmt = replace(subpath, "/export/" => "")
            exp = ExperimentRoutes.get_experiment(exp_id)
            if exp === nothing
                return ExperimentRoutes.error_response("Experiment not found"; status=404)
            end
            
            if fmt == "julia"
                script_code = ExperimentRoutes.generate_standalone_julia_script(exp["config"])
                headers = [
                    "Content-Type" => "text/plain; charset=utf-8",
                    "Content-Disposition" => "attachment; filename=\"axiom_reproduce_$(exp_id[1:8]).jl\"",
                    "Access-Control-Allow-Origin" => "*"
                ]
                return HTTP.Response(200, headers, script_code)
            elseif fmt == "json"
                headers = [
                    "Content-Type" => "application/json",
                    "Content-Disposition" => "attachment; filename=\"axiom_manifest_$(exp_id[1:8]).json\"",
                    "Access-Control-Allow-Origin" => "*"
                ]
                manifest_payload = Dict(
                    "axiomVersion" => "1.0.0",
                    "experiment" => exp,
                    "exportedAt" => string(Dates.now())
                )
                return HTTP.Response(200, headers, JSON3.write(manifest_payload))
            elseif fmt == "csv"
                # Generate CSV of evaluation points
                res = exp["result"]
                csv_lines = ["t,x,u_pred,u_ref,abs_error,residual"]
                if res !== nothing && haskey(res, "grid")
                    grid_x = res["grid"]["x"]
                    grid_t = res["grid"]["t"]
                    for (i, t_val) in enumerate(grid_t)
                        for (j, x_val) in enumerate(grid_x)
                            up = res["predicted"][i][j]
                            ur = res["reference"][i][j]
                            err = res["absoluteError"][i][j]
                            rf = res["residualField"][i][j]
                            push!(csv_lines, "$t_val,$x_val,$up,$ur,$err,$rf")
                        end
                    end
                end
                headers = [
                    "Content-Type" => "text/csv; charset=utf-8",
                    "Content-Disposition" => "attachment; filename=\"axiom_eval_$(exp_id[1:8]).csv\"",
                    "Access-Control-Allow-Origin" => "*"
                ]
                return HTTP.Response(200, headers, join(csv_lines, "\n"))
            else
                return ExperimentRoutes.error_response("Unsupported export format: $fmt")
            end
        end
        
        # GET /api/v1/experiments/{id}/events (SSE)
        if req.method == "GET" && subpath == "/events"
            ch = Channel{String}(32)
            if !haskey(ExperimentRoutes.ACTIVE_CHANNELS, exp_id)
                ExperimentRoutes.ACTIVE_CHANNELS[exp_id] = Channel{String}[]
            end
            push!(ExperimentRoutes.ACTIVE_CHANNELS[exp_id], ch)
            
            # Send initial ping event
            put!(ch, "event: CONNECTED\ndata: {\"status\":\"connected\",\"id\":\"$exp_id\"}\n\n")
            
            headers = [
                "Content-Type" => "text/event-stream",
                "Cache-Control" => "no-cache",
                "Connection" => "keep-alive",
                "Access-Control-Allow-Origin" => "*"
            ]
            
            # Stream channel to HTTP response stream
            return HTTP.Response(200, headers, HTTP.Stream(req) do stream
                try
                    while isopen(ch)
                        msg = take!(ch)
                        write(stream, msg)
                    end
                catch
                finally
                    filter!(c -> c !== ch, ExperimentRoutes.ACTIVE_CHANNELS[exp_id])
                end
            end)
        end
    end
    
    return ExperimentRoutes.error_response("Endpoint not found: $(req.method) $path"; status=404)
end

function start_server(port=8080)
    AxiomDB.init_db()
    println("=" ^ 60)
    println("Axiom Scientific AI Laboratory API Service")
    println("Listening on http://127.0.0.1:$port")
    println("=" ^ 60)
    
    server = HTTP.serve!(handle_http, "127.0.0.1", port)
    SERVER_REF[] = server
    return server
end

function stop_server()
    if SERVER_REF[] !== nothing
        close(SERVER_REF[])
        SERVER_REF[] = nothing
    end
end

if abspath(PROGRAM_FILE) == @__FILE__
    port = parse(Int, get(ENV, "PORT", "8080"))
    server = start_server(port)
    wait(server)
end

end # module AxiomAPI
