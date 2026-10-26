module MLPModel

using Lux
using Random
using ComponentArrays

export build_mlp, count_parameters, get_activation_fn

function gelu_fn(x)
    return 0.5f0 * x * (1.0f0 + tanh(Float32(sqrt(2.0 / pi)) * (x + 0.044715f0 * x^3)))
end

function sigmoid_fn(x)
    return 1.0f0 / (1.0f0 + exp(-x))
end

function relu_fn(x)
    return max(0.0f0, x)
end

function get_activation_fn(act_name::String)
    act_lower = lowercase(act_name)
    if act_lower == "tanh"
        return tanh
    elseif act_lower == "sigmoid"
        return sigmoid_fn
    elseif act_lower == "sin"
        return sin
    elseif act_lower == "gelu"
        return gelu_fn
    elseif act_lower == "relu"
        return relu_fn
    else
        return tanh
    end
end

"""
    build_mlp(layer_dims; activation="tanh", seed=42)

Builds a Lux Chain model with specified layer dimensions and activation function.
Returns (model, parameters, state).
"""
function build_mlp(layer_dims::Vector{Int}; activation="tanh", seed=42)
    rng = Random.default_rng()
    Random.seed!(rng, seed)
    
    act_fn = get_activation_fn(activation)
    n_layers = length(layer_dims)
    
    layers = []
    for i in 1:n_layers-2
        push!(layers, Dense(layer_dims[i] => layer_dims[i+1], act_fn))
    end
    # Output layer is linear (no activation)
    push!(layers, Dense(layer_dims[n_layers-1] => layer_dims[n_layers]))
    
    model = Chain(layers...)
    ps, st = Lux.setup(rng, model)
    ps_ca = ComponentArray(ps)
    
    return (model=model, ps=ps_ca, st=st)
end

"""
    count_parameters(layer_dims::Vector{Int})

Calculates total trainable parameter count for dense MLP architecture.
"""
function count_parameters(layer_dims::Vector{Int})
    total = 0
    for i in 1:length(layer_dims)-1
        nin = layer_dims[i]
        nout = layer_dims[i+1]
        total += (nin * nout) + nout # weights + biases
    end
    return total
end

end # module MLPModel
