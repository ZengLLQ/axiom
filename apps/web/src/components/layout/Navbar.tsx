import React from 'react';
import { 
  Activity, 
  FlaskConical, 
  BookOpen, 
  Layers, 
  LineChart, 
  Shuffle, 
  FileCode2, 
  Cpu, 
  Sparkles 
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onNewExperiment: () => void;
  systemStatus?: string;
  juliaVersion?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onNewExperiment,
  systemStatus = 'ONLINE',
  juliaVersion = '1.13.3',
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'studio', label: 'Studio', icon: FlaskConical },
    { id: 'equations', label: 'Equations', icon: BookOpen },
    { id: 'results', label: 'Results', icon: LineChart },
    { id: 'inverse', label: 'Inverse Problems', icon: Shuffle },
    { id: 'benchmarks', label: 'Benchmarks', icon: Layers },
    { id: 'reproduce', label: 'Reproducibility', icon: FileCode2 },
    { id: 'settings', label: 'System', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#08090a]/90 backdrop-blur-md border-b border-[#23252a] px-4 lg:px-8 py-2.5">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div 
            onClick={() => onSelectTab('overview')} 
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-[6px] bg-[#0f1011] border border-[#23252a] flex items-center justify-center text-[#e4f222] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] group-hover:border-[#383b3f] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-[510] tracking-[-0.022em] text-[#ffffff] leading-tight">
                AXIOM
              </span>
              <span className="text-[9px] font-mono tracking-wider text-[#8a8f98] uppercase">
                Scientific AI Lab
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] font-normal transition-all ${
                    isActive
                      ? 'bg-[#161718] text-[#ffffff] shadow-[inset_0_0_0_1px_#23252a]'
                      : 'text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#0f1011]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#e4f222]' : 'text-[#62666d]'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Status Pill */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.03)] border border-[#23252a] text-[11px] font-mono text-[#8a8f98]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#27a644] animate-pulse" />
            <span>Julia {juliaVersion}</span>
            <span className="text-[#383b3f]">/</span>
            <span className="text-[#d0d6e0]">{systemStatus}</span>
          </div>

          {/* Linear Primary Action Button (Acid Lime) */}
          <button
            onClick={onNewExperiment}
            className="btn-primary-action shadow-[0_0_14px_rgba(228,242,34,0.25)]"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>New Experiment</span>
          </button>
        </div>
      </div>
    </header>
  );
};
