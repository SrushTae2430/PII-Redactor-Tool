import React from 'react';
import { ShieldCheck, Trash2, Cpu, UserCheck } from 'lucide-react';

interface NavbarProps {
  userEmail: string | null;
  onWipeData: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ userEmail, onWipeData }) => {
  return (
    <header className="bg-navy-900 text-white border-b border-navy-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">PII SHIELD</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/30">
                PROD
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Zero-Retention Document Sanitizer</p>
          </div>
        </div>

        {/* Center: Active Engine Badge */}
        <div className="hidden md:flex items-center space-x-2 bg-navy-800/80 px-3.5 py-1.5 rounded-full border border-navy-700">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <Cpu className="w-4 h-4 text-emerald-400 ml-1" />
          <span className="text-xs font-medium text-slate-200">Local-First Engine Active</span>
          <span className="text-slate-500 font-mono text-[10px]">| ZERO RETENTION</span>
        </div>

        {/* User Session Actions */}
        <div className="flex items-center space-x-3">
          {userEmail && (
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-300 bg-navy-800 px-3 py-1.5 rounded-lg border border-navy-700">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[140px] truncate">{userEmail}</span>
            </div>
          )}

          <button
            onClick={onWipeData}
            title="Purge all in-memory file buffers, active tags, and session tokens instantly"
            className="flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Wipe All Session Data</span>
          </button>
        </div>

      </div>
    </header>
  );
};
