using Test
using HTTP
using JSON3
using Sockets

# Include the API service
include(normpath(joinpath(@__DIR__, "..", "..", "services", "api", "src", "AxiomAPI.jl")))
using .AxiomAPI

@testset "Axiom Full-System Integration & E2E Verification Suite" begin
    # 1. Start server on dynamic port
    test_port = 8899
    server = AxiomAPI.start_server(test_port)
    base_url = "http://127.0.0.1:$test_port"

    try
        # 2. Health Check
        health_resp = HTTP.get("$base_url/health")
        @test health_resp.status == 200
        health_data = JSON3.read(String(health_resp.body))
        @test health_data.status == "healthy"
        @test health_data.service == "Axiom Scientific AI Laboratory"

        # 3. Capabilities
        cap_resp = HTTP.get("$base_url/api/v1/capabilities")
        @test cap_resp.status == 200
        cap_data = JSON3.read(String(cap_resp.body))
        @test "heat_1d" in cap_data.supportedEquations
        @test "burgers_1d" in cap_data.supportedEquations
        @test "wave_1d" in cap_data.supportedEquations
        @test "harmonic_oscillator" in cap_data.supportedEquations
        @test cap_data.hardwareBackend == "CPU (Lux Vectorized BLAS Engine)"

        # 4. Equations Library API
        eq_resp = HTTP.get("$base_url/api/v1/equations")
        @test eq_resp.status == 200
        eq_list = JSON3.read(String(eq_resp.body))
        @test length(eq_list) >= 4

        single_eq_resp = HTTP.get("$base_url/api/v1/equations/heat_1d")
        @test single_eq_resp.status == 200
        single_eq = JSON3.read(String(single_eq_resp.body))
        @test single_eq.id == "heat_1d"
        @test single_eq.analyticalAvailable == true

        # 5. Create Experiment
        exp_payload = Dict{String, Any}(
            "name" => "E2E-Integration-Heat1D",
            "equationId" => "heat_1d",
            "parameters" => Dict("alpha" => 0.1),
            "domain" => Dict("xMin" => 0.0, "xMax" => 1.0, "tMin" => 0.0, "tMax" => 1.0),
            "network" => Dict(
                "layers" => [2, 32, 32, 1],
                "activation" => "tanh"
            ),
            "training" => Dict(
                "optimizer" => "adam",
                "learningRate" => 0.005,
                "steps" => 40,
                "collocationPoints" => 150,
                "boundaryPoints" => 32,
                "initialPoints" => 32,
                "logInterval" => 10,
                "seed" => 42,
                "lossWeights" => Dict("lambda_r" => 1.0, "lambda_b" => 20.0, "lambda_0" => 20.0)
            ),
            "evaluation" => Dict(
                "gridX" => 20,
                "gridT" => 20
            )
        )

        create_resp = HTTP.post(
            "$base_url/api/v1/experiments",
            ["Content-Type" => "application/json"],
            JSON3.write(exp_payload)
        )
        @test create_resp.status == 201
        created_exp = JSON3.read(String(create_resp.body))
        exp_id = created_exp.id
        @test length(exp_id) > 10

        # 6. Quick-Solve Execution (End-to-End Scientific Vertical Slice)
        qs_resp = HTTP.post(
            "$base_url/api/v1/experiments/quick-solve",
            ["Content-Type" => "application/json"],
            JSON3.write(exp_payload)
        )
        @test qs_resp.status == 200
        qs_data = JSON3.read(String(qs_resp.body))
        @test haskey(qs_data, "result")
        res = qs_data.result
        @test haskey(res, "metrics")
        @test res.metrics.mae >= 0.0
        @test res.metrics.rmse >= 0.0
        @test res.metrics.relativeL2 >= 0.0
        @test length(res.timeSlices) >= 3
        @test length(res.predicted) == 20
        @test length(res.reference) == 20

        # 7. Query Experiment by ID
        fetch_resp = HTTP.get("$base_url/api/v1/experiments/$exp_id")
        @test fetch_resp.status == 200

        # 8. Query Result for Completed Experiment
        qs_exp_id = qs_data.experiment.id
        res_resp = HTTP.get("$base_url/api/v1/experiments/$qs_exp_id/result")
        @test res_resp.status == 200
        fetched_res = JSON3.read(String(res_resp.body))
        @test fetched_res.metrics.rmse == res.metrics.rmse

        # 9. Verify Reproducibility Exports
        # 9a. Standalone Julia Script
        jl_export = HTTP.get("$base_url/api/v1/experiments/$qs_exp_id/export/julia")
        @test jl_export.status == 200
        jl_script = String(jl_export.body)
        @test occursin("using Lux", jl_script)
        @test occursin("Analytical Oracle", jl_script)

        # 9b. Manifest JSON
        json_export = HTTP.get("$base_url/api/v1/experiments/$qs_exp_id/export/json")
        @test json_export.status == 200
        manifest_obj = JSON3.read(String(json_export.body))
        @test manifest_obj.axiomVersion == "1.0.0"
        @test manifest_obj.experiment.id == qs_exp_id

        # 9c. Evaluation CSV
        csv_export = HTTP.get("$base_url/api/v1/experiments/$qs_exp_id/export/csv")
        @test csv_export.status == 200
        csv_body = String(csv_export.body)
        @test occursin("t,x,u_pred,u_ref,abs_error,residual", csv_body)

        # 10. Inverse Parameter Estimation API
        inv_payload = Dict(
            "trueValue" => 0.1,
            "initialGuess" => 0.25,
            "sensorCount" => 80,
            "noiseStd" => 0.01,
            "steps" => 150,
            "learningRate" => 0.008,
            "seed" => 42
        )
        inv_resp = HTTP.post(
            "$base_url/api/v1/inverse/estimate",
            ["Content-Type" => "application/json"],
            JSON3.write(inv_payload)
        )
        @test inv_resp.status == 200
        inv_data = JSON3.read(String(inv_resp.body))
        @test inv_data.trueValue == 0.1
        @test haskey(inv_data, "estimatedValue")
        @test haskey(inv_data, "convergenceHistory")
        @test length(inv_data.convergenceHistory) > 0
        @test abs(inv_data.estimatedValue - 0.1) < 0.1

    finally
        AxiomAPI.stop_server()
    end
end
