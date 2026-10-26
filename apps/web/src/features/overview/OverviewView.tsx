import React from 'react';
import { ExperimentRecord } from '../../types';
import { MetricCard } from '../../components/ui/MetricCard';
import { ValidationBadge } from '../../components/ui/ValidationBadge';
import { ArrowRight, Play, CheckCircle2, FlaskConical, ShieldCheck } from 'lucide-react';

interface OverviewViewProps {
  experiments: ExperimentRecord[];
  onSelectExperiment: (exp: ExperimentRecord) => void;
  onNavigateToStudio: () => void;
  onNavigateToInverse: () => void;
  onQuickRunDefault: () => void;
  isRunningQuick: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  experiments,
  onSelectExperiment,
  onNavigateToStudio,
  onNavigateToInverse,
  onQuickRunDefault,
  isRunningQuick,
}) => {
  const completed = experiments.filter((e) => e.status === 'completed');
  const passed = completed.filter((e) => e.result?.status === 'passed');
  const passRate = completed.length > 0 ? `${((passed.length / completed.length) * 100).toFixed(0)}%` : '—';
  
  const relL2List = completed
    .map((e) => e.result?.metrics?.relativeL2)
    .filter((v): v is number => v !== undefined && !isNaN(v));
  const avgRelL2 = relL2List.length > 0 ? (relL2List.reduce((a, b) => a + b, 0) / relL2List.length).toFixed(4) : '—';

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto py-6">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#23252a] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider bg-[rgba(228,242,34,0.1)] text-[#e4f222] border border-[rgba(228,242,34,0.3)] rounded-[4px] uppercase">
              Scientific Machine Learning
            </span>
            <span className="text-xs text-[#8a8f98] font-mono">v1.0.0</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-[510] text-[#ffffff] tracking-[-0.022em]">
            Precision Scientific AI Laboratory
          </h1>
          <p className="text-sm text-[#8a8f98] mt-1.5 max-w-[700px] leading-relaxed">
            Physics-Informed Neural Networks with exact analytical solution oracles, independent SciML numerical solvers, and inverse parameter estimation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onQuickRunDefault}
            disabled={isRunningQuick}
            className="btn-primary-action"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunningQuick ? 'Solving...' : 'Run Heat Equation'}</span>
          </button>
          <button
            onClick={onNavigateToStudio}
            className="btn-ghost"
          >
            <span>Custom Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Experiments"
          value={experiments.length}
          subtext={`${completed.length} completed / ${experiments.filter(e => e.status === 'running').length} running`}
        />
        <MetricCard
          label="Validation Pass Rate"
          value={passRate}
          variant="pulse"
          subtext="Scientifically passed criteria"
        />
        <MetricCard
          label="Mean Relative L2"
          value={avgRelL2}
          variant="accent"
          subtext="Normalized error across tests"
        />
        <MetricCard
          label="Active Engine"
          value="Julia 1.13"
          subtext="Lux.jl + Vectorized BLAS"
        />
      </div>

      {/* Quick Launch & Architecture Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 1D Heat Equation Benchmark */}
        <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] flex flex-col justify-between hover:border-[#383b3f] transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-[#e4f222] bg-[rgba(228,242,34,0.08)] px-2 py-0.5 rounded-[4px]">
                PARABOLIC PDE
              </span>
              <span className="text-xs font-mono text-[#8a8f98]">Exact Oracle</span>
            </div>
            <h3 className="text-base font-medium text-[#ffffff] tracking-tight">1D Heat Diffusion</h3>
            <div className="font-mono text-xs text-[#02b8cc] my-2 bg-[#08090a] p-2 rounded-[6px] border border-[#23252a]">
              u_t = α u_xx , u(x,0) = sin(πx)
            </div>
            <p className="text-xs text-[#8a8f98] leading-relaxed">
              Analytical solution u(x,t) = e^(-απ²t) sin(πx) verified against Crank-Nicolson numerical solver.
            </p>
          </div>
          <button
            onClick={onQuickRunDefault}
            disabled={isRunningQuick}
            className="mt-4 btn-ghost w-full justify-between"
          >
            <span>{isRunningQuick ? 'Running...' : 'Execute Baseline'}</span>
            <Play className="w-3.5 h-3.5 text-[#e4f222]" />
          </button>
        </div>

        {/* Card 2: Inverse Parameter Estimation */}
        <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] flex flex-col justify-between hover:border-[#383b3f] transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-[#8b5cf6] bg-[rgba(139,92,246,0.08)] px-2 py-0.5 rounded-[4px]">
                INVERSE WORKBENCH
              </span>
              <span className="text-xs font-mono text-[#8a8f98]">Sensor Data</span>
            </div>
            <h3 className="text-base font-medium text-[#ffffff] tracking-tight">Parameter Discovery</h3>
            <div className="font-mono text-xs text-[#8b5cf6] my-2 bg-[#08090a] p-2 rounded-[6px] border border-[#23252a]">
              Recover α from noisy measurements
            </div>
            <p className="text-xs text-[#8a8f98] leading-relaxed">
              Backpropagates PDE residual loss directly to physical parameters to recover unknown thermal conductivity from sparse sensor observations.
            </p>
          </div>
          <button
            onClick={onNavigateToInverse}
            className="mt-4 btn-ghost w-full justify-between"
          >
            <span>Open Workbench</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#8b5cf6]" />
          </button>
        </div>

        {/* Card 3: Scientific Integrity Contract */}
        <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-[#27a644] bg-[rgba(39,166,68,0.08)] px-2 py-0.5 rounded-[4px]">
                RIGOR GUARANTEE
              </span>
              <ShieldCheck className="w-4 h-4 text-[#27a644]" />
            </div>
            <h3 className="text-base font-medium text-[#ffffff] tracking-tight">Scientific Non-Negotiables</h3>
            <ul className="text-xs text-[#8a8f98] space-y-2 mt-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#27a644] mt-0.5 shrink-0" />
                <span>Zero fabricated metrics or synthetic training curves.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#27a644] mt-0.5 shrink-0" />
                <span>Independent SciML numerical and analytical reference solutions.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#27a644] mt-0.5 shrink-0" />
                <span>Exportable standalone reproducible Julia code for each run.</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-[#23252a] text-[11px] font-mono text-[#62666d]">
            Certified by Axiom Scientific Core
          </div>
        </div>
      </div>

      {/* Recent Experiments Table */}
      <div className="bg-[#0f1011] rounded-[12px] shadow-[inset_0_0_0_1px_#23252a] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#23252a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#8a8f98]" />
            <span className="text-sm font-medium text-[#ffffff]">Recent Scientific Experiments</span>
          </div>
          <span className="text-xs text-[#8a8f98] font-mono">{experiments.length} records in SQLite</span>
        </div>

        {experiments.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#8a8f98]">
            No experiments found. Click <span className="text-[#e4f222]">Run Heat Equation</span> above to launch your first PINN experiment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161718] text-[#8a8f98] font-mono border-b border-[#23252a]">
                <tr>
                  <th className="py-2.5 px-4 font-normal">Experiment</th>
                  <th className="py-2.5 px-4 font-normal">Equation</th>
                  <th className="py-2.5 px-4 font-normal">Type</th>
                  <th className="py-2.5 px-4 font-normal">Status</th>
                  <th className="py-2.5 px-4 font-normal">Rel L2</th>
                  <th className="py-2.5 px-4 font-normal">Max Res</th>
                  <th className="py-2.5 px-4 font-normal">Created</th>
                  <th className="py-2.5 px-4 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23252a]">
                {experiments.map((exp) => {
                  const m = exp.result?.metrics;
                  return (
                    <tr 
                      key={exp.id}
                      onClick={() => onSelectExperiment(exp)}
                      className="hover:bg-[#161718]/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-[#ffffff]">
                        {exp.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#8a8f98]">
                        {exp.equationId}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#8a8f98] capitalize">
                        {exp.type}
                      </td>
                      <td className="py-3 px-4">
                        <ValidationBadge status={exp.result?.status ?? exp.status} />
                      </td>
                      <td className="py-3 px-4 font-mono text-[#d0d6e0]">
                        {m?.relativeL2 !== undefined ? m.relativeL2.toFixed(5) : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#d0d6e0]">
                        {m?.maxResidual !== undefined ? m.maxResidual.toFixed(5) : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#62666d]">
                        {exp.createdAt.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[#e4f222] hover:underline text-xs font-medium">
                          Inspect →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
