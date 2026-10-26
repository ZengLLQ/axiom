module AxiomScientificCore

include("equations/heat_1d.jl")
include("equations/burgers_1d.jl")
include("equations/wave_1d.jl")
include("equations/harmonic_oscillator.jl")

include("solvers/reference_solver.jl")
include("models/mlp.jl")
include("losses/pinn_losses.jl")
include("evaluation/metrics.jl")
include("pinn/trainer.jl")
include("inverse/estimator.jl")

using .Heat1D
using .Burgers1D
using .Wave1D
using .HarmonicOscillator
using .ReferenceSolver
using .MLPModel
using .PINNLosses
using .EvaluationMetrics
using .PINNTrainer
using .InverseEstimator

export Heat1D, Burgers1D, Wave1D, HarmonicOscillator
export ReferenceSolver, solve_reference, solve_numerical_heat_mol
export MLPModel, build_mlp, count_parameters
export PINNLosses
export EvaluationMetrics, calculate_metrics, determine_validation_status
export PINNTrainer, train_pinn
export InverseEstimator, run_inverse_estimation

end # module AxiomScientificCore
