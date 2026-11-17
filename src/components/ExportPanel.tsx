import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileCode2,
  Layers,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import type { GeneratedModel, GeneratedTileLayer, SheetPage } from '../cad/types';

interface ExportPanelProps {
  model: GeneratedModel;
  lastExportMessage: string | null;
  onExportAllDxf: () => void;
  onExportAllSvg: () => void;
  onExportPartDxf: (part: GeneratedTileLayer) => void;
  onExportPartSvg: (part: GeneratedTileLayer) => void;
  onExportSheetDxf: (sheet: SheetPage) => void;
  onExportSheetSvg: (sheet: SheetPage) => void;
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function ExportPanel({
  model,
  lastExportMessage,
  onExportAllDxf,
  onExportAllSvg,
  onExportPartDxf,
  onExportPartSvg,
  onExportSheetDxf,
  onExportSheetSvg,
  selectedPartId,
  onSelectPart,
  collapsed,
  onToggleCollapsed,
}: ExportPanelProps) {
  const { dimensions, summary, parts, sheets } = model;
  const totalCutMeters = summary.totalCutLengthMm / 1000;

  if (collapsed) {
    return (
      <aside
        aria-label="Cut manifest and vector export"
        className="pointer-events-auto flex items-center gap-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 shadow-lg px-3 py-2 transition-all"
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={false}
          aria-label="Expand Cut Manifest & Export"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          <PanelRightOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Cut Manifest &amp; Export</span>
          <span className="px-1.5 py-0.5 text-[11px] font-mono tabular-nums rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {dimensions.cols}×{dimensions.rows} · {summary.totalParts} parts
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <span
          className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5"
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={onExportAllDxf}
          title="Download Combined DXF (.dxf)"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-3 h-3" />
          <span>DXF</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Cut manifest and vector export"
      className="pointer-events-auto w-[310px] sm:w-[328px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-8.5rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 rounded-xl shadow-xl flex flex-col overflow-hidden transition-all"
    >
      {/* Floating Header with Collapse Toggle */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-50/70 dark:bg-slate-900/80">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            Cut Manifest &amp; Export
          </h2>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={true}
          aria-label="Collapse Cut Manifest & Export"
          title="Collapse panel to view full CAD grid"
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
        >
          <span>Hide</span>
          <PanelRightClose className="w-3.5 h-3.5 hidden sm:inline" />
          <ChevronUp className="w-3.5 h-3.5 sm:hidden" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="overflow-y-auto overflow-x-hidden flex-1 divide-y divide-slate-200 dark:divide-slate-800">
        {/* Numeric Spec Summary */}
        <div className="p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">
              Overall Plate
            </span>
            <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 text-right truncate">
              {model.config.unitSystem === 'in'
                ? `${(dimensions.totalWidthMm / 25.4).toFixed(2)} × ${(
                    dimensions.totalDepthMm / 25.4
                  ).toFixed(2)} in`
                : `${dimensions.totalWidthMm.toFixed(1)} × ${dimensions.totalDepthMm.toFixed(1)} mm`}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">
              Grid Capacity
            </span>
            <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 text-right">
              {dimensions.cols} × {dimensions.rows} ({summary.totalCells} units)
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">
              Shoulder Cutout
            </span>
            <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 text-right">
              {summary.stepCutoutMm.toFixed(2)} mm nominal
            </span>
          </div>
          {model.config.stackArchitecture === 'three-layer-stepped' && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">
                Collar Cutout
              </span>
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 text-right">
                {summary.topCutoutMm.toFixed(2)} mm nominal
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">
              Total Cut Path
            </span>
            <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 text-right">
              {totalCutMeters.toFixed(2)} m · {summary.totalParts} parts
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">
              Bed Nesting
            </span>
            <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 text-right">
              {summary.totalSheets} {summary.totalSheets === 1 ? 'sheet' : 'sheets'}
            </span>
          </div>
        </div>

        {/* Primary Vector Export Buttons */}
        <div className="p-4 space-y-2">
          <button
            type="button"
            onClick={onExportAllDxf}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Download Combined DXF (.dxf)</span>
          </button>
          <button
            type="button"
            onClick={onExportAllSvg}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <FileCode2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Download Combined SVG (.svg)</span>
          </button>

          {lastExportMessage && (
            <div
              role="status"
              className="flex items-start gap-2 pt-1 text-xs text-emerald-700 dark:text-emerald-400"
            >
              <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="break-words min-w-0">{lastExportMessage}</span>
            </div>
          )}
        </div>

        {/* Nested Sheets List (when > 1 sheet) */}
        {sheets.length > 1 && (
          <div className="p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Nested Bed Sheets ({sheets.length})
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sheets.map((sheet) => (
                <div
                  key={sheet.sheetIndex}
                  className="py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      Sheet {sheet.sheetIndex + 1}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                      {sheet.parts.length} parts · {sheet.widthMm}×{sheet.heightMm} mm
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onExportSheetDxf(sheet)}
                      aria-label={`Download Sheet ${sheet.sheetIndex + 1} DXF`}
                      className="px-2 py-1 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      DXF
                    </button>
                    <button
                      type="button"
                      onClick={() => onExportSheetSvg(sheet)}
                      aria-label={`Download Sheet ${sheet.sheetIndex + 1} SVG`}
                      className="px-2 py-1 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      SVG
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Parts Breakdown */}
        <div className="p-4 space-y-2">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Generated Parts ({parts.length})
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {parts.map((part) => {
              const isSelected = selectedPartId === part.id;
              return (
                <div
                  key={part.id}
                  className={`py-2 flex items-center justify-between gap-2 transition-colors ${
                    isSelected
                      ? 'bg-blue-50/60 dark:bg-blue-950/40 -mx-2 px-2 rounded'
                      : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPart(part.id)}
                    className="text-left min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                      {part.label}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                      {part.widthMm.toFixed(1)}×{part.heightMm.toFixed(1)} mm ·{' '}
                      {part.thicknessMm.toFixed(1)} mm thick
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onExportPartDxf(part)}
                      aria-label={`Download ${part.label} DXF`}
                      className="px-2 py-1 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      DXF
                    </button>
                    <button
                      type="button"
                      onClick={() => onExportPartSvg(part)}
                      aria-label={`Download ${part.label} SVG`}
                      className="px-2 py-1 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      SVG
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
