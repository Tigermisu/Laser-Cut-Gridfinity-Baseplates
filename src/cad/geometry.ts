import {
  BED_PRESETS,
  GRIDFINITY_SPEC,
  STACK_ARCHITECTURES,
} from './gridfinitySpec';
import type {
  ComputedDimensions,
  GeneratedModel,
  GeneratedTileLayer,
  GridfinityConfig,
  LayerRole,
  PolylineVertex,
  SheetPage,
  ValidationIssue,
  VectorCircle,
  VectorEntity,
  VectorPolyline,
  VectorText,
} from './types';

const BULGE_90_DEG = Math.tan(Math.PI / 8); // ~0.41421356237309503

/**
 * Create a closed rounded-rectangle polyline in CCW CAD coordinates (Y-up).
 * `x, y` is bottom-left corner.
 */
export function makeRoundedRectPolyline(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  layer: VectorPolyline['layer']
): VectorPolyline {
  const maxR = Math.min(width, height) / 2;
  const r = Math.max(0, Math.min(radius, maxR));

  if (r <= 1e-4) {
    return {
      kind: 'polyline',
      layer,
      closed: true,
      vertices: [
        { x, y, bulge: 0 },
        { x: x + width, y, bulge: 0 },
        { x: x + width, y: y + height, bulge: 0 },
        { x, y: y + height, bulge: 0 },
      ],
    };
  }

  const x0 = x;
  const x1 = x + width;
  const y0 = y;
  const y1 = y + height;

  const vertices: PolylineVertex[] = [
    { x: x0 + r, y: y0, bulge: 0 },
    { x: x1 - r, y: y0, bulge: BULGE_90_DEG },
    { x: x1, y: y0 + r, bulge: 0 },
    { x: x1, y: y1 - r, bulge: BULGE_90_DEG },
    { x: x1 - r, y: y1, bulge: 0 },
    { x: x0 + r, y: y1, bulge: BULGE_90_DEG },
    { x: x0, y: y1 - r, bulge: 0 },
    { x: x0, y: y0 + r, bulge: BULGE_90_DEG },
  ];

  return {
    kind: 'polyline',
    layer,
    closed: true,
    vertices,
  };
}

/**
 * Split a total grid dimension into chunks of at most `maxUnitsPerTile`.
 * Balances chunk sizes as evenly as possible (e.g., 7 units with max 5 -> [4, 3]).
 */
export function splitGridUnits(
  totalUnits: number,
  maxUnitsPerTile: number
): number[] {
  if (totalUnits <= 0) return [];
  const cap = Math.max(1, maxUnitsPerTile);
  if (totalUnits <= cap) return [totalUnits];

  const tileCount = Math.ceil(totalUnits / cap);
  const base = Math.floor(totalUnits / tileCount);
  const remainder = totalUnits % tileCount;
  const splits: number[] = [];
  for (let i = 0; i < tileCount; i++) {
    splits.push(base + (i < remainder ? 1 : 0));
  }
  return splits;
}

/**
 * Compute grid dimensions, drawer margins, and bed tile splits from config.
 */
