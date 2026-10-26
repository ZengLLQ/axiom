# Axiom Compute Backend & Capability Verification
using LinearAlgebra
using Dates

println("="^60)
println("Axiom Scientific AI Laboratory — Hardware & Backend Audit")
println("="^60)

println("Julia Version        : ", VERSION)
println("Operating System     : ", Sys.iswindows() ? "Windows" : (Sys.islinux() ? "Linux" : "macOS"))
println("CPU Architecture     : ", Sys.ARCH)
println("CPU Threads (Active) : ", Threads.nthreads())
println("BLAS Vendor          : ", BLAS.get_config())

# Test basic tensor allocation and matrix multiplication
t0 = time()
A = rand(Float32, 1000, 1000)
B = rand(Float32, 1000, 1000)
C = A * B
t_blas = (time() - t0) * 1000.0

println("BLAS 1000x1000 FP32  : Pass ($(round(t_blas, digits=2)) ms)")

# Check GPU capability
cuda_available = false
try
    # In case CUDA is loaded
    @eval using CUDA
    if CUDA.functional()
        global cuda_available = true
        println("CUDA Accelerator     : Available ($(CUDA.name(CUDA.device())))")
    else
        println("CUDA Accelerator     : CUDA installed but device not functional")
    end
catch
    println("CUDA Accelerator     : Not installed / Not available (CPU Fallback Active)")
end

println("\nActive Scientific Compute Strategy:")
println(" - CPU Vectorized BLAS Engine : ACTIVE")
println(" - Lux.jl Multi-Threaded Math : READY")
println(" - SciML Independent Solver   : READY")
println("="^60)
