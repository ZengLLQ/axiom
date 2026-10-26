module HarmonicOscillator

export analytical_solution, ode_residual

"""
    analytical_solution(t; m=1.0, mu=0.4, k=4.0)

Analytical underdamped solution for m*ẍ + mu*ẋ + k*x = 0 with x(0) = 1.0, ẋ(0) = 0.0.
"""
function analytical_solution(t; m=1.0, mu=0.4, k=4.0)
    gamma = mu / (2.0 * m)
    omega0_sq = k / m
    if omega0_sq < gamma^2
        # Overdamped fallback
        r1 = -gamma + sqrt(gamma^2 - omega0_sq)
        r2 = -gamma - sqrt(gamma^2 - omega0_sq)
        c1 = -r2 / (r1 - r2)
        c2 = r1 / (r1 - r2)
        return c1 * exp(r1 * t) + c2 * exp(r2 * t)
    end
    omega = sqrt(omega0_sq - gamma^2)
    # x(0) = 1 => A = 1
    # ẋ(0) = -gamma*A + omega*B = 0 => B = gamma / omega
    A = 1.0
    B = gamma / omega
    return exp(-gamma * t) * (A * cos(omega * t) + B * sin(omega * t))
end

"""
    ode_residual(x_ddot, x_dot, x_val; m=1.0, mu=0.4, k=4.0)

ODE residual: r = m*ẍ + mu*ẋ + k*x.
"""
function ode_residual(x_ddot, x_dot, x_val; m=1.0, mu=0.4, k=4.0)
    return m * x_ddot + mu * x_dot + k * x_val
end

end # module HarmonicOscillator
