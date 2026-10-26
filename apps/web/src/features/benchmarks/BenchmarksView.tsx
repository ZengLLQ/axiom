import React, { useState } from 'react';
import { ExperimentRecord } from '../../types';
import { ValidationBadge } from '../../components/ui/ValidationBadge';
import { Layers, BarChart2 } from 'lucide-react';

interface BenchmarksViewProps {
  experiments: ExperimentRecord[];
  onSelectExperiment: (exp: ExperimentRecord) => void;
  onNavigateToStudio: () => void;
}

export const BenchmarksView: React.FC<BenchmarksViewProps> = ({
  experiments,
  onNavigateToStudio,
}) => {
  const completed = experiments.filter((e) => e.result !== undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>(completed.slice(0, 3).map((e) => e.id));

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedExperiments = completed.filter((e) => selectedIds.includes(e.id));

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#23252a] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-[#e4f222]" />
            <span className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider">
              Experiment Comparative Analysis
            </span>
          </div>
          <h1 className="text-2xl font-[510] text-[#ffffff] tracking-[-0.022em]">
            Multi-Experiment Benchmarks
          </h1>
          <p className="text-xs text-[#8a8f98] mt-1 max-w-[700px]">
            Evaluate architecture depth, width, collocation density, and optimization schedules on scientific accuracy and convergence speed.
          </p>
        </div>

        <button onClick={onNavigateToStudio} className="btn-primary-action">
          <span>New Experiment</span>
        </button>
      </div>

      {completed.length < 2 ? (
        <div className="bg-[#0f1011] rounded-[12px] p-12 text-center shadow-[inset_0_0_0_1px_#23252a] space-y-3">
          <BarChart2 className="w-8 h-8 text-[#8a8f98] mx-auto opacity-70" />
          <h3 className="text-sm font-medium text-[#ffffff]">Need More Completed Experiments</h3>
          <p className="text-xs text-[#8a8f98] max-w-[500px] mx-auto">
            Run at least two experiments to view comparative benchmarks, Pareto error analysis, and architectural tradeoff tables.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Experiment Selectors */}
          <div className="bg-[#0f1011] rounded-[12px] p-4 shadow-[inset_0_0_0_1px_#23252a]">
            <span className="text-xs font-mono text-[#8a8f98] block mb-2">
              Select Experiments to Compare ({selectedIds.length} selected):
            </span>
            <div className="flex flex-wrap gap-2">
              {completed.map((exp) => {
                const isChecked = selectedIds.includes(exp.id);
                return (
                  <button
                    key={exp.id}
                    onClick={() => toggleSelect(exp.id)}
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-mono transition-all border ${
                      isChecked
                        ? 'bg-[#161718] border-[#e4f222] text-[#ffffff]'
                        : 'bg-[#08090a] border-[#23252a] text-[#8a8f98] hover:text-[#d0d6e0]'
                    }`}
                  >
                    {isChecked ? '✓ ' : ''}{exp.name} (L2: {exp.result?.metrics.relativeL2.toFixed(4)})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comparison Matrix Table */}
          <div className="bg-[#0f1011] rounded-[12px] shadow-[inset_0_0_0_1px_#23252a] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#23252a] flex items-center justify-between">
              <span className="text-xs font-medium text-[#ffffff]">Benchmark Metrics Matrix</span>
              <span className="text-[11px] font-mono text-[#8a8f98]">Scientific Comparison</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#161718] text-[#8a8f98] border-b border-[#23252a]">
                  <tr>
                    <th className="py-2.5 px-4 font-normal">Metric / Property</th>
                    {selectedExperiments.map((exp) => (
                      <th key={exp.id} className="py-2.5 px-4 font-normal text-[#ffffff]">
                        {exp.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23252a]">
                  <tr>
                    <td className="py-2.5 px-4 text-[#8a8f98]">Validation Status</td>
                    {selectedExperiments.map((exp) => (
                      <td key={exp.id} className="py-2.5 px-4">
                        <ValidationBadge status={exp.result?.status ?? 'draft'} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-[#8a8f98]">Relative L2 Error</td>
                    {selectedExperiments.map((exp) => (
                      <td key={exp.id} className="py-2.5 px-4 text-[#e4f222] font-medium">
                        {exp.result?.metrics.relativeL2.toFixed(5)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-[#8a8f98]">Root Mean Square Error</td>
                    {selectedExperiments.map((exp) => (
                      <td key={exp.id} className="py-2.5 px-4 text-[#d0d6e0]">
                        {exp.result?.metrics.rmse.toFixed(5)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-[#8a8f98]">Max Absolute Residual</td>
                    {selectedExperiments.map((exp) => (
                      <td key={exp.id} className="py-2.5 px-4 text-[#d0d6e0]">
                        {exp.result?.metrics.maxResidual.toFixed(5)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-[#8a8f98]">Residual RMS</td>
                    {selectedExperiments.map((exp) => (
                      <td key={exp.id} className="py-2.5 px-4 text-[#d0d6e0]">
                        {exp.result?.metrics.residualRms.toFixed(5)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-[#8a8f98]">Trainable Parameters</td>
                    {selectedExperiments.map((exp) => (
                      <td key={exp.id} className="py-2.5 px-4 text-[#d0d6e0]">
                        {exp.result?.metrics.parametersCount}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-[#8a8f98]">Optimizer Steps</td>
                    {selectedExperiments.map((exp) => (
                      <td key={exp.id} className="py-2.5 px-4 text-[#d0d6e0]">
                        {exp.result?.metrics.optimizerSteps}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-[#8a8f98]">Training Wall Time</td>
                    {selectedExperiments.map((exp) => (
                      <td key={exp.id} className="py-2.5 px-4 text-[#d0d6e0]">
                        {exp.result?.metrics.trainingDurationSec}s
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
