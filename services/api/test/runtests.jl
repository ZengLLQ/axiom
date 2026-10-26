using Test
using HTTP
using JSON3

include("../src/AxiomAPI.jl")
using .AxiomAPI

@testset "Axiom API Service Test Suite" begin
    # Test HTTP handler directly with mock requests
    
    @testset "1. Health Endpoint" begin
        req = HTTP.Request("GET", "/health")
        resp = AxiomAPI.handle_http(req)
        @test resp.status == 200
        data = JSON3.read(String(resp.body), Dict{String, Any})
        @test data["status"] == "healthy"
        @test data["service"] == "Axiom Scientific AI Laboratory"
    end
    
    @testset "2. Capabilities Endpoint" begin
        req = HTTP.Request("GET", "/api/v1/capabilities")
        resp = AxiomAPI.handle_http(req)
        @test resp.status == 200
        data = JSON3.read(String(resp.body), Dict{String, Any})
        @test "heat_1d" in data["supportedEquations"]
        @test "adam" in data["supportedOptimizers"]
    end
    
    @testset "3. Equations Catalog" begin
        req = HTTP.Request("GET", "/api/v1/equations")
        resp = AxiomAPI.handle_http(req)
        @test resp.status == 200
        eqs = JSON3.read(String(resp.body), Vector{Dict{String, Any}})
        @test length(eqs) >= 4
        
        # Test single equation
        req_single = HTTP.Request("GET", "/api/v1/equations/heat_1d")
        resp_single = AxiomAPI.handle_http(req_single)
        @test resp_single.status == 200
        eq = JSON3.read(String(resp_single.body), Dict{String, Any})
        @test eq["id"] == "heat_1d"
    end
    
    @testset "4. Experiment Creation & Retrieval" begin
        payload = JSON3.write(Dict{String, Any}(
            "name" => "API Test Heat Experiment",
            "equationId" => "heat_1d",
            "type" => "forward",
            "parameters" => Dict("alpha" => 0.1),
            "domain" => Dict("xMin" => 0.0, "xMax" => 1.0, "tMin" => 0.0, "tMax" => 1.0),
            "network" => Dict("layers" => [2, 16, 1], "activation" => "tanh"),
            "training" => Dict(
                "learningRate" => 0.01,
                "steps" => 10,
                "collocationPoints" => 50,
                "boundaryPoints" => 10,
                "initialPoints" => 10,
                "seed" => 42
            )
        ))
        
        req = HTTP.Request("POST", "/api/v1/experiments", [], Vector{UInt8}(payload))
        resp = AxiomAPI.handle_http(req)
        @test resp.status == 201
        created = JSON3.read(String(resp.body), Dict{String, Any})
        exp_id = created["id"]
        @test !isempty(exp_id)
        
        # Retrieve by ID
        req_get = HTTP.Request("GET", "/api/v1/experiments/$exp_id")
        resp_get = AxiomAPI.handle_http(req_get)
        @test resp_get.status == 200
        retrieved = JSON3.read(String(resp_get.body), Dict{String, Any})
        @test retrieved["name"] == "API Test Heat Experiment"
        
        # Test Export Julia Script
        req_export = HTTP.Request("GET", "/api/v1/experiments/$exp_id/export/julia")
        resp_export = AxiomAPI.handle_http(req_export)
        @test resp_export.status == 200
        script_text = String(resp_export.body)
        @test occursin("Axiom PINN standalone replication", script_text)
    end
    
    @testset "5. Quick Solve Execution" begin
        payload = JSON3.write(Dict{String, Any}(
            "name" => "Quick Solve Test",
            "equationId" => "heat_1d",
            "parameters" => Dict("alpha" => 0.1),
            "domain" => Dict("xMin" => 0.0, "xMax" => 1.0, "tMin" => 0.0, "tMax" => 1.0),
            "network" => Dict("layers" => [2, 16, 1], "activation" => "tanh"),
            "training" => Dict(
                "learningRate" => 0.01,
                "steps" => 10,
                "collocationPoints" => 50,
                "boundaryPoints" => 10,
                "initialPoints" => 10,
                "seed" => 42
            ),
            "evaluation" => Dict("gridX" => 5, "gridT" => 5)
        ))
        
        req = HTTP.Request("POST", "/api/v1/experiments/quick-solve", [], Vector{UInt8}(payload))
        resp = AxiomAPI.handle_http(req)
        @test resp.status == 200
        data = JSON3.read(String(resp.body), Dict{String, Any})
        @test haskey(data, "result")
        @test data["result"]["metrics"]["optimizerSteps"] == 10
    end
end
