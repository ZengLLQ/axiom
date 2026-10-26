import React from 'react';
import { ExperimentRecord, TrainingMetricPoint } from '../../types';
import { MetricCard } from '../../components/ui/MetricCard';
import { ValidationBadge } from '../../components/ui/ValidationBadge';
import { LineChart } from '../../components/charts/LineChart';
import { Activity, Square, ArrowRight, Clock } from 'lucide-react';

interface TrainingMonitorProps {
  experiment: ExperimentRecord;
  metrics: TrainingMetricPoint[];
  elapsedTime: number;
  onStop: () => void;
  onViewResults: () => void;
  isStopping: boolean;
}

export const TrainingMonitorView: React.FC<TrainingMonitorProps> = ({
  experiment,
  metrics,
  elapsedTime,
  onStop,
  onViewResults,
  isStopping,
}) => {
  const currentStep = metrics.length > 0 ? metrics[metrics.length - 1].step : 0;
  const totalSteps = ('steps' in experiment.config.training) ? experiment.config.training.steps : 200;
  const progressPct = totalSteps > 0 ? Math.min(100, Math.round((currentStep / totalSteps) * 100)) : 0;

  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  // Prepare series for LineChart
  const totalLossData = metrics.map((m) => ({ x: m.step, y: m.total }));
  const resLossData = metrics.map((m) => ({ x: m.step, y: m.residual }));
  const bcLossData = metrics.map((m) => ({ x: m.step, y: m.boundary }));
  const icLossData = metrics.map((m) => ({ x: m.step, y: m.initial }));

  const series = [
    { name: 'Total Loss', data: totalLossData, color: '#e4f222' },
    { name: 'Residual (Lr)', data: resLossData, color: '#02b8cc' },
    { name: 'Boundary (Lb)', data: bcLossData, color: '#8b5cf6' },
    { name: 'Initial (L0)', data: icLossData, color: '#27a644' },
  ];

  const isCompleted = experiment.status === 'completed';
  const isRunning = experiment.status === 'running';

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#23252a] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-[#e4f222] animate-pulse" />
            <span className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider">
              Live PINN Optimization
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-[510] text-[#ffffff] tracking-[-0.022em]">
              {experiment.name}
            </h1>
            <ValidationBadge status={experiment.status} />
          </div>
          <p className="text-xs text-[#8a8f98] mt-1 font-mono">
            ID: {experiment.id} · Equation: {experiment.equationId}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isRunning && (
            <button
              onClick={onStop}
              disabled={isStopping}
              className="btn-ghost text-[#eb5757] hover:text-[#ffffff] hover:bg-[rgba(235,87,87,0.15)] border-[rgba(235,87,87,0.3)]"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{isStopping ? 'Stopping...' : 'Stop Optimization'}</span>
            </button>
          )}

          {isCompleted && (
            <button
              onClick={onViewResults}
              className="btn-primary-action"
            >
              <span>Inspect Results</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#d0d6e0]">
            Step {currentStep} of {totalSteps} ({progressPct}%)
          </span>
          <span className="text-[#8a8f98] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {elapsedTime.toFixed(1)}s elapsed
          </span>
        </div>
        <div className="w-full bg-[#161718] h-2 rounded-full overflow-hidden border border-[#23252a]">
          <div
            className="h-full bg-[#e4f222] transition-all duration-300 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Real-time Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Total Loss"
          value={latest ? latest.total.toFixed(5) : '—'}
          variant="accent"
          subtext="λr Lr + λb Lb + λ0 L0"
        />
        <MetricCard
          label="PDE Residual Loss"
          value={latest ? latest.residual.toFixed(5) : '—'}
          subtext="ut - α uxx"
        />
        <MetricCard
          label="Boundary Loss"
          value={latest ? latest.boundary.toFixed(5) : '—'}
          subtext="u(0,t)² + u(1,t)²"
        />
        <MetricCard
          label="Initial Loss"
          value={latest ? latest.initial.toFixed(5) : '—'}
          subtext="u(x,0) - sin(πx)"
        />
      </div>

      {/* Live Loss Curves */}
      <div className="space-y-4">
        <LineChart
          title="Optimization Loss Convergence (Log Scale)"
          series={series}
          logScaleY={true}
          xLabel="Optimizer Step"
          yLabel="Log10 Loss"
          height={320}
        />
      </div>
    </div>
  );
};