export function computeDimensions(config: GridfinityConfig): ComputedDimensions {
  const pitch = GRIDFINITY_SPEC.PITCH_MM;
  const presetBed = BED_PRESETS[config.bedPreset];
  const bedW =
    config.bedPreset === 'custom'
      ? config.bedWidthMm
      : presetBed.widthMm;
  const bedH =
    config.bedPreset === 'custom'
      ? config.bedHeightMm
      : presetBed.heightMm;

  let cols = Math.max(1, Math.floor(config.gridCols));
  let rows = Math.max(1, Math.floor(config.gridRows));

  let totalWidthMm = cols * pitch;
  let totalDepthMm = rows * pitch;
  let marginLeftMm = 0;
  let marginRightMm = 0;
  let marginTopMm = 0;
  let marginBottomMm = 0;

  if (config.sizingMode === 'drawer') {
    const dw = Math.max(0, config.drawerWidthMm);
    const dd = Math.max(0, config.drawerDepthMm);
    cols = Math.max(1, Math.floor(dw / pitch));
    rows = Math.max(1, Math.floor(dd / pitch));
    const gridW = cols * pitch;
    const gridD = rows * pitch;

    if (config.fillDrawerBorders && dw >= pitch && dd >= pitch) {
      const slackX = Math.max(0, dw - gridW);
      const slackY = Math.max(0, dd - gridD);
      marginLeftMm = slackX / 2;
      marginRightMm = slackX / 2;
      marginBottomMm = slackY / 2;
      marginTopMm = slackY / 2;
      totalWidthMm = dw;
      totalDepthMm = dd;
    } else {
      totalWidthMm = gridW;
      totalDepthMm = gridD;
    }
  }

  const gridWidthMm = cols * pitch;
  const gridDepthMm = rows * pitch;

  // Determine how many grid units fit per bed tile, reserving space for outer margin + puzzle tab protrusion (6mm)
  const tabReserve = config.joineryStyle === 'puzzle-tab' ? 6 : 0;
  const usableW = Math.max(pitch, bedW - 2 * tabReserve - Math.max(marginLeftMm, marginRightMm));
  const usableH = Math.max(pitch, bedH - 2 * tabReserve - Math.max(marginTopMm, marginBottomMm));

  const fitsSingleBed =
    config.bedPreset === 'unlimited' ||
    (totalWidthMm <= bedW && totalDepthMm <= bedH);

  let tileColSplits: number[];
  let tileRowSplits: number[];

  if (fitsSingleBed) {
    tileColSplits = [cols];
    tileRowSplits = [rows];
  } else {
    const maxColsPerTile = Math.max(1, Math.floor(usableW / pitch));
    const maxRowsPerTile = Math.max(1, Math.floor(usableH / pitch));
    tileColSplits = splitGridUnits(cols, maxColsPerTile);
    tileRowSplits = splitGridUnits(rows, maxRowsPerTile);
  }

  return {
    cols,
    rows,
    gridWidthMm,
    gridDepthMm,
    totalWidthMm,
    totalDepthMm,
    marginLeftMm,
    marginRightMm,
    marginTopMm,
    marginBottomMm,
    tileColSplits,
    tileRowSplits,
    fitsSingleBed,
  };
}

/**
 * Build an outer contour polyline for a tile, optionally with interlocking
 * dovetail puzzle tabs along split seams (used on solid backing plates or compact grid seams).
 */
