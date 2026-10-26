# Seed script to populate real scientific benchmarks in Axiom SQLite database
include("../services/api/src/db.jl")
include("../services/api/src/routes/experiments.jl")

using .AxiomDB
using .ExperimentRoutes
using JSON3
using Dates
using DBInterface
using SQLite

println("Initializing database and seeding benchmark experiments...")
db = AxiomDB.init_db()

# 1. Forward Heat Diffusion Benchmark
config_forward = Dict{String, Any}(
    "name" => "1D Heat Diffusion Reference Benchmark",
    "equationId" => "heat_1d",
    "type" => "forward",
    "parameters" => Dict{String, Any}("alpha" => 0.1),
    "domain" => Dict{String, Any}("xMin" => 0.0, "xMax" => 1.0, "tMin" => 0.0, "tMax" => 1.0),
    "network" => Dict{String, Any}("layers" => [2, 32, 32, 1], "activation" => "tanh"),
    "training" => Dict{String, Any}(
        "learningRate" => 0.005,
        "steps" => 60,
        "collocationPoints" => 250,
        "boundaryPoints" => 40,
        "initialPoints" => 40,
        "logInterval" => 10,
        "seed" => 42
    ),
    "evaluation" => Dict{String, Any}("gridX" => 25, "gridT" => 25)
)

exp_forward = ExperimentRoutes.create_experiment(config_forward)
println("Running forward experiment computation...")
result_forward = ExperimentRoutes.PINNTrainer.train_pinn(config_forward)

now_str = string(Dates.now())
res_json = JSON3.write(result_forward)
metrics_json = JSON3.write(result_forward["metrics"])

DBInterface.execute(db, "INSERT OR REPLACE INTO results (experiment_id, status, metrics_json, result_json, created_at) VALUES (?, ?, ?, ?, ?)",
    (exp_forward["id"], result_forward["status"], metrics_json, res_json, now_str)
)
DBInterface.execute(db, "UPDATE experiments SET status = 'completed', completed_at = ? WHERE id = ?", (now_str, exp_forward["id"]))
println("Forward benchmark seeded: ", exp_forward["id"], " status: ", result_forward["status"])

# 2. Inverse Parameter Estimation Benchmark
config_inverse = Dict{String, Any}(
    "name" => "Thermal Diffusivity Discovery (Inverse)",
    "equationId" => "heat_1d",
    "type" => "inverse",
    "inverse" => Dict{String, Any}(
        "targetParameter" => "alpha",
        "trueValue" => 0.1,
        "initialGuess" => 0.3,
        "sensorCount" => 50,
        "noiseStd" => 0.005
    ),
    "parameters" => Dict{String, Any}("alpha" => 0.1),
    "domain" => Dict{String, Any}("xMin" => 0.0, "xMax" => 1.0, "tMin" => 0.0, "tMax" => 1.0),
    "network" => Dict{String, Any}("layers" => [2, 32, 32, 1], "activation" => "tanh"),
    "training" => Dict{String, Any}(
        "learningRate" => 0.005,
        "steps" => 40,
        "seed" => 42
    ),
    "evaluation" => Dict{String, Any}("gridX" => 20, "gridT" => 20)
)

exp_inverse = ExperimentRoutes.create_experiment(config_inverse)
println("Running inverse parameter discovery...")
inv_run_cfg = Dict{String, Any}(
    "trueValue" => 0.1,
    "initialGuess" => 0.3,
    "sensorCount" => 50,
    "noiseStd" => 0.005,
    "steps" => 40,
    "learningRate" => 0.005,
    "seed" => 42
)
result_inv = ExperimentRoutes.InverseEstimator.run_inverse_estimation(inv_run_cfg)

now_str_inv = string(Dates.now())
res_inv_json = JSON3.write(result_inv)
metrics_inv_json = JSON3.write(Dict{String, Any}(
    "estimatedValue" => result_inv["estimatedValue"],
    "relativeError" => result_inv["relativeError"],
    "status" => result_inv["status"]
))

DBInterface.execute(db, "INSERT OR REPLACE INTO results (experiment_id, status, metrics_json, result_json, created_at) VALUES (?, ?, ?, ?, ?)",
    (exp_inverse["id"], result_inv["status"], metrics_inv_json, res_inv_json, now_str_inv)
)
DBInterface.execute(db, "UPDATE experiments SET status = 'completed', completed_at = ? WHERE id = ?", (now_str_inv, exp_inverse["id"]))
println("Inverse benchmark seeded: ", exp_inverse["id"], " recovered alpha: ", result_inv["estimatedValue"], " rel err: ", result_inv["relativeError"])

println("Seeding completed successfully!")
