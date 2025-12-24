
import React from 'react';
import { Portfolio, Stock } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStatsProps {
  portfolio: Portfolio;
  stocks: Stock[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ portfolio, stocks }) => {
  // Simple performance tracker (mocking some history based on market movements for visuals)
  const data = [
    { name: 'Mon', value: 480000 },
    { name: 'Tue', value: 492000 },
    { name: 'Wed', value: 485000 },
    { name: 'Thu', value: 502000 },
    { name: 'Fri', value: portfolio.balance + portfolio.holdings.reduce((acc, h) => acc + (h.quantity * (stocks.find(s => s.Symbol === h.symbol)?.LTP || 0)), 0) }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 glass-effect p-6 rounded-3xl border border-white/10 h-64 md:h-80">
        <h3 className="text-slate-400 font-semibold mb-4">Portfolio Value Over Time (Simulated)</h3>
        <ResponsiveContainer width="100%" height="80%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
              itemStyle={{ color: '#10b981' }}
            />
            <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-emerald-600/10 border border-emerald-500/20 p-5 rounded-3xl flex-1 flex flex-col justify-center">
          <p className="text-emerald-400/60 text-sm font-medium">Market Pulse</p>
          <p className="text-2xl font-bold text-emerald-400">Bullish</p>
          <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="w-[72%] h-full bg-emerald-500 rounded-full"></div>
          </div>
        </div>
        
        <div className="bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-3xl flex-1 flex flex-col justify-center">
          <p className="text-indigo-400/60 text-sm font-medium">Top Gainer</p>
          <p className="text-2xl font-bold text-indigo-400">
            {stocks.sort((a,b) => b.Change - a.Change)[0]?.Symbol || '---'}
          </p>
          <p className="text-xs text-indigo-300">
            +{stocks.sort((a,b) => b.Change - a.Change)[0]?.Change.toFixed(2)}% Today
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