function buildTileOuterPolyline(params: {
  width: number;
  height: number;
  kerfHalf: number;
  roundBL: boolean;
  roundBR: boolean;
  roundTR: boolean;
  roundTL: boolean;
  bottomSeam: 'none' | 'female';
  rightSeam: 'none' | 'male';
  topSeam: 'none' | 'male';
  leftSeam: 'none' | 'female';
  gridCols: number;
  gridRows: number;
  leftOffsetMm: number;
  bottomOffsetMm: number;
  compactTabs?: boolean;
}): VectorPolyline {
  const {
    width,
    height,
    kerfHalf,
    roundBL,
    roundBR,
    roundTR,
    roundTL,
    bottomSeam,
    rightSeam,
    topSeam,
    leftSeam,
    gridCols,
    gridRows,
    leftOffsetMm,
    bottomOffsetMm,
    compactTabs = false,
  } = params;

  const r = Math.max(
    0,
    GRIDFINITY_SPEC.OUTER_CORNER_RADIUS_MM + kerfHalf
  );
  const pitch = GRIDFINITY_SPEC.PITCH_MM;

  // Dovetail puzzle tab profile parameters (compact mode stays within 2.3mm grid web)
  const tabDepth = compactTabs ? 1.4 : 4.6;
  const tabNeckHalf = compactTabs ? 3.2 : 4.2;
  const tabHeadHalf = compactTabs ? 4.4 : 5.8;

  const x0 = -kerfHalf;
  const x1 = width + kerfHalf;
  const y0 = -kerfHalf;
  const y1 = height + kerfHalf;

  const vertices: PolylineVertex[] = [];

  // Helper to append dovetail tab along an edge parameterized from t=0..1 in CCW direction
  // For male tab: protrudes outward along edge normal; for female: indents inward
  const appendHorizontalSeam = (
    seam: 'none' | 'male' | 'female',
    yEdge: number,
    isBottom: boolean
  ) => {
    if (seam === 'none') return;
    const sign = isBottom ? -1 : 1; // outward normal Y sign
    const dir = isBottom ? 1 : -1; // CCW travel X direction
    const depth = (seam === 'male' ? 1 : -1) * sign * tabDepth;
    // Place one dovetail tab centered on each grid cell in the tile
    const indices = [];
    for (let c = 0; c < gridCols; c++) indices.push(c);
    if (!isBottom) indices.reverse();

    for (const c of indices) {
      const cx = leftOffsetMm + (c + 0.5) * pitch;
      // Kerf compensation: male tab expands outward (+kerfHalf on flanks), female socket shrinks inward (-kerfHalf into void = narrower slot)
      const neckAdjust = seam === 'male' ? kerfHalf : -kerfHalf;
      const headAdjust = seam === 'male' ? kerfHalf : -kerfHalf;
      const nh = tabNeckHalf + neckAdjust;
      const hh = tabHeadHalf + headAdjust;
      // Note: yEdge already includes kerfHalf outward offset on straight spans
      vertices.push({ x: cx - dir * nh, y: yEdge, bulge: 0 });
      vertices.push({ x: cx - dir * hh, y: yEdge + depth, bulge: 0 });
      vertices.push({ x: cx + dir * hh, y: yEdge + depth, bulge: 0 });
      vertices.push({ x: cx + dir * nh, y: yEdge, bulge: 0 });
    }
  };

  const appendVerticalSeam = (
    seam: 'none' | 'male' | 'female',
    xEdge: number,
    isRight: boolean
  ) => {
    if (seam === 'none') return;
    const sign = isRight ? 1 : -1; // outward normal X sign
    const dir = isRight ? 1 : -1; // CCW travel Y direction
    const depth = (seam === 'male' ? 1 : -1) * sign * tabDepth;
    const indices = [];
    for (let rIdx = 0; rIdx < gridRows; rIdx++) indices.push(rIdx);
    if (!isRight) indices.reverse();

    for (const rIdx of indices) {
      const cy = bottomOffsetMm + (rIdx + 0.5) * pitch;
      const neckAdjust = seam === 'male' ? kerfHalf : -kerfHalf;
      const headAdjust = seam === 'male' ? kerfHalf : -kerfHalf;
      const nh = tabNeckHalf + neckAdjust;
      const hh = tabHeadHalf + headAdjust;
      vertices.push({ x: xEdge, y: cy - dir * nh, bulge: 0 });
      vertices.push({ x: xEdge + depth, y: cy - dir * hh, bulge: 0 });
      vertices.push({ x: xEdge + depth, y: cy + dir * hh, bulge: 0 });
      vertices.push({ x: xEdge, y: cy + dir * nh, bulge: 0 });
    }
  };

  // Bottom-left start -> Bottom edge -> Bottom-right corner
  vertices.push({ x: roundBL ? x0 + r : x0, y: y0, bulge: 0 });
  appendHorizontalSeam(bottomSeam, y0, true);
  if (roundBR) {
    vertices.push({ x: x1 - r, y: y0, bulge: BULGE_90_DEG });
    vertices.push({ x: x1, y: y0 + r, bulge: 0 });
  } else {
    vertices.push({ x: x1, y: y0, bulge: 0 });
  }

  // Right edge -> Top-right corner
  appendVerticalSeam(rightSeam, x1, true);
  if (roundTR) {
    vertices.push({ x: x1, y: y1 - r, bulge: BULGE_90_DEG });
    vertices.push({ x: x1 - r, y: y1, bulge: 0 });
  } else {
    vertices.push({ x: x1, y: y1, bulge: 0 });
  }

  // Top edge -> Top-left corner
  appendHorizontalSeam(topSeam, y1, false);
  if (roundTL) {
    vertices.push({ x: x0 + r, y: y1, bulge: BULGE_90_DEG });
    vertices.push({ x: x0, y: y1 - r, bulge: 0 });
  } else {
    vertices.push({ x: x0, y: y1, bulge: 0 });
  }

  // Left edge -> Bottom-left corner
  appendVerticalSeam(leftSeam, x0, false);
  if (roundBL) {
    vertices.push({ x: x0, y: y0 + r, bulge: BULGE_90_DEG });
  }

  return {
    kind: 'polyline',
    layer: 'CUT_OUTER',
    closed: true,
    vertices,
  };
}

/**
 * Compute approximate perimeter / cut length of a polyline (including circular arc bulges).
 */
