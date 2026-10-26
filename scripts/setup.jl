# Axiom Environment Setup Script
using Pkg

println("="^60)
println("Axiom Scientific AI Laboratory — Environment Setup")
println("="^60)

root_dir = normpath(joinpath(@__DIR__, ".."))

println("\n[1/3] Instantiating packages/scientific-core...")
Pkg.activate(joinpath(root_dir, "packages", "scientific-core"))
Pkg.instantiate()

println("\n[2/3] Instantiating services/api...")
Pkg.activate(joinpath(root_dir, "services", "api"))
Pkg.instantiate()

println("\n[3/3] Initializing Database & Seeding Baseline Examples...")
include(joinpath(root_dir, "scripts", "migrate.jl"))
include(joinpath(root_dir, "scripts", "seed_examples.jl"))

println("\nSetup completed successfully! Run `julia scripts/check_backend.jl` to verify.")
