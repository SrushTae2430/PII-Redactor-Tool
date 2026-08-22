import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Eye, ShieldCheck, ChevronLeft, ChevronRight, X, PlusCircle } from 'lucide-react';
import type { PIIEntity, DocumentPage, RedactionMode } from '../../types';

interface DocumentCanvasProps {
  pages: DocumentPage[];
  entities: PIIEntity[];
  onToggleEntity: (id: string) => void;
  onAddManualEntity: (bbox: [number, number, number, number], pageNumber: number) => void;
  redactionMode: RedactionMode;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  pages,
  entities,
  onToggleEntity,
  onAddManualEntity,
  redactionMode
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'REVIEW' | 'SANITIZED'>('REVIEW');
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawBox, setCurrentDrawBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const activePageData = pages.find((p) => p.page_number === currentPage) || pages[0];
  const pageEntities = entities.filter((e) => (e.page || 1) === currentPage);

  const handleZoomIn = () => setZoom((prev) => Math.min(200, prev + 15));
  const handleZoomOut = () => setZoom((prev) => Math.max(35, prev - 15));
  const handleResetZoom = () => setZoom(100);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode === 'SANITIZED') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / (zoom / 100);
    const clickY = (e.clientY - rect.top) / (zoom / 100);

    setIsDrawing(true);
    setDrawStart({ x: clickX, y: clickY });
    setCurrentDrawBox({ x: clickX, y: clickY, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / (zoom / 100);
    const currentY = (e.clientY - rect.top) / (zoom / 100);

    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const w = Math.abs(currentX - drawStart.x);
    const h = Math.abs(currentY - drawStart.y);

    setCurrentDrawBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentDrawBox && currentDrawBox.w > 15 && currentDrawBox.h > 10) {
      onAddManualEntity(
        [
          Math.round(currentDrawBox.x),
          Math.round(currentDrawBox.y),
          Math.round(currentDrawBox.w),
          Math.round(currentDrawBox.h)
        ],
        currentPage
      );
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDrawBox(null);
  };

  const getEntityStyleClass = (category: string) => {
    switch (category) {
      case 'DIRECT': return 'bounding-box-direct';
      case 'INDIRECT': return 'bounding-box-indirect';
      case 'VISUAL': return 'bounding-box-visual';
      case 'MANUAL': return 'bounding-box-manual';
      default: return 'bounding-box-direct';
    }
  };

  const getDummyText = (type: string) => {
    switch (type) {
      case 'NAME': return 'Jane Doe';
      case 'EMAIL': return 'sanitized@shield.local';
      case 'PHONE': return '+1-555-000-0000';
      case 'AADHAAR': return 'XXXX-XXXX-0000';
      case 'PAN': return 'ABCDE0000X';
      case 'SSN': return 'XXX-XX-0000';
      case 'CREDIT_CARD': return 'XXXX-XXXX-XXXX-0000';
      default: return '[REDACTED]';
    }
  };

  return (
    <main className="flex-1 bg-slate-100 flex flex-col h-full overflow-hidden relative">
      
      {/* Top Floating Control Bar */}
      <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-30">
        
        {/* Left: View Mode Segmented Control */}
        <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 border border-slate-200">
          <button
            onClick={() => setViewMode('REVIEW')}
            className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'REVIEW' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Review Mode</span>
          </button>
          <button
            onClick={() => setViewMode('SANITIZED')}
            className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'SANITIZED' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sanitized Preview</span>
          </button>
        </div>

        {/* Center: Page Navigation Controls */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>Page {currentPage} of {pages.length}</span>
          <button
            disabled={currentPage >= pages.length}
            onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom & Custom Drawing Tip */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-1 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Click & Drag to Draw Custom Box</span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button onClick={handleZoomOut} title="Zoom Out" className="p-1 text-slate-600 hover:text-navy-900 rounded">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-mono font-semibold text-navy-900 text-[11px]">{zoom}%</span>
            <button onClick={handleZoomIn} title="Zoom In" className="p-1 text-slate-600 hover:text-navy-900 rounded">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleResetZoom} title="Reset Scale" className="p-1 text-slate-600 hover:text-navy-900 rounded ml-1">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Document Page Canvas Container */}
      <div
        ref={canvasContainerRef}
        className="flex-1 overflow-auto p-8 flex justify-center items-start relative select-none"
      >
        {activePageData ? (
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              width: `${activePageData.width * (zoom / 100)}px`,
              height: `${activePageData.height * (zoom / 100)}px`,
              position: 'relative'
            }}
            className="bg-white shadow-2xl rounded-sm transition-all duration-200 border border-slate-300 overflow-hidden cursor-crosshair shrink-0"
          >
            <img
              src={activePageData.image_data}
              alt={`Page ${currentPage}`}
              className="w-full h-full object-contain pointer-events-none"
            />

            {pageEntities.map((ent) => {
              const scale = zoom / 100;
              const [bx, by, bw, bh] = ent.bbox;
              const isHovered = hoveredEntityId === ent.id;

              if (!ent.active && viewMode === 'SANITIZED') return null;

              return (
                <div
                  key={ent.id}
                  onMouseEnter={() => setHoveredEntityId(ent.id)}
                  onMouseLeave={() => setHoveredEntityId(null)}
                  style={{
                    left: `${bx * scale}px`,
                    top: `${by * scale}px`,
                    width: `${bw * scale}px`,
                    height: `${bh * scale}px`,
                    position: 'absolute'
                  }}
                  className={`group transition-all ${
                    viewMode === 'REVIEW'
                      ? ent.active
                        ? `bounding-box ${getEntityStyleClass(ent.category)} rounded`
                        : 'border border-dashed border-slate-400 bg-slate-200/40 opacity-40 line-through'
                      : 'bg-black rounded-sm border border-black flex items-center justify-center'
                  }`}
                >
                  {viewMode === 'REVIEW' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleEntity(ent.id);
                        }}
                        title={ent.active ? 'Unmask / Ignore Tag' : 'Re-enable Redaction Tag'}
                        className={`absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md transition-all ${
                          ent.active ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>

                      {isHovered && (
                        <div className="absolute left-1/2 -bottom-9 -translate-x-1/2 bg-navy-900 text-white text-[10px] py-1 px-2.5 rounded-lg shadow-xl z-30 whitespace-nowrap pointer-events-none flex items-center space-x-1.5 border border-navy-700">
                          <span className="font-bold text-amber-400">[{ent.type}]</span>
                          <span>{ent.text}</span>
                          <span className="text-slate-400">({Math.round(ent.confidence * 100)}%)</span>
                        </div>
                      )}
                    </>
                  )}

                  {viewMode === 'SANITIZED' && ent.active && (
                    <div className="w-full h-full flex items-center justify-center text-center p-0.5 overflow-hidden">
                      {redactionMode === 'BLACKOUT' && (
                        <div className="w-full h-full bg-black"></div>
                      )}
                      {redactionMode === 'SYNTHETIC_LABEL' && (
                        <div className="w-full h-full bg-slate-200 border border-slate-400 text-[10px] font-mono font-bold text-slate-800 flex items-center justify-center truncate">
                          [{ent.type}]
                        </div>
                      )}
                      {redactionMode === 'SMART_DUMMY' && (
                        <div className="w-full h-full bg-blue-50 border border-blue-200 text-[11px] font-semibold text-indigo-900 flex items-center justify-center truncate px-1">
                          {getDummyText(ent.type)}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}

            {isDrawing && currentDrawBox && (
              <div
                style={{
                  left: `${currentDrawBox.x * (zoom / 100)}px`,
                  top: `${currentDrawBox.y * (zoom / 100)}px`,
                  width: `${currentDrawBox.w * (zoom / 100)}px`,
                  height: `${currentDrawBox.h * (zoom / 100)}px`,
                  position: 'absolute'
                }}
                className="bg-emerald-500/30 border-2 border-dashed border-emerald-600 rounded pointer-events-none"
              ></div>
            )}

          </div>
        ) : (
          <div className="text-slate-400 text-sm">No page data loaded.</div>
        )}
      </div>

    </main>
  );
};