export function computeEntityCutLength(entity: VectorEntity): number {
  if (entity.kind === 'text') return 0;
  if (entity.kind === 'circle') {
    return 2 * Math.PI * entity.r;
  }
  const verts = entity.vertices;
  if (verts.length < 2) return 0;
  let total = 0;
  const count = entity.closed ? verts.length : verts.length - 1;
  for (let i = 0; i < count; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const chord = Math.hypot(dx, dy);
    if (chord < 1e-9) continue;
    const bulge = a.bulge ?? 0;
    if (Math.abs(bulge) < 1e-6) {
      total += chord;
    } else {
      const theta = 4 * Math.atan(Math.abs(bulge));
      const radius = chord / (2 * Math.sin(theta / 2));
      total += radius * theta;
    }
  }
  return total;
}

/**
 * Pack generated tile layers onto sheets matching the configured laser bed size,
 * aligning rows from the top-left of each sheet so SVG / laser bed origins read top-down.
 */
function packPartsOntoSheets(
  parts: GeneratedTileLayer[],
  bedWidthMm: number,
  bedHeightMm: number,
  spacingMm: number,
  unlimited: boolean
): SheetPage[] {
  if (parts.length === 0) return [];

  const margin = Math.max(2, spacingMm);
  const effectiveBedW = unlimited
    ? parts.reduce((acc, p) => acc + p.widthMm + spacingMm * 2, 0) + 40
    : bedWidthMm;
  const effectiveBedH = unlimited
    ? Math.max(...parts.map((p) => p.heightMm)) + spacingMm * 4
    : bedHeightMm;

  const sheets: SheetPage[] = [];
  let cursorX = margin;
  let cursorTopY = margin;
  let rowHeight = 0;
  let currentSheet: SheetPage = {
    sheetIndex: 0,
    widthMm: effectiveBedW,
    heightMm: effectiveBedH,
    parts: [],
  };
  sheets.push(currentSheet);

  // Reserve extra clearance for protruding male puzzle tabs on right/top edges if present
  const tabPad = 5.5;

  for (const part of parts) {
    const hasTabAllowance = part.role === 'bottom-backing';
    const padRight = hasTabAllowance ? tabPad : 0;
    const padTop = hasTabAllowance ? tabPad : 0;
    const boxW = part.widthMm + padRight;
    const boxH = part.heightMm + padTop;

    if (
      !unlimited &&
      cursorX + boxW + margin > effectiveBedW &&
      currentSheet.parts.length > 0
    ) {
      cursorX = margin;
      cursorTopY += rowHeight + spacingMm;
      rowHeight = 0;
    }

    if (
      !unlimited &&
      cursorTopY + boxH + margin > effectiveBedH &&
      currentSheet.parts.length > 0
    ) {
      currentSheet = {
        sheetIndex: sheets.length,
        widthMm: effectiveBedW,
        heightMm: effectiveBedH,
        parts: [],
      };
      sheets.push(currentSheet);
      cursorX = margin;
      cursorTopY = margin;
      rowHeight = 0;
    }

    part.sheetX = cursorX;
    // Place from top of sheet downward in SVG space (which is effectiveBedH - cursorTopY - boxH in CAD Y-up space)
    part.sheetY = Math.max(margin, effectiveBedH - cursorTopY - boxH);
    part.sheetIndex = currentSheet.sheetIndex;
    currentSheet.parts.push(part);

    cursorX += boxW + spacingMm;
    rowHeight = Math.max(rowHeight, boxH);
  }

  return sheets;
}

export function validateConfig(
  config: GridfinityConfig,
  dimensions: ComputedDimensions
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const pitch = GRIDFINITY_SPEC.PITCH_MM;

  if (config.sizingMode === 'drawer') {
    if (config.drawerWidthMm < pitch || config.drawerDepthMm < pitch) {
      issues.push({
        severity: 'error',
        message: `Drawer interior must be at least ${pitch} × ${pitch} mm to fit a 1×1 Gridfinity cell.`,
      });
    }
  } else {
    if (config.gridCols < 1 || config.gridRows < 1) {
      issues.push({
        severity: 'error',
        message: 'Grid dimensions must be at least 1 × 1 unit.',
      });
    }
  }

  const bed =
    config.bedPreset === 'custom'
      ? { widthMm: config.bedWidthMm, heightMm: config.bedHeightMm }
      : BED_PRESETS[config.bedPreset];

  if (
    config.bedPreset !== 'unlimited' &&
    (bed.widthMm < 60 || bed.heightMm < 60)
  ) {
    issues.push({
      severity: 'error',
      message: 'Laser cutter bed must be at least 60 × 60 mm to hold a 1×1 tile with tabs.',
    });
  }

  if (config.kerfMm < 0 || config.kerfMm > 1.0) {
    issues.push({
      severity: 'warning',
      message: 'Kerf values above 1.0 mm are unusual for laser cutters and may distort pocket fit.',
    });
  }

  if (
    config.stackArchitecture === 'single-layer-minimal' &&
    config.includeMagnets
  ) {
    issues.push({
      severity: 'warning',
      message: '1-Layer Minimal Frame has no solid backing sheet, so magnet pockets are omitted.',
    });
  }

  if (
    dimensions.marginLeftMm > 0 &&
    dimensions.marginLeftMm < 2.0 &&
    config.sizingMode === 'drawer' &&
    config.fillDrawerBorders
  ) {
    issues.push({
      severity: 'warning',
      message: `Drawer border margin is thin (${dimensions.marginLeftMm.toFixed(1)} mm); consider switching to Standard 42 mm Multiple if material frays.`,
    });
  }

  return issues;
}

