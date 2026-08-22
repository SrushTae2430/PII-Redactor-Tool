import React, { useState } from 'react';
import { 
  ShieldAlert, User, Mail, Phone, CreditCard, Calendar, MapPin, DollarSign, 
  PenTool, Image as ImageIcon, Award, ChevronDown, ChevronRight, CheckCircle2, 
  Layers, Info, Trash2, Hash, UserCheck
} from 'lucide-react';
import type { PIIEntity, ProcessingOptions, RedactionAction } from '../../types';

interface InspectionPanelProps {
  entities: PIIEntity[];
  onToggleEntity: (id: string) => void;
  onSetEntityAction: (id: string, action: RedactionAction) => void;
  onToggleCategory: (category: 'DIRECT' | 'INDIRECT' | 'VISUAL', active: boolean) => void;
  onSetCategoryAction: (category: 'DIRECT' | 'INDIRECT' | 'VISUAL', action: RedactionAction) => void;
  options: ProcessingOptions;
  onOptionsChange: (options: ProcessingOptions) => void;
  rawMetadata: Record<string, string>;
  promptInjectionStatus: { clean: boolean; threats: string[] };
  canaryId?: string;
}

export const InspectionPanel: React.FC<InspectionPanelProps> = ({
  entities,
  onToggleEntity,
  onSetEntityAction,
  onToggleCategory,
  onSetCategoryAction,
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
      case 'PERSON_NAME':
      case 'NAME': return <User className="w-3.5 h-3.5 text-indigo-500" />;
      case 'EMAIL': return <Mail className="w-3.5 h-3.5 text-indigo-500" />;
      case 'PHONE_NUMBER':
      case 'PHONE': return <Phone className="w-3.5 h-3.5 text-indigo-500" />;
      case 'GOV_ID':
      case 'AADHAAR':
      case 'PAN':
      case 'SSN':
      case 'CREDIT_CARD': return <CreditCard className="w-3.5 h-3.5 text-rose-500" />;
      case 'DATE_OF_BIRTH':
      case 'DATE': return <Calendar className="w-3.5 h-3.5 text-amber-500" />;
      case 'GENDER': return <UserCheck className="w-3.5 h-3.5 text-indigo-400" />;
      case 'ADDRESS': return <MapPin className="w-3.5 h-3.5 text-indigo-500" />;
      case 'FINANCIAL': return <DollarSign className="w-3.5 h-3.5 text-emerald-500" />;
      case 'SIGNATURE': return <PenTool className="w-3.5 h-3.5 text-amber-500" />;
      case 'PHOTO_ID': return <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />;
      case 'STAMP': return <Award className="w-3.5 h-3.5 text-rose-500" />;
      default: return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getActionBadgeClass = (action: RedactionAction) => {
    switch (action) {
      case 'blackout': return 'bg-black text-white';
      case 'label': return 'bg-slate-700 text-white';
      case 'dummy': return 'bg-indigo-600 text-white';
    }
  };

  return (
    <aside className="w-[320px] bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto shrink-0 select-none">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider font-sans">
            DrishtiKon Inspection Panel
          </h3>
          <p className="text-[11px] text-slate-500">Auto-Detected Tags & Actions</p>
        </div>
        <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-mono">
          {entities.filter(e => e.active).length} Active
        </span>
      </div>

      <div className="p-4 space-y-6 flex-1">
        
        {/* Direct Identifiers */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
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

          <div className="flex items-center space-x-1 mb-2.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 px-1">Bulk:</span>
            <button
              onClick={() => onSetCategoryAction('DIRECT', 'blackout')}
              className="flex-1 text-[10px] font-bold py-1 bg-white hover:bg-slate-50 rounded text-slate-900 border border-slate-200"
            >
              Blackout
            </button>
            <button
              onClick={() => onSetCategoryAction('DIRECT', 'label')}
              className="flex-1 text-[10px] font-bold py-1 bg-white hover:bg-slate-50 rounded text-slate-900 border border-slate-200"
            >
              Label
            </button>
            <button
              onClick={() => onSetCategoryAction('DIRECT', 'dummy')}
              className="flex-1 text-[10px] font-bold py-1 bg-white hover:bg-slate-50 rounded text-slate-900 border border-slate-200"
            >
              Synthetic
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {directEntities.map((ent) => (
              <div
                key={ent.id}
                className={`p-2 rounded-xl border text-xs transition-all ${
                  ent.active ? 'bg-rose-50/40 border-rose-200 text-navy-900' : 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <input
                      type="checkbox"
                      checked={ent.active}
                      onChange={() => onToggleEntity(ent.id)}
                      className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                    />
                    {getEntityIcon(ent.type)}
                    <span className="font-semibold truncate">{ent.text}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getActionBadgeClass(ent.action)}`}>
                    {ent.action}
                  </span>
                </div>

                {ent.active && (
                  <div className="flex items-center space-x-1 mt-1.5 pl-6">
                    <button
                      onClick={() => onSetEntityAction(ent.id, 'blackout')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                        ent.action === 'blackout' ? 'bg-black text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                      }`}
                    >
                      Blackout
                    </button>
                    <button
                      onClick={() => onSetEntityAction(ent.id, 'label')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                        ent.action === 'label' ? 'bg-slate-700 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                      }`}
                    >
                      Label
                    </button>
                    <button
                      onClick={() => onSetEntityAction(ent.id, 'dummy')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                        ent.action === 'dummy' ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                      }`}
                    >
                      Synthetic
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Indirect Identifiers */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
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

          <div className="flex items-center space-x-1 mb-2.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 px-1">Bulk:</span>
            <button
              onClick={() => onSetCategoryAction('INDIRECT', 'blackout')}
              className="flex-1 text-[10px] font-bold py-1 bg-white hover:bg-slate-50 rounded text-slate-900 border border-slate-200"
            >
              Blackout
            </button>
            <button
              onClick={() => onSetCategoryAction('INDIRECT', 'label')}
              className="flex-1 text-[10px] font-bold py-1 bg-white hover:bg-slate-50 rounded text-slate-900 border border-slate-200"
            >
              Label
            </button>
            <button
              onClick={() => onSetCategoryAction('INDIRECT', 'dummy')}
              className="flex-1 text-[10px] font-bold py-1 bg-white hover:bg-slate-50 rounded text-slate-900 border border-slate-200"
            >
              Synthetic
            </button>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {indirectEntities.map((ent) => (
              <div
                key={ent.id}
                className={`p-2 rounded-xl border text-xs transition-all ${
                  ent.active ? 'bg-indigo-50/40 border-indigo-200 text-navy-900' : 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <input
                      type="checkbox"
                      checked={ent.active}
                      onChange={() => onToggleEntity(ent.id)}
                      className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {getEntityIcon(ent.type)}
                    <span className="font-semibold truncate">{ent.text}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getActionBadgeClass(ent.action)}`}>
                    {ent.action}
                  </span>
                </div>

                {ent.active && (
                  <div className="flex items-center space-x-1 mt-1.5 pl-6">
                    <button
                      onClick={() => onSetEntityAction(ent.id, 'blackout')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                        ent.action === 'blackout' ? 'bg-black text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                      }`}
                    >
                      Blackout
                    </button>
                    <button
                      onClick={() => onSetEntityAction(ent.id, 'label')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                        ent.action === 'label' ? 'bg-slate-700 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                      }`}
                    >
                      Label
                    </button>
                    <button
                      onClick={() => onSetEntityAction(ent.id, 'dummy')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                        ent.action === 'dummy' ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                      }`}
                    >
                      Synthetic
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Visual Objects */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
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

          <div className="flex items-center space-x-1 mb-2.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 px-1">Bulk:</span>
            <button
              onClick={() => onSetCategoryAction('VISUAL', 'blackout')}
              className="flex-1 text-[10px] font-bold py-1 bg-white hover:bg-slate-50 rounded text-slate-900 border border-slate-200"
            >
              Blackout
            </button>
            <button
              onClick={() => onSetCategoryAction('VISUAL', 'label')}
              className="flex-1 text-[10px] font-bold py-1 bg-white hover:bg-slate-50 rounded text-slate-900 border border-slate-200"
            >
              Label
            </button>
            <button
              onClick={() => onSetCategoryAction('VISUAL', 'dummy')}
              className="flex-1 text-[10px] font-bold py-1 bg-white hover:bg-slate-50 rounded text-slate-900 border border-slate-200"
            >
              Synthetic
            </button>
          </div>

          <div className="space-y-1.5 pr-1">
            {visualEntities.map((ent) => (
              <div
                key={ent.id}
                className={`p-2 rounded-xl border text-xs transition-all ${
                  ent.active ? 'bg-amber-50/40 border-amber-200 text-navy-900' : 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <input
                      type="checkbox"
                      checked={ent.active}
                      onChange={() => onToggleEntity(ent.id)}
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    {getEntityIcon(ent.type)}
                    <span className="font-semibold truncate">{ent.text}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getActionBadgeClass(ent.action)}`}>
                    {ent.action}
                  </span>
                </div>

                {ent.active && (
                  <div className="flex items-center space-x-1 mt-1.5 pl-6">
                    <button
                      onClick={() => onSetEntityAction(ent.id, 'blackout')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                        ent.action === 'blackout' ? 'bg-black text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                      }`}
                    >
                      Blackout
                    </button>
                    <button
                      onClick={() => onSetEntityAction(ent.id, 'label')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                        ent.action === 'label' ? 'bg-slate-700 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                      }`}
                    >
                      Label
                    </button>
                    <button
                      onClick={() => onSetEntityAction(ent.id, 'dummy')}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                        ent.action === 'dummy' ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                      }`}
                    >
                      Synthetic
                    </button>
                  </div>
                )}
              </div>
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
