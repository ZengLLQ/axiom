import React from 'react';

interface ValidationBadgeProps {
  status: 'passed' | 'failed' | 'inconclusive' | 'not_evaluated' | 'running' | 'draft' | 'completed' | 'stopped';
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase();

  if (normalized === 'passed' || normalized === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium bg-[rgba(39,166,68,0.12)] text-[#27a644] border border-[rgba(39,166,68,0.3)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
        PASSED
      </span>
    );
  }

  if (normalized === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium bg-[rgba(235,87,87,0.12)] text-[#eb5757] border border-[rgba(235,87,87,0.3)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#eb5757]" />
        FAILED
      </span>
    );
  }

  if (normalized === 'running') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium bg-[rgba(2,184,204,0.12)] text-[#02b8cc] border border-[rgba(2,184,204,0.3)] animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-[#02b8cc]" />
        TRAINING
      </span>
    );
  }

  if (normalized === 'inconclusive') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium bg-[rgba(139,92,246,0.12)] text-[#8b5cf6] border border-[rgba(139,92,246,0.3)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
        INCONCLUSIVE
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium bg-[rgba(255,255,255,0.05)] text-[#8a8f98] border border-[#23252a]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#8a8f98]" />
      {normalized.toUpperCase()}
    </span>
  );
};
