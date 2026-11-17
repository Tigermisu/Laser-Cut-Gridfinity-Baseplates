import { useRef } from 'react';
import { Check, AlertCircle, Download, RotateCcw, Upload } from 'lucide-react';
import {
  BED_PRESETS,
  DEFAULT_CONFIG,
  KERF_PRESETS,
  STACK_ARCHITECTURES,
} from '../cad/gridfinitySpec';
import type {
  BedPresetId,
  ComputedDimensions,
  GridfinityConfig,
  StackArchitecture,
} from '../cad/types';

interface ParameterSidebarProps {
  config: GridfinityConfig;
  dimensions: ComputedDimensions;
  onChange: (patch: Partial<GridfinityConfig>) => void;
  onReset: () => void;
  onSavePreset: () => void;
  onLoadPresetText: (rawJson: string, sourceName?: string) => void;
  presetFeedback: { type: 'success' | 'error'; message: string } | null;
}

const MM_PER_INCH = 25.4;

export function ParameterSidebar({
  config,
  dimensions,
  onChange,
  onReset,
  onSavePreset,
  onLoadPresetText,
  presetFeedback,
}: ParameterSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isInches = config.unitSystem === 'in';
  const toDisplay = (mm: number) =>
    isInches ? Number((mm / MM_PER_INCH).toFixed(2)) : Number(mm.toFixed(1));
  const toMm = (val: number) => (isInches ? val * MM_PER_INCH : val);

  const stackOptions: StackArchitecture[] = [
    'two-layer-standard',
    'three-layer-stepped',
    'single-layer-minimal',
  ];

  const isSingleLayer = config.stackArchitecture === 'single-layer-minimal';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      onLoadPresetText(text, file.name);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <aside
      aria-label="Baseplate parameters"
      className="w-full lg:w-[340px] shrink-0 bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto"
    >
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            Baseplate Parameters
          </h2>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            title="Reset all parameters to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Preset Save & Load Toolbar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSavePreset}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Save Preset
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Load
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            aria-label="Load preset JSON file"
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>

        {presetFeedback && (
          <div
            role="status"
            className={`flex items-start gap-1.5 text-xs ${
              presetFeedback.type === 'error'
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {presetFeedback.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            ) : (
              <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            )}
            <span>{presetFeedback.message}</span>
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {/* 1. Sizing Mode & Footprint */}
        <section className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              1. Dimensions &amp; Fit
            </h3>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
              <button
                type="button"
                onClick={() => onChange({ sizingMode: 'grid' })}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  config.sizingMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Grid Units
              </button>
              <button
                type="button"
                onClick={() => onChange({ sizingMode: 'drawer' })}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  config.sizingMode === 'drawer'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Drawer Fit
              </button>
            </div>
          </div>

          {config.sizingMode === 'grid' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="grid-cols-input"
                    className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Columns (X)
                  </label>
                  <input
                    id="grid-cols-input"
                    type="number"
                    min={1}
                    max={30}
                    step={1}
                    value={config.gridCols}
                    onChange={(e) =>
                      onChange({
                        gridCols: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="grid-rows-input"
                    className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Rows (Y)
                  </label>
                  <input
                    id="grid-rows-input"
                    type="number"
                    min={1}
                    max={30}
                    step={1}
                    value={config.gridRows}
                    onChange={(e) =>
                      onChange({
                        gridRows: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  [3, 3],
                  [4, 3],
                  [6, 4],
                  [10, 6],
                ].map(([c, r]) => {
                  const active = config.gridCols === c && config.gridRows === r;
                  return (
                    <button
                      key={`${c}x${r}`}
                      type="button"
                      onClick={() => onChange({ gridCols: c, gridRows: r })}
                      className={`px-2 py-1 text-xs font-mono tabular-nums rounded border transition-colors cursor-pointer ${
                        active
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {c}×{r}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Interior Drawer Size</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded">
                  <button
                    type="button"
                    onClick={() => onChange({ unitSystem: 'mm' })}
                    className={`px-2 py-0.5 rounded font-mono text-xs cursor-pointer ${
                      config.unitSystem === 'mm'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    mm
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ unitSystem: 'in' })}
                    className={`px-2 py-0.5 rounded font-mono text-xs cursor-pointer ${
                      config.unitSystem === 'in'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    in
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="drawer-width-input"
                    className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Width ({config.unitSystem})
                  </label>
                  <input
                    id="drawer-width-input"
                    type="number"
                    min={1}
                    step={isInches ? 0.1 : 1}
                    value={toDisplay(config.drawerWidthMm)}
                    onChange={(e) =>
                      onChange({
                        drawerWidthMm: Math.max(0, toMm(Number(e.target.value) || 0)),
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="drawer-depth-input"
                    className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Depth ({config.unitSystem})
                  </label>
                  <input
                    id="drawer-depth-input"
                    type="number"
                    min={1}
                    step={isInches ? 0.1 : 1}
                    value={toDisplay(config.drawerDepthMm)}
                    onChange={(e) =>
                      onChange({
                        drawerDepthMm: Math.max(0, toMm(Number(e.target.value) || 0)),
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.fillDrawerBorders}
                  onChange={(e) =>
                    onChange({ fillDrawerBorders: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600"
                />
                <span>
                  Fill remaining slack with symmetric border margins so the plate stays centered
                </span>
              </label>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                Fits {dimensions.cols}×{dimensions.rows} grid · Margin{' '}
                {isInches
                  ? `${(dimensions.marginLeftMm / MM_PER_INCH).toFixed(2)} in L/R · ${(
                      dimensions.marginTopMm / MM_PER_INCH
                    ).toFixed(2)} in T/B`
                  : `${dimensions.marginLeftMm.toFixed(1)} mm L/R · ${dimensions.marginTopMm.toFixed(
                      1
                    )} mm T/B`}
              </p>
            </div>
          )}
        </section>

        {/* 2. Laser Stack Architecture */}
        <section className="p-5 space-y-3.5">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            2. Laser-Cut Layer Stack
          </h3>

          <div className="space-y-2">
            {stackOptions.map((arch) => {
              const info = STACK_ARCHITECTURES[arch];
              const active = config.stackArchitecture === arch;
              return (
                <button
                  key={arch}
                  type="button"
                  onClick={() => onChange({ stackArchitecture: arch })}
                  className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors cursor-pointer ${
                    active
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/50'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {info.name}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                    {info.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {config.stackArchitecture === 'three-layer-stepped' && (
              <div>
                <label
                  htmlFor="thick-top"
                  className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1"
                >
                  Collar (mm)
                </label>
                <input
                  id="thick-top"
                  type="number"
                  min={0.5}
                  max={10}
                  step={0.1}
                  value={config.topLayerThicknessMm}
                  onChange={(e) =>
                    onChange({
                      topLayerThicknessMm: Math.max(0.5, Number(e.target.value) || 2),
                    })
                  }
                  className="w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>
            )}
            <div>
              <label
                htmlFor="thick-mid"
                className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1"
              >
                Grid (mm)
              </label>
              <input
                id="thick-mid"
                type="number"
                min={0.5}
                max={10}
                step={0.1}
                value={config.midLayerThicknessMm}
                onChange={(e) =>
                  onChange({
                    midLayerThicknessMm: Math.max(0.5, Number(e.target.value) || 3),
                  })
                }
                className="w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
            {!isSingleLayer && (
              <div>
                <label
                  htmlFor="thick-base"
                  className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1"
                >
                  Base (mm)
                </label>
                <input
                  id="thick-base"
                  type="number"
                  min={0.5}
                  max={10}
                  step={0.1}
                  value={config.bottomLayerThicknessMm}
                  onChange={(e) =>
                    onChange({
                      bottomLayerThicknessMm: Math.max(0.5, Number(e.target.value) || 1.5),
                    })
                  }
                  className="w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>
            )}
          </div>
        </section>

        {/* 3. Kerf & Pocket Tolerance */}
        <section className="p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            3. Laser Kerf &amp; Clearance
          </h3>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="kerf-input" className="text-xs text-slate-600 dark:text-slate-400">
                Beam Kerf Width (mm)
              </label>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                ±{(config.kerfMm / 2).toFixed(3)} mm/edge
              </span>
            </div>
            <input
              id="kerf-input"
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={config.kerfMm}
              onChange={(e) =>
                onChange({
                  kerfMm: Math.max(0, Math.min(1.5, Number(e.target.value) || 0)),
                })
              }
              className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:border-blue-600"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {KERF_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange({ kerfMm: preset.value })}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                    Math.abs(config.kerfMm - preset.value) < 0.005
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label
                htmlFor="step-clearance-input"
                className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
              >
                Shoulder Fit (+mm)
              </label>
              <input
                id="step-clearance-input"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={config.stepOpeningClearanceMm}
                onChange={(e) =>
                  onChange({
                    stepOpeningClearanceMm: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
            {config.stackArchitecture === 'three-layer-stepped' && (
              <div>
                <label
                  htmlFor="top-clearance-input"
                  className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                >
                  Collar Fit (+mm)
                </label>
                <input
                  id="top-clearance-input"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.topOpeningClearanceMm}
                  onChange={(e) =>
                    onChange({
                      topOpeningClearanceMm: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>
            )}
          </div>
        </section>

        {/* 4. Hardware & Markings */}
        <section className="p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            4. Hardware &amp; Markings
          </h3>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeMagnets}
                  disabled={isSingleLayer}
                  onChange={(e) =>
                    onChange({ includeMagnets: e.target.checked })
                  }
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600 disabled:opacity-40"
                />
                <span className={isSingleLayer ? 'text-slate-400 dark:text-slate-500' : ''}>
                  6×2 mm Magnet Pockets
                </span>
              </label>
              {config.includeMagnets && !isSingleLayer && (
                <input
                  aria-label="Magnet hole diameter (mm)"
                  type="number"
                  min={5.5}
                  max={7.5}
                  step={0.05}
                  value={config.magnetHoleDiameterMm}
                  onChange={(e) =>
                    onChange({
                      magnetHoleDiameterMm: Math.max(
                        5,
                        Number(e.target.value) || DEFAULT_CONFIG.magnetHoleDiameterMm
                      ),
                    })
                  }
                  className="w-16 px-2 py-1 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md text-right"
                />
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config.skeletonizeBacking)}
                disabled={isSingleLayer}
                onChange={(e) =>
                  onChange({ skeletonizeBacking: e.target.checked })
                }
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600 disabled:opacity-40"
              />
              <span className={isSingleLayer ? 'text-slate-400 dark:text-slate-500' : ''}>
                Skeletonize Backing Floor (20 mm Windows)
              </span>
            </label>

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeAlignmentScrews}
                  onChange={(e) =>
                    onChange({ includeAlignmentScrews: e.target.checked })
                  }
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600"
                />
                <span>M3 Corner Alignment Holes</span>
              </label>
              {config.includeAlignmentScrews && (
                <input
                  aria-label="M3 screw hole diameter (mm)"
                  type="number"
                  min={2.5}
                  max={5}
                  step={0.1}
                  value={config.screwHoleDiameterMm}
                  onChange={(e) =>
                    onChange({
                      screwHoleDiameterMm: Math.max(
                        2,
                        Number(e.target.value) || DEFAULT_CONFIG.screwHoleDiameterMm
                      ),
                    })
                  }
                  className="w-16 px-2 py-1 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md text-right"
                />
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeEngravedLabels}
                onChange={(e) =>
                  onChange({ includeEngravedLabels: e.target.checked })
                }
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600"
              />
              <span>Engrave Layer &amp; Tile IDs</span>
            </label>
          </div>
        </section>

        {/* 5. Laser Bed & Tiling */}
        <section className="p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            5. Laser Bed &amp; Tile Splitting
          </h3>

          <div>
            <label
              htmlFor="bed-preset-select"
              className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
            >
              Machine Bed Size
            </label>
            <select
              id="bed-preset-select"
              value={config.bedPreset}
              onChange={(e) => {
                const preset = e.target.value as BedPresetId;
                const meta = BED_PRESETS[preset];
                onChange({
                  bedPreset: preset,
                  bedWidthMm: meta.widthMm,
                  bedHeightMm: meta.heightMm,
                });
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            >
              {(Object.keys(BED_PRESETS) as BedPresetId[]).map((key) => (
                <option key={key} value={key}>
                  {BED_PRESETS[key].label}
                </option>
              ))}
            </select>
          </div>

          {config.bedPreset === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="custom-bed-w"
                  className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                >
                  Bed W (mm)
                </label>
                <input
                  id="custom-bed-w"
                  type="number"
                  min={60}
                  max={2500}
                  value={config.bedWidthMm}
                  onChange={(e) =>
                    onChange({
                      bedWidthMm: Math.max(60, Number(e.target.value) || 300),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md"
                />
              </div>
              <div>
                <label
                  htmlFor="custom-bed-h"
                  className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                >
                  Bed H (mm)
                </label>
                <input
                  id="custom-bed-h"
                  type="number"
                  min={60}
                  max={2500}
                  value={config.bedHeightMm}
                  onChange={(e) =>
                    onChange({
                      bedHeightMm: Math.max(60, Number(e.target.value) || 200),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md"
                />
              </div>
            </div>
          )}

          {!dimensions.fitsSingleBed && (
            <div>
              <label
                htmlFor="joinery-select"
                className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
              >
                Tile Seam Joinery ({dimensions.tileColSplits.length}×
                {dimensions.tileRowSplits.length} tiles)
              </label>
              <select
                id="joinery-select"
                value={config.joineryStyle}
                onChange={(e) =>
                  onChange({
                    joineryStyle: e.target.value as GridfinityConfig['joineryStyle'],
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              >
                <option value="puzzle-tab">
                  Interlocking Dovetail Tabs (Backing Layer)
                </option>
                <option value="straight">Straight Precision Butt Seam</option>
              </select>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

