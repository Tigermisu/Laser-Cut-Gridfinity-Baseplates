import { useEffect } from 'react';
import { RotateCcw, X } from 'lucide-react';

interface ResetConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResetConfirmModal({
  open,
  onConfirm,
  onCancel,
}: ResetConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/75 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <h2
              id="reset-dialog-title"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Reset Baseplate Parameters?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close reset confirmation dialog"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
          <p
            id="reset-dialog-description"
            className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
          >
            This will restore all dimensions, layer stack settings, laser kerf
            values, and bed splitting options back to the default{' '}
            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
              4×3 (2-Layer Standard)
            </span>{' '}
            configuration and clear your saved browser state.
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tip: Use <strong>Save Preset</strong> first if you want to keep a
            backup JSON copy of your current setup.
          </p>
        </div>

        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
        </div>
      </div>
    </div>
  );
}
