import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ProcessingOptions, ProcessedDocument } from '../../types';
import { processDocumentApi } from '../../services/api';

interface UploadHubProps {
  onDocumentProcessed: (doc: ProcessedDocument, rawFile: File, options: ProcessingOptions) => void;
}

export const UploadHub: React.FC<UploadHubProps> = ({ onDocumentProcessed }) => {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [options, setOptions] = useState<ProcessingOptions>({
    stripMetadata: true,
    scanVisuals: true,
    enableAiDefenses: true,
    purgeMetadata: true,
    injectCanary: false,
    redactionMode: 'BLACKOUT'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setProcessing(true);
    setCurrentStep(1);

    await new Promise((r) => setTimeout(r, 600));
    setCurrentStep(2);

    await new Promise((r) => setTimeout(r, 700));
    setCurrentStep(3);

    const processedDoc = await processDocumentApi(file, options);
    await new Promise((r) => setTimeout(r, 500));

    setProcessing(false);
    onDocumentProcessed(processedDoc, file, options);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 font-sans">
      
      {/* Header Banner */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">
          DrishtiKon Intelligent Document Ingestion
        </h2>
        <p className="text-sm text-slate-500 max-w-xl mx-auto mt-2">
          Drop sensitive documents below for auto-detection of Names, PAN, Aadhaar, DOB, and Photos. Zero server disk retention.
        </p>
      </div>

      {/* Processing Options Checklist */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle mb-6">
        <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-indigo-600" />
          <span>Ingestion & Security Scan Options</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex items-start space-x-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={options.stripMetadata}
              onChange={(e) => setOptions({ ...options, stripMetadata: e.target.checked })}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="text-xs font-bold text-navy-900 block">Strip Metadata</span>
              <span className="text-[11px] text-slate-500">Purge author, timestamps & EXIF</span>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={options.scanVisuals}
              onChange={(e) => setOptions({ ...options, scanVisuals: e.target.checked })}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="text-xs font-bold text-navy-900 block">Scan Non-Text Artifacts</span>
              <span className="text-[11px] text-slate-500">Detect signatures, faces & stamps</span>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={options.enableAiDefenses}
              onChange={(e) => setOptions({ ...options, enableAiDefenses: e.target.checked })}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="text-xs font-bold text-navy-900 block">Enable AI Upload Defenses</span>
              <span className="text-[11px] text-slate-500">Anti-prompt injection & Canary trap</span>
            </div>
          </label>
        </div>
      </div>

      {/* Main Drag-and-Drop Zone */}
      {!processing ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`bg-white rounded-2xl p-10 text-center cursor-pointer transition-all border-2 border-dashed ${
            dragActive
              ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
              : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80 shadow-subtle'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-sm">
            <Upload className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-navy-900">
            Drag and Drop your Document into DrishtiKon
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Supports <span className="font-semibold text-navy-900">PDF, DOCX, TXT, PNG, JPG, JPEG</span> up to 50MB
          </p>

          <div className="flex items-center justify-center space-x-3 text-xs text-slate-400">
            <div className="flex items-center space-x-1">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Vector & Form PDFs</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <ImageIcon className="w-4 h-4 text-emerald-500" />
              <span>ID Cards, PAN & Scanned OCR</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-subtle text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100 animate-bounce">
            <Shield className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-navy-900">
            Processing "{selectedFile?.name}"
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">Running DrishtiKon zero-retention analysis engine...</p>

          <div className="space-y-4 max-w-md mx-auto text-left">
            <div className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep > 1 ? 'bg-emerald-500 text-white' : currentStep === 1 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'
              }`}>
                {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <span className={`text-xs font-semibold ${currentStep >= 1 ? 'text-navy-900' : 'text-slate-400'}`}>
                1. Parsing Structure & Key-Value OCR Extraction
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep > 2 ? 'bg-emerald-500 text-white' : currentStep === 2 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'
              }`}>
                {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </div>
              <span className={`text-xs font-semibold ${currentStep >= 2 ? 'text-navy-900' : 'text-slate-400'}`}>
                2. Running Form Heuristics (Names, DOB, PAN, Aadhaar)
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 3 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'
              }`}>
                3
              </div>
              <span className={`text-xs font-semibold ${currentStep >= 3 ? 'text-navy-900' : 'text-slate-400'}`}>
                3. Inspecting Metadata & Circular Ink Stamp Masks
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full mt-6 overflow-hidden max-w-md mx-auto">
            <div
              className="bg-indigo-600 h-2 transition-all duration-500 rounded-full"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {!processing && (
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              const sampleFile = new File(['Sample Document Content'], 'PAN_Identity_Card_Sample.pdf', { type: 'application/pdf' });
              handleFileSelected(sampleFile);
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline inline-flex items-center space-x-1"
          >
            <span>Or click here to evaluate with pre-loaded Indian PAN / Aadhaar ID sample card</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
};
