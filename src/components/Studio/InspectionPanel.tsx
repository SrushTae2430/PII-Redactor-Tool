import React, { useState } from 'react';
import { 
  ShieldAlert, User, Mail, Phone, CreditCard, Calendar, MapPin, DollarSign, 
  PenTool, Image as ImageIcon, Award, ChevronDown, ChevronRight, CheckCircle2, 
  Layers, Info, Trash2, Hash
} from 'lucide-react';
import type { PIIEntity, ProcessingOptions } from '../../types';

interface InspectionPanelProps {
  entities: PIIEntity[];
  onToggleEntity: (id: string) => void;
  onToggleCategory: (category: 'DIRECT' | 'INDIRECT' | 'VISUAL', active: boolean) => void;
  options: ProcessingOptions;
  onOptionsChange: (options: ProcessingOptions) => void;
  rawMetadata: Record<string, string>;
  promptInjectionStatus: { clean: boolean; threats: string[] };
  canaryId?: string;
}

export const InspectionPanel: React.FC<InspectionPanelProps> = ({
  entities,
  onToggleEntity,
  onToggleCategory,
  options,
  onOptionsChange,
  rawMetadata,
  canaryId
}) => {
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [defenseOpen, setDefenseOpen] = useState(true);

  const directEntities = entities.filter(e => e.category === 'DIRECT');
  const indirectEntities = entities.filter(e => e.category === 'INDIRECT');
  const visualEntities = entities.filter(e => e.category === 'VISUAL');
  const manualEntities = entities.filter(e => e.category === 'MANUAL');

  const allDirectActive = directEntities.length > 0 && directEntities.every(e => e.active);
  const allIndirectActive = indirectEntities.length > 0 && indirectEntities.every(e => e.active);
  const allVisualActive = visualEntities.length > 0 && visualEntities.every(e => e.active);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'NAME': return <User className="w-3.5 h-3.5 text-indigo-500" />;
      case 'EMAIL': return <Mail className="w-3.5 h-3.5 text-indigo-500" />;
      case 'PHONE': return <Phone className="w-3.5 h-3.5 text-indigo-500" />;
      case 'AADHAAR':
      case 'PAN':
      case 'SSN':
      case 'CREDIT_CARD': return <CreditCard className="w-3.5 h-3.5 text-rose-500" />;
      case 'DATE': return <Calendar className="w-3.5 h-3.5 text-amber-500" />;
      case 'ADDRESS': return <MapPin className="w-3.5 h-3.5 text-indigo-500" />;
      case 'FINANCIAL': return <DollarSign className="w-3.5 h-3.5 text-emerald-500" />;
      case 'SIGNATURE': return <PenTool className="w-3.5 h-3.5 text-amber-500" />;
      case 'PHOTO_ID': return <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />;
      case 'STAMP': return <Award className="w-3.5 h-3.5 text-rose-500" />;
      default: return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <aside className="w-[320px] bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto shrink-0 select-none">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
            Inspection Panel
          </h3>
          <p className="text-[11px] text-slate-500">Detected PII Tags & Category Toggles</p>
        </div>
        <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
          {entities.filter(e => e.active).length} Active
        </span>
      </div>

      <div className="p-4 space-y-6 flex-1">
        
        {/* Direct Identifiers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-900 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Direct Identifiers ({directEntities.length})</span>
            </span>
            <button
              onClick={() => onToggleCategory('DIRECT', !allDirectActive)}
              className="text-[11px] text-indigo-600 font-semibold hover:underline"
            >
              {allDirectActive ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {directEntities.map((ent) => (
              <label
                key={ent.id}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                  ent.active ? 'bg-rose-50/50 border-rose-200 text-navy-900' : 'bg-slate-50/50 border-slate-200 text-slate-400 line-through'
                }`}
              >
                <div className="flex items-center space-x-2 truncate pr-2">
                  <input
                    type="checkbox"
                    checked={ent.active}
                    onChange={() => onToggleEntity(ent.id)}
                    className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                  />
                  {getEntityIcon(ent.type)}
                  <span className="font-medium truncate">{ent.text}</span>
                </div>
                <span className="text-[10px] font-mono font-semibold bg-white px-1.5 py-0.5 rounded border text-slate-500">
                  {ent.type}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Indirect Identifiers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-900 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>Indirect Identifiers ({indirectEntities.length})</span>
            </span>
            <button
              onClick={() => onToggleCategory('INDIRECT', !allIndirectActive)}
              className="text-[11px] text-indigo-600 font-semibold hover:underline"
            >
              {allIndirectActive ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {indirectEntities.map((ent) => (
              <label
                key={ent.id}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                  ent.active ? 'bg-indigo-50/50 border-indigo-200 text-navy-900' : 'bg-slate-50/50 border-slate-200 text-slate-400 line-through'
                }`}
              >
                <div className="flex items-center space-x-2 truncate pr-2">
                  <input
                    type="checkbox"
                    checked={ent.active}
                    onChange={() => onToggleEntity(ent.id)}
                    className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {getEntityIcon(ent.type)}
                  <span className="font-medium truncate">{ent.text}</span>
                </div>
                <span className="text-[10px] font-mono font-semibold bg-white px-1.5 py-0.5 rounded border text-slate-500">
                  {ent.type}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Visual Objects */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-900 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Visual Artifacts ({visualEntities.length})</span>
            </span>
            <button
              onClick={() => onToggleCategory('VISUAL', !allVisualActive)}
              className="text-[11px] text-indigo-600 font-semibold hover:underline"
            >
              {allVisualActive ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-1.5 pr-1">
            {visualEntities.map((ent) => (
              <label
                key={ent.id}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                  ent.active ? 'bg-amber-50/50 border-amber-200 text-navy-900' : 'bg-slate-50/50 border-slate-200 text-slate-400 line-through'
                }`}
              >
                <div className="flex items-center space-x-2 truncate pr-2">
                  <input
                    type="checkbox"
                    checked={ent.active}
                    onChange={() => onToggleEntity(ent.id)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  {getEntityIcon(ent.type)}
                  <span className="font-medium truncate">{ent.text}</span>
                </div>
                <span className="text-[10px] font-mono font-semibold bg-white px-1.5 py-0.5 rounded border text-slate-500">
                  {ent.type}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Manual Redactions */}
        {manualEntities.length > 0 && (
          <div>
            <span className="text-xs font-bold text-navy-900 flex items-center space-x-1.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Manual Custom Redactions ({manualEntities.length})</span>
            </span>
            <div className="space-y-1.5 pr-1">
              {manualEntities.map((ent) => (
                <div key={ent.id} className="flex items-center justify-between p-2 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs">
                  <span className="font-semibold text-emerald-900">Custom Box ({ent.bbox[2]}x{ent.bbox[3]}px)</span>
                  <button onClick={() => onToggleEntity(ent.id)} className="text-rose-600 font-bold hover:underline">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Redaction Mode Selector */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-2.5">
            Redaction Mode
          </h4>
          <div className="space-y-2">
            <label className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
              options.redactionMode === 'BLACKOUT' ? 'bg-navy-900 text-white border-navy-900 shadow-sm' : 'bg-slate-50 border-slate-200 text-navy-900'
            }`}>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="redaction_mode"
                  checked={options.redactionMode === 'BLACKOUT'}
                  onChange={() => onOptionsChange({ ...options, redactionMode: 'BLACKOUT' })}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold block">Blackout Bar</span>
                  <span className="text-[10px] opacity-80">Solid black physical cover</span>
                </div>
              </div>
            </label>

            <label className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
              options.redactionMode === 'SYNTHETIC_LABEL' ? 'bg-navy-900 text-white border-navy-900 shadow-sm' : 'bg-slate-50 border-slate-200 text-navy-900'
            }`}>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="redaction_mode"
                  checked={options.redactionMode === 'SYNTHETIC_LABEL'}
                  onChange={() => onOptionsChange({ ...options, redactionMode: 'SYNTHETIC_LABEL' })}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold block">[REDACTED_TYPE] Tag</span>
                  <span className="text-[10px] opacity-80">Replaces text with type label</span>
                </div>
              </div>
            </label>

            <label className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
              options.redactionMode === 'SMART_DUMMY' ? 'bg-navy-900 text-white border-navy-900 shadow-sm' : 'bg-slate-50 border-slate-200 text-navy-900'
            }`}>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="redaction_mode"
                  checked={options.redactionMode === 'SMART_DUMMY'}
                  onChange={() => onOptionsChange({ ...options, redactionMode: 'SMART_DUMMY' })}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold block">Smart Dummy Anonymize</span>
                  <span className="text-[10px] opacity-80">Swaps real data with fake values</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* AI Defenses & Metadata Collapsible Section */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setMetadataOpen(!metadataOpen)}
              className="w-full bg-slate-50 p-2.5 flex items-center justify-between text-xs font-bold text-navy-900 hover:bg-slate-100 transition-all"
            >
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Document Metadata Scanner</span>
              </div>
              {metadataOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {metadataOpen && (
              <div className="p-3 bg-white space-y-3 border-t border-slate-200 text-xs">
                {Object.keys(rawMetadata).length > 0 ? (
                  <div className="space-y-1 bg-slate-50 p-2 rounded-lg font-mono text-[11px] text-slate-700">
                    {Object.entries(rawMetadata).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="font-semibold text-slate-500">{k}:</span>
                        <span className="truncate max-w-[140px] text-navy-900">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No raw EXIF or PDF /Info headers present.</p>
                )}

                <label className="flex items-center justify-between p-2 bg-rose-50 border border-rose-200 rounded-lg cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span className="font-semibold text-rose-900 text-xs">Purge All Metadata</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={options.purgeMetadata}
                    onChange={(e) => onOptionsChange({ ...options, purgeMetadata: e.target.checked })}
                    className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setDefenseOpen(!defenseOpen)}
              className="w-full bg-slate-50 p-2.5 flex items-center justify-between text-xs font-bold text-navy-900 hover:bg-slate-100 transition-all"
            >
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                <span>AI Upload Defenses</span>
              </div>
              {defenseOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {defenseOpen && (
              <div className="p-3 bg-white space-y-3 border-t border-slate-200 text-xs">
                <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[11px] font-semibold text-emerald-900">Anti-Prompt Injection Status:</span>
                  <span className="flex items-center space-x-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Clean</span>
                  </span>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <Hash className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="font-semibold text-navy-900 text-xs">Inject Leak-Trace Canary</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={options.injectCanary}
                      onChange={(e) => onOptionsChange({ ...options, injectCanary: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>

                  {options.injectCanary && canaryId && (
                    <div className="bg-white p-2 rounded border border-slate-200 text-[11px] font-mono text-indigo-700 font-semibold break-all">
                      Tracking ID: {canaryId}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </aside>
  );
};
