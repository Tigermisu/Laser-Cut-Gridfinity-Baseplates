import type { ViewportMode } from '../cad/types';

interface TopBarProps {
  viewportMode: ViewportMode;
  onSelectViewportMode: (mode: ViewportMode) => void;
  onOpenReference: (tab: 'heritage' | 'laser-guide') => void;
  onExportCombinedDxf: () => void;
}

export function TopBar({
  viewportMode,
  onSelectViewportMode,
  onOpenReference,
  onExportCombinedDxf,
}: TopBarProps) {
  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-6 flex items-center justify-between gap-8 shrink-0">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectViewportMode('stacked');
        }}
        className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
      >
        GridCut
      </a>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav
        aria-label="Primary navigation"
        className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
      >
        <button
          type="button"
          onClick={() => onSelectViewportMode('stacked')}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            viewportMode === 'stacked'
              ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-slate-100'
              : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Blueprint
        </button>
        <button
          type="button"
          onClick={() => onSelectViewportMode('sheet')}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            viewportMode === 'sheet'
              ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-slate-100'
              : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Cut Sheets
        </button>
        <button
          type="button"
          onClick={() => onSelectViewportMode('cross-section')}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            viewportMode === 'cross-section'
              ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-slate-100'
              : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Cross-Section
        </button>
        <button
          type="button"
          onClick={() => onOpenReference('heritage')}
          className="py-1 border-b-2 border-transparent hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Open-Source Spec
        </button>
        <button
          type="button"
          onClick={() => onOpenReference('laser-guide')}
          className="py-1 border-b-2 border-transparent hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Laser Guide
        </button>
      </nav>

      {/* Zone 3: Single primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onExportCombinedDxf}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Export DXF
        </button>
      </div>
    </header>
  );
}

