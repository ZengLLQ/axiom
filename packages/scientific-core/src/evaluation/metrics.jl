module EvaluationMetrics

using LinearAlgebra

export calculate_metrics, determine_validation_status

"""
    calculate_metrics(u_pred::Matrix{Float64}, u_ref::Matrix{Float64}, residual_matrix::Matrix{Float64}, ic_err::Float64, bc_err::Float64)

Calculates all scientific evaluation metrics: MAE, RMSE, Relative L2, Max Residual, Residual RMS, IC, BC.
"""
function calculate_metrics(u_pred::Matrix{Float64}, u_ref::Matrix{Float64}, residual_matrix::Matrix{Float64}, ic_err::Float64, bc_err::Float64)
    N = length(u_pred)
    diff = u_pred .- u_ref
    abs_diff = abs.(diff)
    
    mae = sum(abs_diff) / N
    rmse = sqrt(sum(diff .^ 2) / N)
    
    ref_norm = norm(u_ref)
    rel_l2 = ref_norm > 1e-12 ? (norm(diff) / ref_norm) : 0.0
    
    max_res = maximum(abs.(residual_matrix))
    res_rms = sqrt(sum(residual_matrix .^ 2) / length(residual_matrix))
    
    return (
        mae = mae,
        rmse = rmse,
        relative_l2 = rel_l2,
        max_residual = max_res,
        residual_rms = res_rms,
        ic_error = ic_err,
        bc_error = bc_err
    )
end

"""
    determine_validation_status(metrics; rel_l2_threshold=0.08, res_rms_threshold=0.1)

Evaluates whether model passes rigorous scientific validation criteria.
"""
function determine_validation_status(metrics; rel_l2_threshold=0.08, res_rms_threshold=0.1)
    if isnan(metrics.relative_l2) || isinf(metrics.relative_l2) || metrics.relative_l2 > 0.5
        status = "failed"
    elseif metrics.relative_l2 <= rel_l2_threshold && metrics.residual_rms <= res_rms_threshold
        status = "passed"
    elseif metrics.relative_l2 <= 0.15
        status = "inconclusive"
    else
        status = "failed"
    end
    
    criteria = [
        (metric="Relative L2 Error", threshold=rel_l2_threshold, actual=metrics.relative_l2, passed=(metrics.relative_l2 <= rel_l2_threshold)),
        (metric="Residual RMS", threshold=res_rms_threshold, actual=metrics.residual_rms, passed=(metrics.residual_rms <= res_rms_threshold)),
        (metric="Initial Condition RMSE", threshold=0.05, actual=metrics.ic_error, passed=(metrics.ic_error <= 0.05)),
        (metric="Boundary Condition RMSE", threshold=0.05, actual=metrics.bc_error, passed=(metrics.bc_error <= 0.05))
    ]
    
    return (status=status, criteria=criteria)
end

end # module EvaluationMetrics
