using Test
using LinearAlgebra

include("../src/AxiomScientificCore.jl")
using .AxiomScientificCore

@testset "Axiom Scientific Core Test Suite" begin
    
    @testset "1. Analytical Derivatives & Physics Oracle" begin
        alpha = 0.1
        x = 0.35
        t = 0.25
        
        u = Heat1D.analytical_solution(x, t; alpha=alpha)
        ut = Heat1D.exact_ut(x, t; alpha=alpha)
        ux = Heat1D.exact_ux(x, t; alpha=alpha)
        uxx = Heat1D.exact_uxx(x, t; alpha=alpha)
        
        # Verify PDE residual is identically zero: ut - alpha * uxx == 0
        residual = Heat1D.pde_residual(ut, uxx; alpha=alpha)
        @test abs(residual) < 1e-14
        
        # Verify boundary and initial conditions
        @test Heat1D.analytical_solution(0.0, 0.5; alpha=alpha) == 0.0
        @test abs(Heat1D.analytical_solution(1.0, 0.5; alpha=alpha)) < 1e-15
        @test isapprox(Heat1D.analytical_solution(0.5, 0.0; alpha=alpha), 1.0, atol=1e-12)
    end
    
    @testset "2. Reference Solvers & Discretization" begin
        grid_x = collect(range(0.0, 1.0, length=21))
        grid_t = collect(range(0.0, 0.1, length=11))
        alpha = 0.1
        
        # Analytical reference
        ref_res = ReferenceSolver.solve_reference("heat_1d", Dict{String, Any}("alpha" => alpha), grid_x, grid_t)
        @test ref_res.status == "success"
        @test size(ref_res.solution) == (11, 21)
        
        # Numerical Method of Lines (MOL) Runge-Kutta solver
        u_num = ReferenceSolver.solve_numerical_heat_mol(grid_x, grid_t, alpha)
        @test size(u_num) == (11, 21)
        
        # Compare numerical MOL solver against analytical solution: relative L2 should be < 0.005
        diff = norm(u_num .- ref_res.solution) / norm(ref_res.solution)
        @test diff < 0.005
    end
    
    @testset "3. Neural Network Architectures & Parameters" begin
        layers = [2, 32, 1]
        expected_params = (2 * 32 + 32) + (32 * 1 + 1)
        @test MLPModel.count_parameters(layers) == expected_params
        
        model_obj = MLPModel.build_mlp(layers; activation="tanh", seed=42)
        @test length(model_obj.ps) == expected_params
    end
    
    @testset "4. Evaluation Metrics & Validation Protocol" begin
        Nx, Nt = 10, 10
        u_ref = ones(Float64, Nt, Nx)
        u_pred = ones(Float64, Nt, Nx)
        u_res = zeros(Float64, Nt, Nx)
        
        # Zero error case
        m_zero = EvaluationMetrics.calculate_metrics(u_pred, u_ref, u_res, 0.0, 0.0)
        @test m_zero.mae == 0.0
        @test m_zero.rmse == 0.0
        @test m_zero.relative_l2 == 0.0
        
        val_status = EvaluationMetrics.determine_validation_status(m_zero)
        @test val_status.status == "passed"
        
        # Offset error case
        u_pred_offset = u_ref .+ 0.2
        m_offset = EvaluationMetrics.calculate_metrics(u_pred_offset, u_ref, u_res, 0.2, 0.2)
        @test isapprox(m_offset.mae, 0.2, atol=1e-8)
        @test isapprox(m_offset.relative_l2, 0.2, atol=1e-8)
    end
    
    @testset "5. PINN Training Execution" begin
        config = Dict{String, Any}(
            "equationId" => "heat_1d",
            "parameters" => Dict{String, Any}("alpha" => 0.1),
            "domain" => Dict{String, Any}("xMin" => 0.0, "xMax" => 1.0, "tMin" => 0.0, "tMax" => 1.0),
            "network" => Dict{String, Any}("layers" => [2, 16, 1], "activation" => "tanh"),
            "training" => Dict{String, Any}(
                "learningRate" => 0.01,
                "steps" => 20,
                "collocationPoints" => 100,
                "boundaryPoints" => 20,
                "initialPoints" => 20,
                "logInterval" => 10,
                "seed" => 42
            ),
            "evaluation" => Dict{String, Any}("gridX" => 11, "gridT" => 11)
        )
        
        result = PINNTrainer.train_pinn(config)
        @test haskey(result, "status")
        @test haskey(result, "metrics")
        @test haskey(result, "predicted")
        @test length(result["predicted"]) == 11
        @test length(result["predicted"][1]) == 11
        @test result["metrics"]["optimizerSteps"] == 20
        @test result["metrics"]["parametersCount"] == MLPModel.count_parameters([2, 16, 1])
    end
    
    @testset "6. Inverse Parameter Estimation" begin
        inv_config = Dict{String, Any}(
            "trueValue" => 0.1,
            "initialGuess" => 0.2,
            "sensorCount" => 30,
            "noiseStd" => 0.005,
            "steps" => 20,
            "learningRate" => 0.01,
            "seed" => 42
        )
        
        inv_res = InverseEstimator.run_inverse_estimation(inv_config)
        @test haskey(inv_res, "estimatedValue")
        @test haskey(inv_res, "relativeError")
        @test length(inv_res["convergenceHistory"]) > 0
    end
end
