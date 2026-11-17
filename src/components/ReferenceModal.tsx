import { X } from 'lucide-react';
import { GRIDFINITY_SPEC, LAYER_STYLE_META } from '../cad/gridfinitySpec';
import type { CutLayerId } from '../cad/types';

interface ReferenceModalProps {
  open: boolean;
  activeTab: 'heritage' | 'laser-guide';
  onChangeTab: (tab: 'heritage' | 'laser-guide') => void;
  onClose: () => void;
}

export function ReferenceModal({
  open,
  activeTab,
  onChangeTab,
  onClose,
}: ReferenceModalProps) {
  if (!open) return null;

  const layers: CutLayerId[] = [
    'CUT_OUTER',
    'CUT_INNER',
    'CUT_MAGNETS',
    'CUT_SCREWS',
    'ENGRAVE_LABELS',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reference-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2
            id="reference-modal-title"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Engineering Reference &amp; Laser Cutting Guide
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reference modal"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-6">
          <button
            type="button"
            onClick={() => onChangeTab('heritage')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'heritage'
                ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-slate-100'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Open-Source Spec &amp; Heritage
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('laser-guide')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'laser-guide'
                ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-slate-100'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Laser Cutter Workflow
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {activeTab === 'heritage' ? (
            <>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                  Open-Source Gridfinity Foundations
                </h3>
                <p>
                  GridCut adapts proven parametric Gridfinity geometry from open-source CAD
                  generators specifically for flat 2D laser cutting instead of 3D printing:
                </p>
                <ul className="mt-2.5 space-y-2 text-slate-600 dark:text-slate-400 list-disc pl-5">
                  <li>
                    <strong className="text-slate-900 dark:text-slate-100">gridfinity-rebuilt-openscad (Kennetek)</strong>:
                    Canonical 42.0 mm pitch, 41.5 mm bin footprint, 37.2 mm shoulder step,
                    4.0 mm outer / 3.75 mm bin / 1.60 mm inner radii, and 8.0 mm corner magnet offsets.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-slate-100">Laserfinity (ril3y)</strong>:
                    Multi-layer flat sheet stacking architecture replacing 45° 3D-printed chamfers
                    with stepped 2D cutouts in 1.5 mm–3.0 mm plywood, MDF, or acrylic.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-slate-100">GridFlock (yawkat) &amp; Layout Tool</strong>:
                    Drawer-fit optimization and automated multi-tile splitting with interlocking
                    dovetail joinery for beds smaller than the target drawer.
                  </li>
                </ul>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Nominal Geometric Constants
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono tabular-nums">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Grid Pitch</span>
                    <span className="text-slate-900 dark:text-slate-100">{GRIDFINITY_SPEC.PITCH_MM.toFixed(2)} mm</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Bin Body Footprint</span>
                    <span className="text-slate-900 dark:text-slate-100">{GRIDFINITY_SPEC.BIN_BODY_MM.toFixed(2)} mm</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Bin Shoulder Step</span>
                    <span className="text-slate-900 dark:text-slate-100">{GRIDFINITY_SPEC.BIN_SHOULDER_MM.toFixed(2)} mm</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Corner Radii</span>
                    <span className="text-slate-900 dark:text-slate-100">R4.0 / R3.75 / R1.60 mm</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Magnet Inset</span>
                    <span className="text-slate-900 dark:text-slate-100">{GRIDFINITY_SPEC.MAGNET_EDGE_INSET_MM.toFixed(2)} mm (26 mm c-c)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Export Arcs</span>
                    <span className="text-slate-900 dark:text-slate-100">True SVG Arcs &amp; DXF Bulges</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                  Layer Color &amp; Cut Order Mapping
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-3">
                  Every DXF and SVG file separates geometry onto distinct layers so LightBurn,
                  RDWorks, xTool Creative Space, and Glowforge automatically group operations.
                  Always cut inner pockets and magnet holes <strong>before</strong> the outer perimeter
                  so the sheet stays registered.
                </p>
                <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Layer Name</th>
                        <th className="py-2 px-3 font-semibold">Color</th>
                        <th className="py-2 px-3 font-semibold">Recommended Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {layers.map((id) => {
                        const meta = LAYER_STYLE_META[id];
                        return (
                          <tr key={id}>
                            <td className="py-2 px-3 text-slate-900 dark:text-slate-100">{id}</td>
                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-xs inline-block border border-slate-300 dark:border-slate-600"
                                  style={{ backgroundColor: meta.strokeHex }}
                                />
                                <span>{meta.strokeHex}</span>
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">
                              {meta.operation}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Kerf &amp; Assembly Tips
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  1. Set <strong>Laser Kerf</strong> to your measured beam width (typically{' '}
                  <span className="font-mono">0.15 mm</span> on 40W–80W CO2 with 3 mm birch plywood,
                  or <span className="font-mono">0.10 mm</span> on a diode laser). GridCut shrinks
                  inner pockets and enlarges outer edges by half-kerf automatically.
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  2. Save the waste square cutouts from the grid layer—dropping two 3D-printed bins
                  into opposite corners during wood-glue assembly keeps the top grid perfectly
                  registered to the backing sheet.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

