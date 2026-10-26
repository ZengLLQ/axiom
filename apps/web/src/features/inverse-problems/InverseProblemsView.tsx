import React, { useState } from 'react';
import { runInverseEstimation } from '../../services/api';
import { MetricCard } from '../../components/ui/MetricCard';
import { ValidationBadge } from '../../components/ui/ValidationBadge';
import { LineChart } from '../../components/charts/LineChart';
import { Shuffle, Play, Target, AlertCircle } from 'lucide-react';

export const InverseProblemsView: React.FC = () => {
  const [trueValue, setTrueValue] = useState<number>(0.10);
  const [initialGuess, setInitialGuess] = useState<number>(0.30);
  const [sensorCount, setSensorCount] = useState<number>(100);
  const [noiseStd, setNoiseStd] = useState<number>(0.01);
  const [steps, setSteps] = useState<number>(200);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await runInverseEstimation({
        trueValue,
        initialGuess,
        sensorCount,
        noiseStd,
        steps,
        learningRate: 0.005,
        seed: 42,
      });
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Inverse estimation failed');
    } finally {
      setIsRunning(false);
    }
  };

  // Build convergence line chart data
  const convergenceSeries = result?.convergenceHistory ? [
    {
      name: 'Estimated α̂',
      data: result.convergenceHistory.map((h: any) => ({ x: h.step, y: h.estimatedAlpha })),
      color: '#e4f222',
    },
  ] : [];

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#23252a] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shuffle className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider">
              Inverse Physics Workbench
            </span>
          </div>
          <h1 className="text-2xl font-[510] text-[#ffffff] tracking-[-0.022em]">
            Physical Parameter Discovery
          </h1>
          <p className="text-xs text-[#8a8f98] mt-1 max-w-[700px]">
            Given sparse and noisy temperature sensors, backpropagate PDE residual gradients simultaneously into neural weights and unknown physical constants to recover true thermal diffusivity.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning}
          className="btn-primary-action"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isRunning ? 'Optimizing...' : 'Run Parameter Estimation'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-[rgba(235,87,87,0.1)] border border-[rgba(235,87,87,0.3)] rounded-[6px] text-xs text-[#eb5757] flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Configuration Controls */}
      <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] space-y-4">
        <h3 className="text-sm font-medium text-[#ffffff] border-b border-[#23252a] pb-2">
          Inverse Problem Hyperparameters
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <label className="text-xs text-[#8a8f98] font-mono block mb-1">True Value (α_true)</label>
            <input
              type="number"
              step="0.01"
              value={trueValue}
              onChange={(e) => setTrueValue(parseFloat(e.target.value))}
              className="linear-input w-full font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs text-[#8a8f98] font-mono block mb-1">Initial Guess (α̂_0)</label>
            <input
              type="number"
              step="0.05"
              value={initialGuess}
              onChange={(e) => setInitialGuess(parseFloat(e.target.value))}
              className="linear-input w-full font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs text-[#8a8f98] font-mono block mb-1">Sensor Count (Ns)</label>
            <input
              type="number"
              step="20"
              value={sensorCount}
              onChange={(e) => setSensorCount(parseInt(e.target.value))}
              className="linear-input w-full font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs text-[#8a8f98] font-mono block mb-1">Noise σ (Gaussian)</label>
            <input
              type="number"
              step="0.005"
              value={noiseStd}
              onChange={(e) => setNoiseStd(parseFloat(e.target.value))}
              className="linear-input w-full font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs text-[#8a8f98] font-mono block mb-1">Optimizer Steps</label>
            <input
              type="number"
              step="25"
              value={steps}
              onChange={(e) => setSteps(parseInt(e.target.value))}
              className="linear-input w-full font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result ? (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="True Diffusivity (α)"
              value={result.trueValue}
              unit="m²/s"
              subtext="Ground truth physical constant"
            />
            <MetricCard
              label="Initial Guess (α̂₀)"
              value={result.initialGuess}
              unit="m²/s"
              subtext="Starting parameter prior"
            />
            <MetricCard
              label="Recovered Estimate (α̂)"
              value={result.estimatedValue}
              unit="m²/s"
              variant="accent"
              subtext="PINN gradient convergence"
            />
            <MetricCard
              label="Relative Parameter Error"
              value={`${(result.relativeError * 100).toFixed(2)}%`}
              variant={result.relativeError < 0.15 ? 'pulse' : 'coral'}
              subtext="|α̂ - α| / α"
            />
          </div>

          {/* Convergence Plot & Sensor Scatter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <LineChart
                title="Physical Parameter Convergence History"
                series={convergenceSeries}
                referenceLineY={result.trueValue}
                referenceLineLabel={`Ground Truth α = ${result.trueValue}`}
                xLabel="Optimizer Step"
                yLabel="Estimated Diffusivity (α̂)"
                height={300}
              />
            </div>

            <div className="lg:col-span-4 bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider mb-2">
                  Sensor Network Topology
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#23252a]">
                    <span className="text-[#8a8f98]">Active Sensors:</span>
                    <span className="font-mono text-[#ffffff]">{result.sensorCount} points</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#23252a]">
                    <span className="text-[#8a8f98]">Sensor Noise σ:</span>
                    <span className="font-mono text-[#ffffff]">{result.noiseStd}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#23252a]">
                    <span className="text-[#8a8f98]">Optimization Duration:</span>
                    <span className="font-mono text-[#ffffff]">{result.durationSec}s</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#23252a]">
                    <span className="text-[#8a8f98]">Scientific Status:</span>
                    <ValidationBadge status={result.status} />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#23252a] text-[11px] font-mono text-[#62666d]">
                Parameter estimation executed on Axiom Scientific Core
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f1011] rounded-[12px] p-12 text-center shadow-[inset_0_0_0_1px_#23252a] space-y-3">
          <Target className="w-8 h-8 text-[#8b5cf6] mx-auto opacity-70" />
          <h3 className="text-sm font-medium text-[#ffffff]">Inverse Problem Ready</h3>
          <p className="text-xs text-[#8a8f98] max-w-[500px] mx-auto">
            Click <span className="text-[#e4f222]">Run Parameter Estimation</span> above to simulate noisy sensor observations and recover thermal diffusivity.
          </p>
        </div>
      )}
    </div>
  );
};
