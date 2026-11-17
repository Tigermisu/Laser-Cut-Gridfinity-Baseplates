export type UnitSystem = 'mm' | 'in';

export type SizingMode = 'grid' | 'drawer';

export type StackArchitecture =
  | 'two-layer-standard'
  | 'three-layer-stepped'
  | 'single-layer-minimal';

export type LayerRole = 'top-retainer' | 'mid-step' | 'bottom-backing';

export type CutLayerId =
  | 'CUT_OUTER'
  | 'CUT_INNER'
  | 'CUT_MAGNETS'
  | 'CUT_SCREWS'
  | 'ENGRAVE_LABELS';

export type ViewportMode = 'stacked' | 'sheet' | 'cross-section';

export type BedPresetId =
  | 'unlimited'
  | 'k40-300x200'
  | 'glowforge-495x279'
  | 'xtool-400x400'
  | 'omtech-600x400'
  | 'custom';

export type JoineryStyle = 'puzzle-tab' | 'straight';

export interface GridfinityConfig {
  sizingMode: SizingMode;
  unitSystem: UnitSystem;
  gridCols: number;
  gridRows: number;
  drawerWidthMm: number;
  drawerDepthMm: number;
  fillDrawerBorders: boolean;

  stackArchitecture: StackArchitecture;
  topLayerThicknessMm: number;
  midLayerThicknessMm: number;
  bottomLayerThicknessMm: number;

  // Pocket tolerances & kerf
  kerfMm: number;
  topOpeningClearanceMm: number; // Added to 41.5mm nominal bin top (default +0.2 -> 41.7mm)
  stepOpeningClearanceMm: number; // Added to 37.2mm nominal bin shoulder (default +0.2 -> 37.4mm)

  // Hardware features
  includeMagnets: boolean;
  magnetHoleDiameterMm: number; // default 6.3mm for 6x2mm magnets
  includeAlignmentScrews: boolean;
  screwHoleDiameterMm: number; // default 3.2mm for M3
  includeEngravedLabels: boolean;
  skeletonizeBacking?: boolean;

  // Bed splitting & sheet layout
  bedPreset: BedPresetId;
  bedWidthMm: number;
  bedHeightMm: number;
  joineryStyle: JoineryStyle;
  sheetSpacingMm: number;
}

/**
 * A closed or open 2D polyline supporting straight segments and circular arcs
 * via standard DXF bulge factors: bulge = tan(sweepAngle / 4).
 * Positive bulge = CCW arc from current vertex to next vertex (in CAD Y-up space).
 */
export interface PolylineVertex {
  x: number;
  y: number;
  bulge?: number;
}

export interface VectorPolyline {
  kind: 'polyline';
  layer: CutLayerId;
  closed: boolean;
  vertices: PolylineVertex[];
}

export interface VectorCircle {
  kind: 'circle';
  layer: CutLayerId;
  cx: number;
  cy: number;
  r: number;
}

export interface VectorText {
  kind: 'text';
  layer: CutLayerId;
  x: number;
  y: number;
  text: string;
  heightMm: number;
}

export type VectorEntity = VectorPolyline | VectorCircle | VectorText;

export interface GeneratedTileLayer {
  id: string;
  role: LayerRole;
  label: string;
  tileCol: number;
  tileRow: number;
  tileIndex: number;
  gridCols: number;
  gridRows: number;
  widthMm: number;
  heightMm: number;
  /** Position when placed on nested cut sheet (mm) */
  sheetX: number;
  sheetY: number;
  sheetIndex: number;
  thicknessMm: number;
  /** Kerf-compensated laser toolpath entities (exported to DXF/SVG) */
  entities: VectorEntity[];
  /** Uncompensated base geometry entities (kerf = 0 nominal boundaries) */
  nominalEntities: VectorEntity[];
  stats: {
    pocketCount: number;
    magnetHoleCount: number;
    screwHoleCount: number;
    cutLengthMm: number;
  };
}

export interface SheetPage {
  sheetIndex: number;
  widthMm: number;
  heightMm: number;
  parts: GeneratedTileLayer[];
}

export interface ComputedDimensions {
  cols: number;
  rows: number;
  gridWidthMm: number;
  gridDepthMm: number;
  totalWidthMm: number;
  totalDepthMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  tileColSplits: number[]; // grid col counts per tile
  tileRowSplits: number[]; // grid row counts per tile
  fitsSingleBed: boolean;
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
}

export interface GeneratedModel {
  config: GridfinityConfig;
  dimensions: ComputedDimensions;
  parts: GeneratedTileLayer[];
  sheets: SheetPage[];
  issues: ValidationIssue[];
  summary: {
    totalParts: number;
    totalSheets: number;
    totalCells: number;
    totalCutLengthMm: number;
    totalPocketCutouts: number;
    totalMagnetHoles: number;
    totalScrewHoles: number;
    topCutoutMm: number;
    stepCutoutMm: number;
  };
}
