import React from 'react';
import { SystemCapabilities } from '../../types';
import { MetricCard } from '../../components/ui/MetricCard';
import { Cpu } from 'lucide-react';

interface SettingsViewProps {
  capabilities: SystemCapabilities | null;
  health: { status: string; service: string; version: string; juliaVersion: string } | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  capabilities,
  health,
}) => {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto py-6">
      {/* Header */}
      <div className="border-b border-[#23252a] pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-4 h-4 text-[#e4f222]" />
          <span className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider">
            Infrastructure & Diagnostics
          </span>
        </div>
        <h1 className="text-2xl font-[510] text-[#ffffff] tracking-[-0.022em]">
          Scientific Engine Capabilities & System Architecture
        </h1>
        <p className="text-xs text-[#8a8f98] mt-1 max-w-[700px]">
          Runtime specifications, linear algebra compute backends, Julia package environments, and persistent SQLite database configuration.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Julia Runtime"
          value={capabilities?.juliaVersion ?? health?.juliaVersion ?? '1.13.3'}
          subtext="Official Julia Environment"
        />
        <MetricCard
          label="Compute Engine"
          value="CPU BLAS"
          variant="accent"
          subtext="Vectorized Multi-Point ForwardPass"
        />
        <MetricCard
          label="Precision Mode"
          value="Float32"
          subtext="IEEE 754 High Efficiency"
        />
        <MetricCard
          label="API Service"
          value={health?.status?.toUpperCase() ?? 'HEALTHY'}
          variant="pulse"
          subtext="HTTP.jl v2.12 Async Router"
        />
      </div>

      {/* Architecture Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Scientific Dependencies */}
        <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] space-y-4">
          <h3 className="text-sm font-medium text-[#ffffff] border-b border-[#23252a] pb-2">
            Scientific Compute Stack
          </h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">Neural Framework:</span>
              <span className="text-[#ffffff]">Lux.jl (Pure Functional Layers)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">Parameter Containers:</span>
              <span className="text-[#ffffff]">ComponentArrays.jl</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">Reverse-Mode AD:</span>
              <span className="text-[#ffffff]">Zygote.jl (Source-to-Source)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">Forward-Mode AD:</span>
              <span className="text-[#ffffff]">ForwardDiff.jl (Dual Numbers)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">Gradient Optimizers:</span>
              <span className="text-[#ffffff]">Optimisers.jl (Adam / L-BFGS)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">Independent Numerical Solver:</span>
              <span className="text-[#27a644]">Method of Lines (MOL) RK4</span>
            </div>
          </div>
        </div>

        {/* Right: Storage & Telemetry */}
        <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] space-y-4">
          <h3 className="text-sm font-medium text-[#ffffff] border-b border-[#23252a] pb-2">
            Storage, Database & Network
          </h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">Primary Database:</span>
              <span className="text-[#ffffff]">SQLite (WAL Mode)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">Event Streaming:</span>
              <span className="text-[#02b8cc]">Server-Sent Events (SSE)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">Artifact Store:</span>
              <span className="text-[#ffffff]">f:\Axiom\artifacts</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">API Base Prefix:</span>
              <span className="text-[#ffffff]">/api/v1</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">Web Server Port:</span>
              <span className="text-[#ffffff]">127.0.0.1:8080</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#23252a]">
              <span className="text-[#8a8f98]">Frontend Bundler:</span>
              <span className="text-[#ffffff]">Vite 6 + React 19</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
