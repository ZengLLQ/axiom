import React, { useState } from 'react';
import { ExperimentRecord } from '../../types';
import { FileCode2, Download, Copy, Check, FileSpreadsheet, ShieldCheck } from 'lucide-react';

interface ArtifactsViewProps {
  experiments: ExperimentRecord[];
}

export const ArtifactsView: React.FC<ArtifactsViewProps> = ({ experiments }) => {
  const [selectedExpId, setSelectedExpId] = useState<string>(experiments[0]?.id ?? '');
  const [copied, setCopied] = useState<boolean>(false);

  const selectedExp = experiments.find((e) => e.id === selectedExpId) ?? experiments[0];

  const handleCopyCode = () => {
    if (!selectedExp) return;
    const scriptUrl = `/api/v1/experiments/${selectedExp.id}/export/julia`;
    fetch(scriptUrl)
      .then((r) => r.text())
      .then((code) => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto py-6">
      {/* Header */}
      <div className="border-b border-[#23252a] pb-4">
        <div className="flex items-center gap-2 mb-1">
          <FileCode2 className="w-4 h-4 text-[#e4f222]" />
          <span className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider">
            Scientific Open Science & Integrity
          </span>
        </div>
        <h1 className="text-2xl font-[510] text-[#ffffff] tracking-[-0.022em]">
          Artifacts & Reproducibility Suite
        </h1>
        <p className="text-xs text-[#8a8f98] mt-1 max-w-[700px]">
          Every scientific run in Axiom produces self-contained artifacts: standalone Julia replication code, serialized metadata manifests, and CSV evaluation grids.
        </p>
      </div>

      {experiments.length === 0 ? (
        <div className="bg-[#0f1011] rounded-[12px] p-12 text-center shadow-[inset_0_0_0_1px_#23252a] text-xs text-[#8a8f98]">
          No experiments available to reproduce yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Experiment Selector */}
          <div className="lg:col-span-4 space-y-2">
            <span className="text-xs font-mono text-[#8a8f98] block mb-1">
              Select Experiment to Reproduce:
            </span>
            {experiments.map((exp) => {
              const isSelected = exp.id === selectedExpId;
              return (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExpId(exp.id)}
                  className={`p-3.5 rounded-[12px] cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[#161718] border-[#383b3f] shadow-[0_4px_12px_rgba(0,0,0,0.5)]'
                      : 'bg-[#0f1011] border-[#23252a] hover:border-[#383b3f]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#ffffff] truncate max-w-[180px]">
                      {exp.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#e4f222]">
                      {exp.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#8a8f98]">
                    {exp.equationId} · {exp.createdAt.slice(0, 10)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Reproducibility Details & Exports */}
          {selectedExp && (
            <div className="lg:col-span-8 space-y-4">
              {/* Action Toolbar */}
              <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#27a644]" />
                  <span className="text-xs font-medium text-[#ffffff]">
                    100% Deterministic Replication Package
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="btn-ghost"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#27a644]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied Code!' : 'Copy Script'}</span>
                  </button>

                  <a
                    href={`/api/v1/experiments/${selectedExp.id}/export/julia`}
                    download
                    className="btn-ghost text-[#e4f222]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .jl</span>
                  </a>

                  <a
                    href={`/api/v1/experiments/${selectedExp.id}/export/csv`}
                    download
                    className="btn-ghost text-[#02b8cc]"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </a>

                  <a
                    href={`/api/v1/experiments/${selectedExp.id}/export/json`}
                    download
                    className="btn-primary-action"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Manifest JSON</span>
                  </a>
                </div>
              </div>

              {/* Terminal Instructions */}
              <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] space-y-3">
                <h4 className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider">
                  Independent Verification Command
                </h4>
                <div className="bg-[#08090a] p-3 rounded-[6px] border border-[#23252a] font-mono text-xs text-[#02b8cc] flex items-center justify-between">
                  <code>julia axiom_reproduce_{selectedExp.id.slice(0, 8)}.jl</code>
                  <span className="text-[10px] text-[#62666d]">No server required</span>
                </div>
                <p className="text-xs text-[#8a8f98] leading-relaxed">
                  The generated script is completely self-contained. It instantiates the exact Lux model architecture, seeds the RNG, optimizes the collocation points, and independently verifies the output against the analytical solution.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
