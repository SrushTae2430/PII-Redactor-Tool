import React from 'react';
import { 
  ShieldCheck, Download, CheckCircle2, RotateCcw, Lock, Award
} from 'lucide-react';
import type { RiskMetrics, AuditCertificate } from '../../types';

interface AuditModalProps {
  isOpen: boolean;
  filename: string;
  riskMetrics: RiskMetrics;
  auditCert: AuditCertificate;
  onDownloadDocument: () => void;
  onDownloadAuditCert: () => void;
  onProcessAnother: () => void;
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({
  isOpen,
  filename,
  riskMetrics,
  auditCert,
  onDownloadDocument,
  onDownloadAuditCert,
  onProcessAnother
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-indigo-950 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-white">
                DrishtiKon Privacy & Risk Audit Verified
              </h3>
              <p className="text-xs text-slate-300">Document: {filename}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Top Section — Consolidated Privacy Risk Validation */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Consolidated Privacy Risk Score Metric</span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                Field-Level In-Place Scrubbed
              </span>
            </h4>

            {/* Side-by-Side Risk Metric Comparison */}
            <div className="grid grid-cols-2 gap-4 text-center">
              
              {/* Initial Risk */}
              <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm relative overflow-hidden">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
                  Initial Privacy Risk
                </span>
                <div className="text-3xl font-extrabold text-rose-600 font-mono">
                  {riskMetrics.initial_score}<span className="text-xs text-slate-400 font-normal">/100</span>
                </div>
                <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded mt-2 inline-block">
                  {riskMetrics.initial_risk_label}
                </span>
              </div>

              {/* Post Redaction Risk */}
              <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                  Post-Sanitization Risk
                </span>
                <div className="text-3xl font-extrabold text-emerald-600 font-mono">
                  {riskMetrics.post_score}<span className="text-xs text-slate-400 font-normal">/100</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded mt-2 inline-block">
                  {riskMetrics.post_risk_label}
                </span>
              </div>

            </div>

            <p className="text-xs text-slate-600 text-center mt-4 bg-white p-2.5 rounded-xl border border-slate-200 font-medium">
              "{riskMetrics.narrative_summary}"
            </p>
          </div>

          {/* Audit Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 block text-[10px]">Direct Identifiers</span>
              <span className="font-bold text-navy-900 text-sm">{riskMetrics.direct_identifiers_count} Scrubbed</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 block text-[10px]">Visual Artifacts</span>
              <span className="font-bold text-navy-900 text-sm">{riskMetrics.visual_objects_count} Removed</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 block text-[10px]">Metadata Purged</span>
              <span className="font-bold text-emerald-600 text-sm">{auditCert.metadata_stripped ? 'Purged' : 'Retained'}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 block text-[10px]">Canary Token</span>
              <span className="font-mono font-semibold text-indigo-600 text-[11px] truncate block">
                {auditCert.canary_token_registered}
              </span>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3 pt-2">
            <button
              onClick={onDownloadDocument}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download Sanitized Document</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={onDownloadAuditCert}
                className="bg-white hover:bg-slate-50 text-navy-900 border border-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center space-x-2"
              >
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Download Audit Log (.json)</span>
              </button>

              <button
                onClick={onProcessAnother}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Process Another File</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Guarantee */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zero Server Retention Verified</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">ID: {auditCert.certificate_id}</span>
        </div>

      </div>
    </div>
  );
};
