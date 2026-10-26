import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  variant?: 'default' | 'accent' | 'pulse' | 'coral';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  variant = 'default',
}) => {
  const getAccentClass = () => {
    switch (variant) {
      case 'accent':
        return 'text-[#e4f222]';
      case 'pulse':
        return 'text-[#27a644]';
      case 'coral':
        return 'text-[#eb5757]';
      default:
        return 'text-[#ffffff]';
    }
  };

  return (
    <div className="bg-[#0f1011] rounded-[12px] p-4 shadow-[inset_0_0_0_1px_#23252a] flex flex-col justify-between">
      <div className="text-[11px] uppercase tracking-wider text-[#8a8f98] font-mono mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 my-1">
        <span className={`text-2xl font-mono tracking-tight font-medium ${getAccentClass()}`}>
          {value}
        </span>
        {unit && <span className="text-xs text-[#8a8f98] font-mono">{unit}</span>}
      </div>
      {subtext && (
        <div className="text-[11px] text-[#62666d] font-sans mt-1">
          {subtext}
        </div>
      )}
    </div>
  );
};
