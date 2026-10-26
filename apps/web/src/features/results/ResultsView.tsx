import React, { useState } from 'react';
import { ExperimentRecord, EvaluationResult } from '../../types';
import { MetricCard } from '../../components/ui/MetricCard';
import { ValidationBadge } from '../../components/ui/ValidationBadge';
import { Heatmap2D } from '../../components/charts/Heatmap2D';
import { LineChart } from '../../components/charts/LineChart';
import { 
  LineChart as ChartIcon, 
  Download, 
  FileCode2, 
  CheckCircle2, 
  XCircle, 
  FileSpreadsheet
} from 'lucide-react';

interface ResultsViewProps {
  experiment: ExperimentRecord;
  onNavigateToStudio: () => void;
  onNavigateToReproduce?: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  experiment,
  onNavigateToStudio,
}) => {
  const result: EvaluationResult | undefined = experiment.result;
  const [activeField, setActiveField] = useState<'predicted' | 'reference' | 'error' | 'residual'>('predicted');
  const [colormap, setColormap] = useState<'viridis' | 'plasma' | 'coolwarm'>('viridis');
  const [selectedSliceIndex, setSelectedSliceIndex] = useState<number>(2);

  if (!result) {
    return (
      <div className="max-w-[1200px] mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-medium text-[#ffffff]">No Evaluation Results Found</h2>
        <p className="text-xs text-[#8a8f98]">
          This experiment has not been evaluated yet or training is still pending.
        </p>
        <button onClick={onNavigateToStudio} className="btn-primary-action">
          Open Studio
        </button>
      </div>
    );
  }

  const m = result.metrics;
  const xGrid = result.grid.x;
  const tGrid = result.grid.t;

  // Selected Heatmap Field
  let heatmapData = result.predicted;
  let heatmapTitle = 'PINN Predicted Temperature Field u_θ(x, t)';
  if (activeField === 'reference') {
    heatmapData = result.reference;
    heatmapTitle = 'Independent Reference Solution u_ref(x, t)';
  } else if (activeField === 'error') {
    heatmapData = result.absoluteError;
    heatmapTitle = 'Absolute Error Field |u_θ - u_ref|';
  } else if (activeField === 'residual') {
    heatmapData = result.residualField;
    heatmapTitle = 'Differential PDE Residual |ut - α uxx|';
  }

  // Time Slice Data
  const slices = result.timeSlices;
  const currentSlice = slices[selectedSliceIndex] ?? slices[0];
  const sliceSeries = currentSlice ? [
    { name: 'PINN Prediction', data: currentSlice.x.map((x, i) => ({ x, y: currentSlice.predicted[i] })), color: '#e4f222' },
    { name: 'Reference Oracle', data: currentSlice.x.map((x, i) => ({ x, y: currentSlice.reference[i] })), color: '#02b8cc', dashed: true },
    { name: 'Absolute Error', data: currentSlice.x.map((x, i) => ({ x, y: currentSlice.error[i] })), color: '#eb5757' },
  ] : [];

  // Loss series
  const lossSeries = [
    { name: 'Total Loss', data: result.lossHistory.map((pt) => ({ x: pt.step, y: pt.total })), color: '#e4f222' },
    { name: 'Residual (Lr)', data: result.lossHistory.map((pt) => ({ x: pt.step, y: pt.residual })), color: '#02b8cc' },
  ];

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#23252a] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ChartIcon className="w-4 h-4 text-[#e4f222]" />
            <span className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider">
              Scientific Evaluation Dossier
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-[510] text-[#ffffff] tracking-[-0.022em]">
              {experiment.name}
            </h1>
            <ValidationBadge status={result.status} />
          </div>
          <p className="text-xs text-[#8a8f98] mt-1 font-mono">
            Backend: {result.hardware.backend} · Julia {result.hardware.juliaVersion} · {m.optimizerSteps} steps in {m.trainingDurationSec}s
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/v1/experiments/${experiment.id}/export/julia`}
            download
            className="btn-ghost"
          >
            <FileCode2 className="w-3.5 h-3.5 text-[#e4f222]" />
            <span>Export Julia Script</span>
          </a>

          <a
            href={`/api/v1/experiments/${experiment.id}/export/csv`}
            download
            className="btn-ghost"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#02b8cc]" />
            <span>CSV Dataset</span>
          </a>

          <a
            href={`/api/v1/experiments/${experiment.id}/export/json`}
            download
            className="btn-primary-action"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON Manifest</span>
          </a>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Relative L2 Error"
          value={m.relativeL2.toFixed(5)}
          variant={m.relativeL2 < 0.08 ? 'pulse' : 'coral'}
          subtext="||u_θ - u_ref||₂ / ||u_ref||₂"
        />
        <MetricCard
          label="Root Mean Sq Error (RMSE)"
          value={m.rmse.toFixed(5)}
          subtext="Domain point root-mean-square"
        />
        <MetricCard
          label="Max Absolute Residual"
          value={m.maxResidual.toFixed(5)}
          subtext="Peak PDE violation max |ut - α uxx|"
        />
        <MetricCard
          label="Initial Condition Error"
          value={m.icError.toFixed(5)}
          subtext="t = 0 boundary accuracy"
        />
      </div>

      {/* Scientific Validation Criteria Checklist */}
      <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a]">
        <h3 className="text-sm font-medium text-[#ffffff] mb-3">
          Scientific Verification Checklist
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {result.validationCriteria.map((c, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-[6px] border flex items-start gap-2.5 ${
                c.passed
                  ? 'bg-[rgba(39,166,68,0.06)] border-[rgba(39,166,68,0.3)]'
                  : 'bg-[rgba(235,87,87,0.06)] border-[rgba(235,87,87,0.3)]'
              }`}
            >
              {c.passed ? (
                <CheckCircle2 className="w-4 h-4 text-[#27a644] mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-[#eb5757] mt-0.5 shrink-0" />
              )}
              <div>
                <div className="text-xs font-medium text-[#ffffff]">{c.metric}</div>
                <div className="text-[11px] font-mono text-[#8a8f98] mt-0.5">
                  Actual: <span className={c.passed ? 'text-[#27a644]' : 'text-[#eb5757]'}>{c.actual}</span> / Target: ≤ {c.threshold}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2D Solution Fields Visualization */}
      <div className="space-y-4">
        {/* Field Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-[#0f1011] rounded-[6px] border border-[#23252a]">
            <button
              onClick={() => setActiveField('predicted')}
              className={`px-3 py-1 rounded-[4px] text-xs font-medium transition-colors ${
                activeField === 'predicted' ? 'bg-[#161718] text-[#ffffff] shadow-[inset_0_0_0_1px_#383b3f]' : 'text-[#8a8f98] hover:text-[#d0d6e0]'
              }`}
            >
              PINN Prediction
            </button>
            <button
              onClick={() => setActiveField('reference')}
              className={`px-3 py-1 rounded-[4px] text-xs font-medium transition-colors ${
                activeField === 'reference' ? 'bg-[#161718] text-[#ffffff] shadow-[inset_0_0_0_1px_#383b3f]' : 'text-[#8a8f98] hover:text-[#d0d6e0]'
              }`}
            >
              Reference Oracle
            </button>
            <button
              onClick={() => setActiveField('error')}
              className={`px-3 py-1 rounded-[4px] text-xs font-medium transition-colors ${
                activeField === 'error' ? 'bg-[#161718] text-[#ffffff] shadow-[inset_0_0_0_1px_#383b3f]' : 'text-[#8a8f98] hover:text-[#d0d6e0]'
              }`}
            >
              Absolute Error
            </button>
            <button
              onClick={() => setActiveField('residual')}
              className={`px-3 py-1 rounded-[4px] text-xs font-medium transition-colors ${
                activeField === 'residual' ? 'bg-[#161718] text-[#ffffff] shadow-[inset_0_0_0_1px_#383b3f]' : 'text-[#8a8f98] hover:text-[#d0d6e0]'
              }`}
            >
              PDE Residual
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8a8f98] font-mono">Palette:</span>
            <select
              value={colormap}
              onChange={(e) => setColormap(e.target.value as any)}
              className="linear-input text-xs font-mono bg-[#0f1011] py-1 px-2"
            >
              <option value="viridis">Viridis</option>
              <option value="plasma">Plasma</option>
              <option value="coolwarm">Coolwarm</option>
            </select>
          </div>
        </div>

        {/* 2D Heatmap */}
        <Heatmap2D
          data={heatmapData}
          xGrid={xGrid}
          tGrid={tGrid}
          title={heatmapTitle}
          colormap={colormap}
        />
      </div>

      {/* Cross-sectional Time Slices & Loss curves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slice Profile Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#ffffff]">
              Cross-Sectional Slice Profile at t = {currentSlice?.t.toFixed(2)}
            </span>
            <div className="flex items-center gap-1">
              {slices.map((sl, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSliceIndex(idx)}
                  className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono transition-colors ${
                    selectedSliceIndex === idx ? 'bg-[#e4f222] text-[#08090a] font-medium' : 'bg-[#161718] text-[#8a8f98] hover:text-[#ffffff]'
                  }`}
                >
                  t={sl.t.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
          <LineChart
            series={sliceSeries}
            xLabel="Spatial Position x"
            yLabel="Temperature u(x)"
            height={260}
          />
        </div>

        {/* Loss History Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#ffffff]">
              Training Convergence History
            </span>
            <span className="text-[11px] font-mono text-[#8a8f98]">
              Final Loss: {result.metrics.trainingLoss}
            </span>
          </div>
          <LineChart
            series={lossSeries}
            logScaleY={true}
            xLabel="Optimizer Step"
            yLabel="Log10 Loss"
            height={260}
          />
        </div>
      </div>
    </div>
  );
};
