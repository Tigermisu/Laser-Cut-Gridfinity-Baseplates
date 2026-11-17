import { BED_PRESETS, DEFAULT_CONFIG, STACK_ARCHITECTURES } from './gridfinitySpec';
import type {
  BedPresetId,
  GridfinityConfig,
  JoineryStyle,
  SizingMode,
  StackArchitecture,
  UnitSystem,
} from './types';

export interface GridCutPresetFile {
  format: 'gridcut-preset';
  version: 1;
  exportedAt: string;
  config: GridfinityConfig;
}

const VALID_SIZING_MODES: SizingMode[] = ['grid', 'drawer'];
const VALID_UNIT_SYSTEMS: UnitSystem[] = ['mm', 'in'];
const VALID_JOINERY_STYLES: JoineryStyle[] = ['puzzle-tab', 'straight'];
const VALID_STACK_ARCHS = Object.keys(STACK_ARCHITECTURES) as StackArchitecture[];
const VALID_BED_PRESETS = Object.keys(BED_PRESETS) as BedPresetId[];

function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/**
 * Serialize a GridfinityConfig into a formatted JSON string for saving as a preset file.
 */
export function serializePresetJson(
  config: GridfinityConfig,
  exportedAt = new Date().toISOString()
): string {
  const payload: GridCutPresetFile = {
    format: 'gridcut-preset',
    version: 1,
    exportedAt,
    config,
  };
  return JSON.stringify(payload, null, 2) + '\n';
}

/**
 * Parse and validate an imported JSON string into a sanitized GridfinityConfig.
 * Accepts either `{ format: 'gridcut-preset', config: { ... } }` or a raw `GridfinityConfig` object.
 */
export function parsePresetJson(rawJson: string): GridfinityConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Invalid JSON file. Please select a valid GridCut preset (.json).');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Preset JSON must contain a configuration object.');
  }

  const record = parsed as Record<string, unknown>;
  const candidate =
    record.config && typeof record.config === 'object' && !Array.isArray(record.config)
      ? (record.config as Record<string, unknown>)
      : record;

  // Verify at least one recognizable GridfinityConfig key exists
  const knownKeys: (keyof GridfinityConfig)[] = [
    'sizingMode',
    'gridCols',
    'gridRows',
    'drawerWidthMm',
    'drawerDepthMm',
    'stackArchitecture',
    'kerfMm',
    'bedPreset',
  ];
  const hasKnownKey = knownKeys.some((k) => k in candidate);
  if (!hasKnownKey) {
    throw new Error('Unrecognized JSON schema: missing GridCut baseplate parameters.');
  }

  const sizingMode: SizingMode = VALID_SIZING_MODES.includes(
    candidate.sizingMode as SizingMode
  )
    ? (candidate.sizingMode as SizingMode)
    : DEFAULT_CONFIG.sizingMode;

  const unitSystem: UnitSystem = VALID_UNIT_SYSTEMS.includes(
    candidate.unitSystem as UnitSystem
  )
    ? (candidate.unitSystem as UnitSystem)
    : DEFAULT_CONFIG.unitSystem;

  const stackArchitecture: StackArchitecture = VALID_STACK_ARCHS.includes(
    candidate.stackArchitecture as StackArchitecture
  )
    ? (candidate.stackArchitecture as StackArchitecture)
    : DEFAULT_CONFIG.stackArchitecture;

  const bedPreset: BedPresetId = VALID_BED_PRESETS.includes(
    candidate.bedPreset as BedPresetId
  )
    ? (candidate.bedPreset as BedPresetId)
    : DEFAULT_CONFIG.bedPreset;

  const joineryStyle: JoineryStyle = VALID_JOINERY_STYLES.includes(
    candidate.joineryStyle as JoineryStyle
  )
    ? (candidate.joineryStyle as JoineryStyle)
    : DEFAULT_CONFIG.joineryStyle;

  return {
    sizingMode,
    unitSystem,
    gridCols: Math.round(clampNum(candidate.gridCols, 1, 30, DEFAULT_CONFIG.gridCols)),
    gridRows: Math.round(clampNum(candidate.gridRows, 1, 30, DEFAULT_CONFIG.gridRows)),
    drawerWidthMm: clampNum(
      candidate.drawerWidthMm,
      1,
      5000,
      DEFAULT_CONFIG.drawerWidthMm
    ),
    drawerDepthMm: clampNum(
      candidate.drawerDepthMm,
      1,
      5000,
      DEFAULT_CONFIG.drawerDepthMm
    ),
    fillDrawerBorders:
      typeof candidate.fillDrawerBorders === 'boolean'
        ? candidate.fillDrawerBorders
        : DEFAULT_CONFIG.fillDrawerBorders,

    stackArchitecture,
    topLayerThicknessMm: clampNum(
      candidate.topLayerThicknessMm,
      0.5,
      20,
      DEFAULT_CONFIG.topLayerThicknessMm
    ),
    midLayerThicknessMm: clampNum(
      candidate.midLayerThicknessMm,
      0.5,
      20,
      DEFAULT_CONFIG.midLayerThicknessMm
    ),
    bottomLayerThicknessMm: clampNum(
      candidate.bottomLayerThicknessMm,
      0.5,
      20,
      DEFAULT_CONFIG.bottomLayerThicknessMm
    ),

    kerfMm: clampNum(candidate.kerfMm, 0, 1.5, DEFAULT_CONFIG.kerfMm),
    topOpeningClearanceMm: clampNum(
      candidate.topOpeningClearanceMm,
      0,
      2,
      DEFAULT_CONFIG.topOpeningClearanceMm
    ),
    stepOpeningClearanceMm: clampNum(
      candidate.stepOpeningClearanceMm,
      0,
      2,
      DEFAULT_CONFIG.stepOpeningClearanceMm
    ),

    includeMagnets:
      typeof candidate.includeMagnets === 'boolean'
        ? candidate.includeMagnets
        : DEFAULT_CONFIG.includeMagnets,
    magnetHoleDiameterMm: clampNum(
      candidate.magnetHoleDiameterMm,
      4,
      10,
      DEFAULT_CONFIG.magnetHoleDiameterMm
    ),
    includeAlignmentScrews:
      typeof candidate.includeAlignmentScrews === 'boolean'
        ? candidate.includeAlignmentScrews
        : DEFAULT_CONFIG.includeAlignmentScrews,
    screwHoleDiameterMm: clampNum(
      candidate.screwHoleDiameterMm,
      1.5,
      8,
      DEFAULT_CONFIG.screwHoleDiameterMm
    ),
    includeEngravedLabels:
      typeof candidate.includeEngravedLabels === 'boolean'
        ? candidate.includeEngravedLabels
        : DEFAULT_CONFIG.includeEngravedLabels,
    skeletonizeBacking:
      typeof candidate.skeletonizeBacking === 'boolean'
        ? candidate.skeletonizeBacking
        : Boolean(DEFAULT_CONFIG.skeletonizeBacking),

    bedPreset,
    bedWidthMm: clampNum(candidate.bedWidthMm, 60, 5000, DEFAULT_CONFIG.bedWidthMm),
    bedHeightMm: clampNum(candidate.bedHeightMm, 60, 5000, DEFAULT_CONFIG.bedHeightMm),
    joineryStyle,
    sheetSpacingMm: clampNum(
      candidate.sheetSpacingMm,
      1,
      50,
      DEFAULT_CONFIG.sheetSpacingMm
    ),
  };
}
