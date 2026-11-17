import type { BedPresetId, GridfinityConfig, LayerRole, StackArchitecture } from './types';

/**
 * Canonical Gridfinity specification constants derived from Zack Freedman's spec,
 * Kennetek's gridfinity-rebuilt-openscad, and ril3y/laserfinity.
 */
export const GRIDFINITY_SPEC = {
  /** Standard grid pitch per cell (mm) */
  PITCH_MM: 42.0,
  /** Nominal outer footprint of a 1x1 bin body (mm) -> 0.5mm total clearance */
  BIN_BODY_MM: 41.5,
  /** Lower shoulder width of bin foot above bottom 0.8mm chamfer (mm) */
  BIN_SHOULDER_MM: 37.2,
  /** Bottom flat of bin foot (mm) */
  BIN_BASE_MM: 35.6,
  /** Outer corner radius of a standard baseplate cell (mm) */
  OUTER_CORNER_RADIUS_MM: 4.0,
  /** Bin body corner radius (mm) */
  BIN_CORNER_RADIUS_MM: 3.75,
  /** Bin shoulder corner radius (mm): 3.75 - 2.15 = 1.60mm */
  STEP_CORNER_RADIUS_MM: 1.6,
  /** Bin foot vertical/chamfer heights (mm) */
  FOOT_BOTTOM_CHAMFER_H_MM: 0.8,
  FOOT_VERTICAL_H_MM: 1.8,
  FOOT_UPPER_CHAMFER_H_MM: 2.15,
  FOOT_TOTAL_H_MM: 4.75,
  /** Standard neodymium disc magnet (6mm dia x 2mm thick) */
  MAGNET_NOMINAL_DIA_MM: 6.0,
  MAGNET_DEFAULT_POCKET_DIA_MM: 6.3,
  /** Magnet hole center inset from cell boundary (mm) -> 26mm center-to-center */
  MAGNET_EDGE_INSET_MM: 8.0,
  /** M3 alignment screw hole diameter (mm) */
  M3_HOLE_DEFAULT_DIA_MM: 3.2,
  /** Corner screw inset from cell edge (mm) */
  SCREW_EDGE_INSET_MM: 4.8,
  /** Skeletonized backing floor cutout size & corner radius (mm) */
  SKELETON_WINDOW_MM: 20.0,
  SKELETON_CORNER_RADIUS_MM: 3.0,
} as const;

export const BED_PRESETS: Record<
  BedPresetId,
  { label: string; widthMm: number; heightMm: number }
> = {
  unlimited: { label: 'No Bed Limit (Single Piece)', widthMm: 2000, heightMm: 2000 },
  'k40-300x200': { label: 'K40 / Compact (300 × 200 mm)', widthMm: 300, heightMm: 200 },
  'glowforge-495x279': { label: 'Glowforge Bed (495 × 279 mm)', widthMm: 495, heightMm: 279 },
  'xtool-400x400': { label: 'Diode 400×400 (400 × 400 mm)', widthMm: 400, heightMm: 400 },
  'omtech-600x400': { label: 'CO2 600×400 (600 × 400 mm)', widthMm: 600, heightMm: 400 },
  custom: { label: 'Custom Laser Bed', widthMm: 450, heightMm: 300 },
};

export const STACK_ARCHITECTURES: Record<
  StackArchitecture,
  {
    name: string;
    subtitle: string;
    layers: { role: LayerRole; label: string; description: string }[];
  }
> = {
  'two-layer-standard': {
    name: '2-Layer Standard',
    subtitle: 'Shoulder grid (37.4 mm) + solid backing with magnet holes',
    layers: [
      {
        role: 'mid-step',
        label: 'Top Retaining Grid',
        description: '37.4 mm cutouts engage the bin foot vertical wall and stop the upper 45° chamfer.',
      },
      {
        role: 'bottom-backing',
        label: 'Bottom Backing Plate',
        description: 'Solid floor sheet with optional 6×2 mm magnet cutouts and M3 registration holes.',
      },
    ],
  },
  'three-layer-stepped': {
    name: '3-Layer Stepped Profile',
    subtitle: 'Upper collar (41.7 mm) + shoulder shelf (37.4 mm) + backing',
    layers: [
      {
        role: 'top-retainer',
        label: 'Upper Collar Grid',
        description: '41.7 mm cutouts wrap the outer bin foot for zero lateral play.',
      },
      {
        role: 'mid-step',
        label: 'Middle Step Shelf',
        description: '37.4 mm stepped cutouts support the bin chamfer shoulder.',
      },
      {
        role: 'bottom-backing',
        label: 'Bottom Backing Plate',
        description: 'Solid floor sheet with magnet pockets and M3 registration holes.',
      },
    ],
  },
  'single-layer-minimal': {
    name: '1-Layer Minimal Frame',
    subtitle: 'Single sheet grid (37.4 mm cutouts), sits directly on drawer floor',
    layers: [
      {
        role: 'mid-step',
        label: 'Single Grid Frame',
        description: 'Fastest cut & lowest material cost; relies on drawer floor beneath.',
      },
    ],
  },
};

export const KERF_PRESETS = [
  { label: '0.00 mm (None)', value: 0 },
  { label: '0.10 mm (Diode)', value: 0.1 },
  { label: '0.15 mm (3 mm Ply)', value: 0.15 },
  { label: '0.20 mm (Acrylic)', value: 0.2 },
] as const;

export const LAYER_STYLE_META = {
  CUT_OUTER: {
    name: 'Outer Perimeter',
    strokeHex: '#DC2626',
    dxfAci: 1, // Red
    operation: 'Cut (Outer)',
  },
  CUT_INNER: {
    name: 'Cell Pockets',
    strokeHex: '#2563EB',
    dxfAci: 5, // Blue
    operation: 'Cut (Inner)',
  },
  CUT_MAGNETS: {
    name: 'Magnet Holes',
    strokeHex: '#0D9488',
    dxfAci: 4, // Cyan/Teal
    operation: 'Cut (Holes)',
  },
  CUT_SCREWS: {
    name: 'M3 Alignment',
    strokeHex: '#16A34A',
    dxfAci: 3, // Green
    operation: 'Cut (Holes)',
  },
  ENGRAVE_LABELS: {
    name: 'Part Labels',
    strokeHex: '#64748B',
    dxfAci: 7, // Black/White
    operation: 'Score / Engrave',
  },
} as const;

export const DEFAULT_CONFIG: GridfinityConfig = {
  sizingMode: 'grid',
  unitSystem: 'mm',
  gridCols: 4,
  gridRows: 3,
  drawerWidthMm: 350,
  drawerDepthMm: 260,
  fillDrawerBorders: true,

  stackArchitecture: 'two-layer-standard',
  topLayerThicknessMm: 3.0,
  midLayerThicknessMm: 3.0,
  bottomLayerThicknessMm: 1.5,

  kerfMm: 0.15,
  topOpeningClearanceMm: 0.2,
  stepOpeningClearanceMm: 0.2,

  includeMagnets: true,
  magnetHoleDiameterMm: 6.3,
  includeAlignmentScrews: false,
  screwHoleDiameterMm: 3.2,
  includeEngravedLabels: true,
  skeletonizeBacking: false,

  bedPreset: 'glowforge-495x279',
  bedWidthMm: 495,
  bedHeightMm: 279,
  joineryStyle: 'puzzle-tab',
  sheetSpacingMm: 6,
};
