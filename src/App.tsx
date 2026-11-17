import { useEffect, useMemo, useState } from 'react';
import { exportAllSheetsToDxf, exportPartToDxf, exportSheetToDxf } from './cad/dxfExporter';
import { generateGridfinityBaseplate } from './cad/geometry';
import { DEFAULT_CONFIG } from './cad/gridfinitySpec';
import {
  clearSavedConfigFromStorage,
  GRIDCUT_UI_STORAGE_KEY,
  loadSavedConfigFromStorage,
  parsePresetJson,
  saveConfigToStorage,
  serializePresetJson,
} from './cad/presetIO';
import { exportAllSheetsToSvg, exportPartToSvg, exportSheetToSvg } from './cad/svgExporter';
import type {
  GeneratedTileLayer,
  GridfinityConfig,
  SheetPage,
  ViewportMode,
} from './cad/types';
import { CadViewport } from './components/CadViewport';
import { ExportPanel } from './components/ExportPanel';
import { ParameterSidebar } from './components/ParameterSidebar';
import { ReferenceModal } from './components/ReferenceModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { TopBar } from './components/TopBar';
import { sanitizeSlug, triggerTextDownload } from './utils/download';

interface PersistedUiState {
  viewportMode?: ViewportMode;
  userThemeOverride?: 'light' | 'dark' | null;
  manifestCollapsed?: boolean;
}