interface TileEntityBuildParams {
  config: GridfinityConfig;
  dimensions: ComputedDimensions;
  role: LayerRole;
  tCol: number;
  tRow: number;
  effectiveKerfMm: number;
  includeLabels: boolean;
}

function buildTileEntitiesForKerf({
  config,
  dimensions,
  role,
  tCol,
  tRow,
  effectiveKerfMm,
  includeLabels,
}: TileEntityBuildParams): {
  entities: VectorEntity[];
  widthMm: number;
  heightMm: number;
  pocketCount: number;
  magnetHoleCount: number;
  screwHoleCount: number;
} {
  const pitch = GRIDFINITY_SPEC.PITCH_MM;
  const safeKerf = Math.max(0, effectiveKerfMm);
  const kerfHalf = safeKerf / 2;

  const topCutoutNominal =
    GRIDFINITY_SPEC.BIN_BODY_MM + config.topOpeningClearanceMm;
  const stepCutoutNominal =
    GRIDFINITY_SPEC.BIN_SHOULDER_MM + config.stepOpeningClearanceMm;

  const tileGridCols = dimensions.tileColSplits[tCol];
  const tileGridRows = dimensions.tileRowSplits[tRow];

  const isLeftEdge = tCol === 0;
  const isRightEdge = tCol === dimensions.tileColSplits.length - 1;
  const isBottomEdge = tRow === 0;
  const isTopEdge = tRow === dimensions.tileRowSplits.length - 1;

  const leftMargin = isLeftEdge ? dimensions.marginLeftMm : 0;
  const rightMargin = isRightEdge ? dimensions.marginRightMm : 0;
  const bottomMargin = isBottomEdge ? dimensions.marginBottomMm : 0;
  const topMargin = isTopEdge ? dimensions.marginTopMm : 0;

  const widthMm = tileGridCols * pitch + leftMargin + rightMargin;
  const heightMm = tileGridRows * pitch + bottomMargin + topMargin;

  const entities: VectorEntity[] = [];

  // Puzzle tabs on solid bottom-backing layer (or compact micro-tabs on 1-layer minimal grid) along internal split seams
  const isSingleLayerGrid =
    config.stackArchitecture === 'single-layer-minimal' && role === 'mid-step';
  const useTabs =
    config.joineryStyle === 'puzzle-tab' &&
    (role === 'bottom-backing' || isSingleLayerGrid) &&
    !dimensions.fitsSingleBed;

  const outerPolyline = buildTileOuterPolyline({
    width: widthMm,
    height: heightMm,
    kerfHalf,
    roundBL: isLeftEdge && isBottomEdge,
    roundBR: isRightEdge && isBottomEdge,
    roundTR: isRightEdge && isTopEdge,
    roundTL: isLeftEdge && isTopEdge,
    bottomSeam: useTabs && !isBottomEdge ? 'female' : 'none',
    rightSeam: useTabs && !isRightEdge ? 'male' : 'none',
    topSeam: useTabs && !isTopEdge ? 'male' : 'none',
    leftSeam: useTabs && !isLeftEdge ? 'female' : 'none',
    gridCols: tileGridCols,
    gridRows: tileGridRows,
    leftOffsetMm: leftMargin,
    bottomOffsetMm: bottomMargin,
    compactTabs: isSingleLayerGrid,
  });
  entities.push(outerPolyline);

  let pocketCount = 0;
  let magnetHoleCount = 0;
  let screwHoleCount = 0;

  // Inner cell cutouts (top-retainer or mid-step)
  if (role === 'top-retainer' || role === 'mid-step') {
    const nominalSize =
      role === 'top-retainer' ? topCutoutNominal : stepCutoutNominal;
    const nominalRadius =
      role === 'top-retainer'
        ? GRIDFINITY_SPEC.BIN_CORNER_RADIUS_MM +
          config.topOpeningClearanceMm / 2
        : GRIDFINITY_SPEC.STEP_CORNER_RADIUS_MM +
          config.stepOpeningClearanceMm / 2;

    // Inner holes shrink by kerf (2 * kerfHalf) so physical cut equals nominalSize
    const cutSize = Math.max(4, nominalSize - safeKerf);
    const cutRadius = Math.max(0.2, nominalRadius - kerfHalf);
    const cellInset = (pitch - cutSize) / 2;

    for (let r = 0; r < tileGridRows; r++) {
      for (let c = 0; c < tileGridCols; c++) {
        const px = leftMargin + c * pitch + cellInset;
        const py = bottomMargin + r * pitch + cellInset;
        entities.push(
          makeRoundedRectPolyline(
            px,
            py,
            cutSize,
            cutSize,
            cutRadius,
            'CUT_INNER'
          )
        );
        pocketCount++;
      }
    }
  }

  // Optional skeletonized weight-reduction windows in solid bottom-backing layer
  if (role === 'bottom-backing' && config.skeletonizeBacking) {
    const skelSize = Math.max(
      4,
      GRIDFINITY_SPEC.SKELETON_WINDOW_MM - safeKerf
    );
    const skelR = Math.max(
      0.5,
      GRIDFINITY_SPEC.SKELETON_CORNER_RADIUS_MM - kerfHalf
    );
    const skelInset = (pitch - skelSize) / 2;

    for (let r = 0; r < tileGridRows; r++) {
      for (let c = 0; c < tileGridCols; c++) {
        const px = leftMargin + c * pitch + skelInset;
        const py = bottomMargin + r * pitch + skelInset;
        entities.push(
          makeRoundedRectPolyline(
            px,
            py,
            skelSize,
            skelSize,
            skelR,
            'CUT_INNER'
          )
        );
        pocketCount++;
      }
    }
  }

  // Magnet holes on solid bottom backing layer
  if (role === 'bottom-backing' && config.includeMagnets) {
    const magnetR = Math.max(
      0.5,
      (config.magnetHoleDiameterMm - safeKerf) / 2
    );
    const inset = GRIDFINITY_SPEC.MAGNET_EDGE_INSET_MM;

    for (let r = 0; r < tileGridRows; r++) {
      for (let c = 0; c < tileGridCols; c++) {
        const cellX = leftMargin + c * pitch;
        const cellY = bottomMargin + r * pitch;
        const offsets: [number, number][] = [
          [inset, inset],
          [pitch - inset, inset],
          [pitch - inset, pitch - inset],
          [inset, pitch - inset],
        ];
        for (const [ox, oy] of offsets) {
          const circle: VectorCircle = {
            kind: 'circle',
            layer: 'CUT_MAGNETS',
            cx: cellX + ox,
            cy: cellY + oy,
            r: magnetR,
          };
          entities.push(circle);
          magnetHoleCount++;
        }
      }
    }
  }

  // M3 alignment screw holes placed at solid 4-way interior grid intersections
  if (config.includeAlignmentScrews) {
    const screwR = Math.max(0.4, (config.screwHoleDiameterMm - safeKerf) / 2);
    const screwPoints: [number, number][] = [];
    const addUniquePoint = (x: number, y: number) => {
      if (!screwPoints.some(([px, py]) => Math.hypot(px - x, py - y) < 1e-3)) {
        screwPoints.push([x, y]);
      }
    };

    if (tileGridCols >= 2 && tileGridRows >= 2) {
      const cFirst = 1;
      const cLast = tileGridCols - 1;
      const rFirst = 1;
      const rLast = tileGridRows - 1;
      addUniquePoint(leftMargin + cFirst * pitch, bottomMargin + rFirst * pitch);
      addUniquePoint(leftMargin + cLast * pitch, bottomMargin + rFirst * pitch);
      addUniquePoint(leftMargin + cLast * pitch, bottomMargin + rLast * pitch);
      addUniquePoint(leftMargin + cFirst * pitch, bottomMargin + rLast * pitch);
    } else if (tileGridCols >= 2) {
      addUniquePoint(leftMargin + pitch, bottomMargin + pitch / 2);
      addUniquePoint(
        leftMargin + (tileGridCols - 1) * pitch,
        bottomMargin + pitch / 2
      );
    } else if (tileGridRows >= 2) {
      addUniquePoint(leftMargin + pitch / 2, bottomMargin + pitch);
      addUniquePoint(
        leftMargin + pitch / 2,
        bottomMargin + (tileGridRows - 1) * pitch
      );
    } else {
      const cornerInset = 2.0;
      addUniquePoint(leftMargin + cornerInset, bottomMargin + cornerInset);
      addUniquePoint(
        leftMargin + pitch - cornerInset,
        bottomMargin + cornerInset
      );
      addUniquePoint(
        leftMargin + pitch - cornerInset,
        bottomMargin + pitch - cornerInset
      );
      addUniquePoint(
        leftMargin + cornerInset,
        bottomMargin + pitch - cornerInset
      );
    }

    for (const [sx, sy] of screwPoints) {
      entities.push({
        kind: 'circle',
        layer: 'CUT_SCREWS',
        cx: sx,
        cy: sy,
        r: screwR,
      });
      screwHoleCount++;
    }
  }

  // Optional engraved part label positioned on solid material without crossing cutlines
  if (includeLabels && config.includeEngravedLabels) {
    const tileTag =
      dimensions.tileColSplits.length > 1 ||
      dimensions.tileRowSplits.length > 1
        ? ` T${tCol + 1}-${tRow + 1}`
        : '';
    const roleShort =
      role === 'top-retainer'
        ? 'L1 TOP'
        : role === 'mid-step'
        ? config.stackArchitecture === 'three-layer-stepped'
          ? 'L2 STEP'
          : 'L1 GRID'
        : 'BASE';

    let labelX = leftMargin + pitch / 2;
    let labelY = bottomMargin + 1.15;
    let textHeightMm = 1.15;

    if (role === 'bottom-backing') {
      labelX = leftMargin + (tileGridCols * pitch) / 2;
      labelY = config.skeletonizeBacking
        ? bottomMargin + (tileGridRows >= 2 ? pitch : 4.2)
        : bottomMargin + (tileGridRows * pitch) / 2;
      textHeightMm = config.skeletonizeBacking ? 2.0 : 3.2;
    } else if (role === 'mid-step') {
      labelX = leftMargin + pitch / 2;
      labelY = bottomMargin >= 3.2 ? bottomMargin / 2 : bottomMargin + 1.15;
      textHeightMm = bottomMargin >= 3.2 ? 1.5 : 1.15;
    } else {
      labelX =
        leftMargin + (tileGridCols >= 2 ? 1.5 * pitch : 0.5 * pitch);
      labelY =
        topMargin >= 3.2
          ? heightMm - topMargin / 2
          : heightMm - topMargin - 1.15;
      textHeightMm = topMargin >= 3.2 ? 1.5 : 1.05;
    }

    const textEntity: VectorText = {
      kind: 'text',
      layer: 'ENGRAVE_LABELS',
      x: labelX,
      y: labelY,
      text: `${roleShort}${tileTag} (${tileGridCols}x${tileGridRows})`,
      heightMm: textHeightMm,
    };
    entities.push(textEntity);
  }

  return {
    entities,
    widthMm,
    heightMm,
    pocketCount,
    magnetHoleCount,
    screwHoleCount,
  };
}

