
import React from 'react';
import { AppTab } from '../types';
import { TrendingUp, Briefcase, Cpu } from 'lucide-react';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="sticky top-0 z-50 glass-effect border-b border-white/10 px-4 md:px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab(AppTab.MARKET)}>
        <div className="bg-emerald-500 p-1.5 rounded-lg">
          <TrendingUp className="text-white w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tighter text-white">Nexora</h1>
      </div>

      <div className="flex gap-4 md:gap-8">
        <button
          onClick={() => setActiveTab(AppTab.MARKET)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
            activeTab === AppTab.MARKET ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp size={18} />
          <span className="hidden md:inline font-medium">Market</span>
        </button>
        <button
          onClick={() => setActiveTab(AppTab.PORTFOLIO)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
            activeTab === AppTab.PORTFOLIO ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Briefcase size={18} />
          <span className="hidden md:inline font-medium">Portfolio</span>
        </button>
        <button
          onClick={() => setActiveTab(AppTab.AI_INSIGHTS)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
            activeTab === AppTab.AI_INSIGHTS ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu size={18} />
          <span className="hidden md:inline font-medium">AI Insights</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