function loadUiStateFromStorage(): PersistedUiState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(GRIDCUT_UI_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedUiState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function App() {
  const initialUi = useMemo(() => loadUiStateFromStorage(), []);

  const [config, setConfig] = useState<GridfinityConfig>(() =>
    loadSavedConfigFromStorage()
  );
  const [viewportMode, setViewportMode] = useState<ViewportMode>(() => {
    const m = initialUi.viewportMode;
    return m === 'stacked' || m === 'sheet' || m === 'cross-section'
      ? m
      : 'stacked';
  });
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [lastExportMessage, setLastExportMessage] = useState<string | null>(null);
  const [manifestCollapsed, setManifestCollapsed] = useState<boolean>(() =>
    typeof initialUi.manifestCollapsed === 'boolean'
      ? initialUi.manifestCollapsed
      : false
  );
  const [presetFeedback, setPresetFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceTab, setReferenceTab] = useState<'heritage' | 'laser-guide'>('heritage');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Auto-select theme based on prefers-color-scheme, allowing manual toggle override
  const [userThemeOverride, setUserThemeOverride] = useState<'light' | 'dark' | null>(() => {
    const t = initialUi.userThemeOverride;
    return t === 'light' || t === 'dark' ? t : null;
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Automatically persist baseplate configuration to localStorage
  useEffect(() => {
    saveConfigToStorage(config);
  }, [config]);

  // Automatically persist UI preferences (viewportMode, theme override, manifest collapse)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload: PersistedUiState = {
        viewportMode,
        userThemeOverride,
        manifestCollapsed,
      };
      window.localStorage.setItem(GRIDCUT_UI_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors
    }
  }, [viewportMode, userThemeOverride, manifestCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isDark =
    userThemeOverride !== null ? userThemeOverride === 'dark' : systemPrefersDark;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleToggleTheme = () => {
    setUserThemeOverride(isDark ? 'light' : 'dark');
  };

  const model = useMemo(() => generateGridfinityBaseplate(config), [config]);

  const handlePatchConfig = (patch: Partial<GridfinityConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleConfirmReset = () => {
    clearSavedConfigFromStorage();
    setConfig(DEFAULT_CONFIG);
    setSelectedPartId(null);
    setLastExportMessage(null);
    setResetConfirmOpen(false);
    setPresetFeedback({
      type: 'success',
      message: 'Reset all parameters to default settings',
    });
  };

  const baseName = `gridfinity-${model.dimensions.cols}x${model.dimensions.rows}-${config.stackArchitecture}`;

  const handleSavePreset = () => {
    const filename = `${baseName}-preset.json`;
    const json = serializePresetJson(config);
    triggerTextDownload(filename, json, 'application/json');
    setPresetFeedback({
      type: 'success',
      message: `Saved preset ${filename}`,
    });
  };

  const handleLoadPresetText = (rawJson: string, sourceName = 'preset.json') => {
    try {
      const nextConfig = parsePresetJson(rawJson);
      setConfig(nextConfig);
      setSelectedPartId(null);
      setPresetFeedback({
        type: 'success',
        message: `Loaded preset from ${sourceName}`,
      });
    } catch (err) {
      setPresetFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Failed to load preset JSON file.',
      });
    }
  };

  const handleExportAllDxf = () => {
    const filename = `${baseName}.dxf`;
    const dxf = exportAllSheetsToDxf(model.sheets);
    triggerTextDownload(filename, dxf, 'application/dxf');
    setLastExportMessage(`Exported ${filename} (AutoCAD mm DXF)`);
  };

  const handleExportAllSvg = () => {
    const filename = `${baseName}.svg`;
    const svg = exportAllSheetsToSvg(model.sheets);
    triggerTextDownload(filename, svg, 'image/svg+xml');
    setLastExportMessage(`Exported ${filename} (1:1 mm SVG)`);
  };

  const handleExportPartDxf = (part: GeneratedTileLayer) => {
    const filename = `${baseName}-${sanitizeSlug(part.id)}.dxf`;
    triggerTextDownload(filename, exportPartToDxf(part), 'application/dxf');
    setLastExportMessage(`Exported ${filename}`);
  };

  const handleExportPartSvg = (part: GeneratedTileLayer) => {
    const filename = `${baseName}-${sanitizeSlug(part.id)}.svg`;
    triggerTextDownload(filename, exportPartToSvg(part), 'image/svg+xml');
    setLastExportMessage(`Exported ${filename}`);
  };

  const handleExportSheetDxf = (sheet: SheetPage) => {
    const filename = `${baseName}-sheet-${sheet.sheetIndex + 1}.dxf`;
    triggerTextDownload(filename, exportSheetToDxf(sheet), 'application/dxf');
    setLastExportMessage(`Exported ${filename}`);
  };

  const handleExportSheetSvg = (sheet: SheetPage) => {
    const filename = `${baseName}-sheet-${sheet.sheetIndex + 1}.svg`;
    triggerTextDownload(filename, exportSheetToSvg(sheet), 'image/svg+xml');
    setLastExportMessage(`Exported ${filename}`);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopBar
        viewportMode={viewportMode}
        onSelectViewportMode={setViewportMode}
        onOpenReference={(tab) => {
          setReferenceTab(tab);
          setReferenceOpen(true);
        }}
        onExportCombinedDxf={handleExportAllDxf}
      />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 min-w-0 overflow-x-hidden">
        <ParameterSidebar
          config={config}
          dimensions={model.dimensions}
          onChange={handlePatchConfig}
          onReset={() => setResetConfirmOpen(true)}
          onSavePreset={handleSavePreset}
          onLoadPresetText={handleLoadPresetText}
          presetFeedback={presetFeedback}
        />

        <CadViewport
          model={model}
          viewportMode={viewportMode}
          onChangeViewportMode={setViewportMode}
          selectedPartId={selectedPartId}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
          manifestCollapsed={manifestCollapsed}
          floatingPanel={
            <ExportPanel
              model={model}
              lastExportMessage={lastExportMessage}
              onExportAllDxf={handleExportAllDxf}
              onExportAllSvg={handleExportAllSvg}
              onExportPartDxf={handleExportPartDxf}
              onExportPartSvg={handleExportPartSvg}
              onExportSheetDxf={handleExportSheetDxf}
              onExportSheetSvg={handleExportSheetSvg}
              selectedPartId={selectedPartId}
              onSelectPart={(id) =>
                setSelectedPartId((curr) => (curr === id ? null : id))
              }
              collapsed={manifestCollapsed}
              onToggleCollapsed={() => setManifestCollapsed((prev) => !prev)}
            />
          }
        />
      </div>

      <ReferenceModal
        open={referenceOpen}
        activeTab={referenceTab}
        onChangeTab={setReferenceTab}
        onClose={() => setReferenceOpen(false)}
      />

      <ResetConfirmModal
        open={resetConfirmOpen}
        onConfirm={handleConfirmReset}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