/**
 * Generates the kerf-compensated laser cutting toolpath entities for a specific part,
 * optionally applying a visual magnification multiplier (`kerfScaleFactor`) so subtle
 * kerf offsets (e.g. ±0.075 mm) can be clearly inspected over base geometry at overview zoom.
 */
export function computeToolpathOverlayEntities(
  part: GeneratedTileLayer,
  config: GridfinityConfig,
  dimensions: ComputedDimensions,
  kerfScaleFactor = 1
): VectorEntity[] {
  if (kerfScaleFactor === 1) {
    return part.entities.filter((e) => e.kind !== 'text');
  }
  const scaledKerf = Math.min(
    2.2,
    Math.max(0, config.kerfMm) * kerfScaleFactor
  );
  return buildTileEntitiesForKerf({
    config,
    dimensions,
    role: part.role,
    tCol: part.tileCol,
    tRow: part.tileRow,
    effectiveKerfMm: scaledKerf,
    includeLabels: false,
  }).entities;
}

/**
 * Main entry point: generates all vector layers, tile splits, sheet nesting, and engineering summary.
 */
export function generateGridfinityBaseplate(
  config: GridfinityConfig
): GeneratedModel {
  const dimensions = computeDimensions(config);
  const issues = validateConfig(config, dimensions);

  const archSpec = STACK_ARCHITECTURES[config.stackArchitecture];
  const topCutoutNominal =
    GRIDFINITY_SPEC.BIN_BODY_MM + config.topOpeningClearanceMm;
  const stepCutoutNominal =
    GRIDFINITY_SPEC.BIN_SHOULDER_MM + config.stepOpeningClearanceMm;

  const parts: GeneratedTileLayer[] = [];

  for (const layerMeta of archSpec.layers) {
    const role: LayerRole = layerMeta.role;
    const thicknessMm =
      role === 'top-retainer'
        ? config.topLayerThicknessMm
        : role === 'mid-step'
        ? config.midLayerThicknessMm
        : config.bottomLayerThicknessMm;

    let tileIndex = 0;

    for (let tRow = 0; tRow < dimensions.tileRowSplits.length; tRow++) {
      for (let tCol = 0; tCol < dimensions.tileColSplits.length; tCol++) {
        tileIndex++;
        const tileGridCols = dimensions.tileColSplits[tCol];
        const tileGridRows = dimensions.tileRowSplits[tRow];

        const compensated = buildTileEntitiesForKerf({
          config,
          dimensions,
          role,
          tCol,
          tRow,
          effectiveKerfMm: config.kerfMm,
          includeLabels: true,
        });

        const nominal = buildTileEntitiesForKerf({
          config,
          dimensions,
          role,
          tCol,
          tRow,
          effectiveKerfMm: 0,
          includeLabels: true,
        });

        const cutLengthMm = compensated.entities.reduce(
          (sum, ent) => sum + computeEntityCutLength(ent),
          0
        );

        const partLabel =
          dimensions.tileColSplits.length > 1 ||
          dimensions.tileRowSplits.length > 1
            ? `${layerMeta.label} · Tile ${tCol + 1},${tRow + 1}`
            : layerMeta.label;

        parts.push({
          id: `${role}-c${tCol}-r${tRow}`,
          role,
          label: partLabel,
          tileCol: tCol,
          tileRow: tRow,
          tileIndex,
          gridCols: tileGridCols,
          gridRows: tileGridRows,
          widthMm: compensated.widthMm,
          heightMm: compensated.heightMm,
          sheetX: 0,
          sheetY: 0,
          sheetIndex: 0,
          thicknessMm,
          entities: compensated.entities,
          nominalEntities: nominal.entities,
          stats: {
            pocketCount: compensated.pocketCount,
            magnetHoleCount: compensated.magnetHoleCount,
            screwHoleCount: compensated.screwHoleCount,
            cutLengthMm,
          },
        });
      }
    }
  }

  const bed =
    config.bedPreset === 'custom'
      ? { widthMm: config.bedWidthMm, heightMm: config.bedHeightMm }
      : BED_PRESETS[config.bedPreset];

  const sheets = packPartsOntoSheets(
    parts,
    bed.widthMm,
    bed.heightMm,
    config.sheetSpacingMm,
    config.bedPreset === 'unlimited'
  );

  const totalCutLengthMm = parts.reduce(
    (sum, p) => sum + p.stats.cutLengthMm,
    0
  );
  const totalPocketCutouts = parts.reduce(
    (sum, p) => sum + p.stats.pocketCount,
    0
  );
  const totalMagnetHoles = parts.reduce(
    (sum, p) => sum + p.stats.magnetHoleCount,
    0
  );
  const totalScrewHoles = parts.reduce(
    (sum, p) => sum + p.stats.screwHoleCount,
    0
  );

  return {
    config,
    dimensions,
    parts,
    sheets,
    issues,
    summary: {
      totalParts: parts.length,
      totalSheets: sheets.length,
      totalCells: dimensions.cols * dimensions.rows,
      totalCutLengthMm,
      totalPocketCutouts,
      totalMagnetHoles,
      totalScrewHoles,
      topCutoutMm: topCutoutNominal,
      stepCutoutMm: stepCutoutNominal,
    },
  };
}
