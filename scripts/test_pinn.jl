using Lux, Random, ComponentArrays, Zygote, Optimisers

rng = Random.default_rng()
Random.seed!(rng, 42)

model = Chain(
    Dense(2 => 32, tanh),
    Dense(32 => 32, tanh),
    Dense(32 => 1)
)

ps, st = Lux.setup(rng, model)
ps_ca = ComponentArray(ps)

N_r = 200
x_col = rand(rng, Float32, N_r)
t_col = rand(rng, Float32, N_r)

N_b = 50
t_bc = rand(rng, Float32, N_b)
bc_x0 = zeros(Float32, N_b)
bc_x1 = ones(Float32, N_b)

N_0 = 50
x_ic = rand(rng, Float32, N_0)
t_ic = zeros(Float32, N_0)
u_ic_true = sin.(Float32(pi) .* x_ic)

alpha = 0.1f0
eps = 1.0f-3
inv_2eps = 1.0f0 / (2.0f0 * eps)
inv_eps2 = 1.0f0 / (eps * eps)

X_c = vcat(transpose(x_col), transpose(t_col))
X_tp = vcat(transpose(x_col), transpose(t_col .+ eps))
X_tm = vcat(transpose(x_col), transpose(t_col .- eps))
X_xp = vcat(transpose(x_col .+ eps), transpose(t_col))
X_xm = vcat(transpose(x_col .- eps), transpose(t_col))
X_res_all = hcat(X_c, X_tp, X_tm, X_xp, X_xm)

X_bc0 = vcat(transpose(bc_x0), transpose(t_bc))
X_bc1 = vcat(transpose(bc_x1), transpose(t_bc))
X_ic = vcat(transpose(x_ic), transpose(t_ic))

opt = Optimisers.Adam(0.005f0)
opt_st = Optimisers.setup(opt, ps_ca)

function compute_total_loss(p)
    u_all, _ = Lux.apply(model, X_res_all, p, st)
    u_c = u_all[1, 1:N_r]
    u_tp = u_all[1, N_r+1:2N_r]
    u_tm = u_all[1, 2N_r+1:3N_r]
    u_xp = u_all[1, 3N_r+1:4N_r]
    u_xm = u_all[1, 4N_r+1:5N_r]
    
    u_t = (u_tp .- u_tm) .* inv_2eps
    u_xx = (u_xp .- 2.0f0 .* u_c .+ u_xm) .* inv_eps2
    res = u_t .- alpha .* u_xx
    loss_r = sum(abs2, res) / N_r
    
    u_bc0, _ = Lux.apply(model, X_bc0, p, st)
    u_bc1, _ = Lux.apply(model, X_bc1, p, st)
    loss_b = (sum(abs2, u_bc0) + sum(abs2, u_bc1)) / (2.0f0 * N_b)
    
    u_0, _ = Lux.apply(model, X_ic, p, st)
    loss_0 = sum(abs2, vec(u_0) .- u_ic_true) / N_0
    
    return loss_r + 20.0f0 * loss_b + 20.0f0 * loss_0
end

println("Starting 50 steps test...")
t_start = time()
p_curr = ps_ca
for step in 1:50
    global p_curr, opt_st
    loss_val, back = Zygote.pullback(compute_total_loss, p_curr)
    grads = back(1.0f0)[1]
    opt_st, p_curr = Optimisers.update(opt_st, p_curr, grads)
    if step % 10 == 0
        println("Step ", step, " Loss: ", loss_val)
    end
end
println("50 steps took: ", round(time() - t_start, digits=3), " s")
