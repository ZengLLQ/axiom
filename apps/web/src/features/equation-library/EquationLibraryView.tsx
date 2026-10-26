import React, { useState } from 'react';
import { EquationTemplate } from '../../types';
import { EQUATION_TEMPLATES } from '../../lib/equations';
import { BookOpen, CheckCircle2, Sliders } from 'lucide-react';

interface EquationLibraryProps {
  onSelectEquationToConfigure: (eq: EquationTemplate) => void;
}

export const EquationLibraryView: React.FC<EquationLibraryProps> = ({
  onSelectEquationToConfigure,
}) => {
  const equations = Object.values(EQUATION_TEMPLATES);
  const [selectedEqId, setSelectedEqId] = useState<string>('heat_1d');

  const activeEquation = EQUATION_TEMPLATES[selectedEqId] ?? equations[0];

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto py-6">
      {/* Header */}
      <div className="border-b border-[#23252a] pb-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-[#e4f222]" />
          <span className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider">
            Scientific Foundation
          </span>
        </div>
        <h1 className="text-2xl font-[510] text-[#ffffff] tracking-[-0.022em]">
          Mathematical Equation Library
        </h1>
        <p className="text-xs text-[#8a8f98] mt-1 max-w-[700px]">
          Authoritative formulations of governing differential equations with domain constraints, boundary values, and reference solver baselines.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Equations */}
        <div className="lg:col-span-4 space-y-2">
          {equations.map((eq) => {
            const isSelected = eq.id === selectedEqId;
            return (
              <div
                key={eq.id}
                onClick={() => setSelectedEqId(eq.id)}
                className={`p-4 rounded-[12px] cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-[#161718] border-[#383b3f] shadow-[0_4px_12px_rgba(0,0,0,0.5)]'
                    : 'bg-[#0f1011] border-[#23252a] hover:border-[#383b3f]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-[4px] ${
                    isSelected ? 'bg-[rgba(228,242,34,0.1)] text-[#e4f222]' : 'bg-[rgba(255,255,255,0.05)] text-[#8a8f98]'
                  }`}>
                    {eq.category}
                  </span>
                  <span className="text-[11px] font-mono text-[#62666d]">
                    {eq.analyticalAvailable ? 'Exact Oracle' : 'Numerical MOL'}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-[#ffffff]">{eq.name}</h3>
                <div className="mt-2 text-xs font-mono text-[#02b8cc] bg-[#08090a] p-1.5 rounded-[6px] border border-[#23252a] overflow-x-auto">
                  {eq.pdeLatex}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-8 bg-[#0f1011] rounded-[12px] p-6 shadow-[inset_0_0_0_1px_#23252a] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#23252a] pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#e4f222] bg-[rgba(228,242,34,0.1)] px-2 py-0.5 rounded-[4px]">
                {activeEquation.category} PDE
              </span>
              <h2 className="text-xl font-[510] text-[#ffffff] mt-2">
                {activeEquation.name}
              </h2>
            </div>

            <button
              onClick={() => onSelectEquationToConfigure(activeEquation)}
              className="btn-primary-action self-start sm:self-auto"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure in Studio</span>
            </button>
          </div>

          {/* Mathematical Formulation */}
          <div>
            <h4 className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider mb-2">
              Governing Equation
            </h4>
            <div className="bg-[#08090a] p-4 rounded-[6px] border border-[#23252a] font-mono text-sm text-[#ffffff] flex items-center justify-center">
              {activeEquation.pdeLatex}
            </div>
            <p className="text-xs text-[#8a8f98] mt-2.5 leading-relaxed">
              {activeEquation.description}
            </p>
          </div>

          {/* Physical Parameters */}
          <div>
            <h4 className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider mb-2">
              Physical Parameters
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(activeEquation.parameters).map(([key, p]) => (
                <div key={key} className="bg-[#161718] p-3 rounded-[6px] border border-[#23252a]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#ffffff]">{p.name} ({p.symbol})</span>
                    <span className="text-xs font-mono text-[#e4f222]">{p.default} {p.unit}</span>
                  </div>
                  <p className="text-[11px] text-[#8a8f98] mt-1">{p.description}</p>
                  <div className="mt-2 text-[10px] font-mono text-[#62666d]">
                    Permitted domain: [{p.min}, {p.max}] {p.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Domain & Conditions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#161718] p-3.5 rounded-[6px] border border-[#23252a]">
              <h5 className="text-[11px] font-mono text-[#8a8f98] uppercase mb-1.5">
                Initial Condition (t = 0)
              </h5>
              <div className="font-mono text-xs text-[#02b8cc] bg-[#08090a] p-2 rounded-[4px] border border-[#23252a]">
                {activeEquation.initialCondition}
              </div>
            </div>

            <div className="bg-[#161718] p-3.5 rounded-[6px] border border-[#23252a]">
              <h5 className="text-[11px] font-mono text-[#8a8f98] uppercase mb-1.5">
                Boundary Conditions
              </h5>
              <div className="font-mono text-xs text-[#02b8cc] bg-[#08090a] p-2 rounded-[4px] border border-[#23252a] space-y-1">
                {activeEquation.boundaryConditions.map((bc, idx) => (
                  <div key={idx}>{bc}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Reference Solver Info */}
          <div className="bg-[#08090a] p-3.5 rounded-[6px] border border-[#23252a] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#27a644]" />
              <div>
                <div className="text-xs font-medium text-[#ffffff]">Independent Reference Verification</div>
                <div className="text-[11px] font-mono text-[#8a8f98]">{activeEquation.referenceSolver}</div>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#27a644] bg-[rgba(39,166,68,0.1)] px-2 py-0.5 rounded-[4px]">
              VERIFIED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
