module Wave1D

export analytical_solution, initial_condition, initial_velocity, boundary_condition, pde_residual

"""
    analytical_solution(x, t; c=1.0)

Analytical solution u(x, t) = cos(c*π*t) * sin(π*x) for wave equation with u(x,0)=sin(πx), ut(x,0)=0.
"""
function analytical_solution(x, t; c=1.0)
    return cos(c * pi * t) * sin(pi * x)
end

function initial_condition(x)
    return sin(pi * x)
end

function initial_velocity(x)
    return 0.0
end

function boundary_condition(x, t)
    return 0.0
end

"""
    pde_residual(utt, uxx; c=1.0)

Wave equation residual: r = utt - c² * uxx.
"""
function pde_residual(utt, uxx; c=1.0)
    return utt - (c^2) * uxx
end

end # module Wave1D
