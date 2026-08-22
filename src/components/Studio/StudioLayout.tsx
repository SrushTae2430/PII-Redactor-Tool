import React, { useState } from 'react';
import { ShieldCheck, Trash2, ArrowLeft } from 'lucide-react';
import { InspectionPanel } from './InspectionPanel';
import { DocumentCanvas } from './DocumentCanvas';
import { AuditModal } from './AuditModal';
import type { ProcessedDocument, PIIEntity, ProcessingOptions, RiskMetrics, AuditCertificate } from '../../types';
import { redactDocumentApi } from '../../services/api';

interface StudioLayoutProps {
  doc: ProcessedDocument;
  rawFile: File;
  initialOptions: ProcessingOptions;
  onBackToDashboard: () => void;
}

export const StudioLayout: React.FC<StudioLayoutProps> = ({
  doc,
  rawFile,
  initialOptions,
  onBackToDashboard
}) => {
  const [entities, setEntities] = useState<PIIEntity[]>(() => {
    const all: PIIEntity[] = [];
    doc.pages.forEach((p) => {
      p.entities.forEach((e) => {
        all.push({ ...e, page: p.page_number });
      });
    });
    return all;
  });

  const [options, setOptions] = useState<ProcessingOptions>(initialOptions);
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [sanitizedBlob, setSanitizedBlob] = useState<Blob | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [auditCert, setAuditCert] = useState<AuditCertificate | null>(null);
  const [loadingRedaction, setLoadingRedaction] = useState<boolean>(false);

  const handleToggleEntity = (id: string) => {
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, active: !e.active } : e))
    );
  };

  const handleToggleCategory = (category: 'DIRECT' | 'INDIRECT' | 'VISUAL', active: boolean) => {
    setEntities((prev) =>
      prev.map((e) => (e.category === category ? { ...e, active } : e))
    );
  };

  const handleAddManualEntity = (bbox: [number, number, number, number], pageNumber: number) => {
    const newEntity: PIIEntity = {
      id: `manual_${Date.now()}`,
      text: '[CUSTOM_MANUAL_REDACTION]',
      type: 'MANUAL_REDACTION',
      category: 'MANUAL',
      bbox,
      confidence: 1.0,
      active: true,
      page: pageNumber
    };
    setEntities((prev) => [...prev, newEntity]);
  };

  const handleClearAllChanges = () => {
    setEntities((prev) => prev.map((e) => ({ ...e, active: false })));
  };

  const handleApplyRedaction = async () => {
    setLoadingRedaction(true);
    const activeList = entities.filter((e) => e.active);
    const canaryId = doc.canary_data?.canary_id;

    const res = await redactDocumentApi(rawFile, activeList, options, canaryId);
    setSanitizedBlob(res.blob);
    setRiskMetrics(res.riskMetrics);
    setAuditCert(res.auditCert);
    setLoadingRedaction(false);
    setAuditModalOpen(true);
  };

  const handleDownloadSanitizedDoc = () => {
    if (!sanitizedBlob) return;
    const url = URL.createObjectURL(sanitizedBlob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `sanitized_${doc.filename}`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAuditCert = () => {
    if (!auditCert) return;
    const certJson = JSON.stringify(auditCert, null, 2);
    const blob = new Blob([certJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `audit_certificate_${doc.filename}.json`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Top Breadcrumb Header Bar */}
      <div className="h-10 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center space-x-2 text-slate-600">
          <button
            onClick={onBackToDashboard}
            className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <span>/</span>
          <span className="font-bold text-navy-900 truncate max-w-[240px]">{doc.filename}</span>
        </div>

        <div className="flex items-center space-x-3 text-slate-500 font-mono text-[11px]">
          <span>{doc.total_pages} Pages</span>
          <span>•</span>
          <span>{entities.filter((e) => e.active).length} Redaction Targets</span>
        </div>
      </div>

      {/* Two Column Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <InspectionPanel
          entities={entities}
          onToggleEntity={handleToggleEntity}
          onToggleCategory={handleToggleCategory}
          options={options}
          onOptionsChange={setOptions}
          rawMetadata={doc.raw_metadata}
          promptInjectionStatus={doc.prompt_injection_status}
          canaryId={doc.canary_data?.canary_id}
        />

        <DocumentCanvas
          pages={doc.pages}
          entities={entities}
          onToggleEntity={handleToggleEntity}
          onAddManualEntity={handleAddManualEntity}
          redactionMode={options.redactionMode}
        />
      </div>

      {/* Bottom Fixed Action Bar */}
      <footer className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-lg z-40">
        <button
          onClick={handleClearAllChanges}
          className="text-xs font-semibold text-slate-600 hover:text-rose-600 flex items-center space-x-1.5 transition-all"
        >
          <Trash2 className="w-4 h-4 text-slate-400" />
          <span>Clear All Changes</span>
        </button>

        <div className="flex items-center space-x-3">
          <span className="hidden sm:inline text-xs text-slate-500 font-medium">
            {entities.filter((e) => e.active).length} entities ready for physical stream scrub
          </span>

          <button
            onClick={handleApplyRedaction}
            disabled={loadingRedaction}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center space-x-2"
          >
            {loadingRedaction ? (
              <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
            ) : (
              <>
                <ShieldCheck className="w-4.5 h-4.5 text-white" />
                <span>Apply True Redaction & View Audit</span>
              </>
            )}
          </button>
        </div>
      </footer>

      {/* Audit & Risk Modal */}
      {riskMetrics && auditCert && (
        <AuditModal
          isOpen={auditModalOpen}
          filename={doc.filename}
          riskMetrics={riskMetrics}
          auditCert={auditCert}
          onDownloadDocument={handleDownloadSanitizedDoc}
          onDownloadAuditCert={handleDownloadAuditCert}
          onProcessAnother={onBackToDashboard}
          onClose={() => setAuditModalOpen(false)}
        />
      )}

    </div>
  );
};
