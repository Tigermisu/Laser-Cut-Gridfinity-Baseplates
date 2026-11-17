import { LAYER_STYLE_META } from './gridfinitySpec';
import type {
  CutLayerId,
  GeneratedTileLayer,
  SheetPage,
  VectorCircle,
  VectorEntity,
  VectorPolyline,
  VectorText,
} from './types';

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(4).replace(/\.?0+$/, '') : '0';
}

function pair(code: number, value: string | number): string {
  return `${code}\n${value}`;
}

function buildDxfHeader(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): string[] {
  return [
    pair(0, 'SECTION'),
    pair(2, 'HEADER'),
    pair(9, '$ACADVER'),
    pair(1, 'AC1015'), // AutoCAD 2000 DXF (supports LWPOLYLINE with bulges + $INSUNITS)
    pair(9, '$INSUNITS'),
    pair(70, 4), // 4 = Millimeters
    pair(9, '$MEASUREMENT'),
    pair(70, 1), // 1 = Metric
    pair(9, '$EXTMIN'),
    pair(10, fmt(minX)),
    pair(20, fmt(minY)),
    pair(30, 0),
    pair(9, '$EXTMAX'),
    pair(10, fmt(maxX)),
    pair(20, fmt(maxY)),
    pair(30, 0),
    pair(0, 'ENDSEC'),
  ];
}

function buildDxfTables(): string[] {
  const layers: CutLayerId[] = [
    'CUT_OUTER',
    'CUT_INNER',
    'CUT_MAGNETS',
    'CUT_SCREWS',
    'ENGRAVE_LABELS',
  ];

  const lines: string[] = [
    pair(0, 'SECTION'),
    pair(2, 'TABLES'),
    pair(0, 'TABLE'),
    pair(2, 'LTYPE'),
    pair(70, 1),
    pair(0, 'LTYPE'),
    pair(2, 'CONTINUOUS'),
    pair(70, 0),
    pair(3, 'Solid line'),
    pair(72, 65),
    pair(73, 0),
    pair(40, 0.0),
    pair(0, 'ENDTAB'),
    pair(0, 'TABLE'),
    pair(2, 'LAYER'),
    pair(70, layers.length + 1),
    // Default layer 0
    pair(0, 'LAYER'),
    pair(2, '0'),
    pair(70, 0),
    pair(62, 7),
    pair(6, 'CONTINUOUS'),
  ];

  for (const layerId of layers) {
    const meta = LAYER_STYLE_META[layerId];
    lines.push(
      pair(0, 'LAYER'),
      pair(2, layerId),
      pair(70, 0),
      pair(62, meta.dxfAci),
      pair(6, 'CONTINUOUS')
    );
  }

  lines.push(pair(0, 'ENDTAB'), pair(0, 'ENDSEC'));
  return lines;
}

function entityToDxfLines(
  ent: VectorEntity,
  offsetX: number,
  offsetY: number
): string[] {
  if (ent.kind === 'polyline') {
    const poly = ent as VectorPolyline;
    const verts = poly.vertices;
    if (verts.length === 0) return [];
    const lines: string[] = [
      pair(0, 'LWPOLYLINE'),
      pair(8, poly.layer),
      pair(90, verts.length),
      pair(70, poly.closed ? 1 : 0),
    ];
    for (const v of verts) {
      lines.push(pair(10, fmt(offsetX + v.x)), pair(20, fmt(offsetY + v.y)));
      if (v.bulge && Math.abs(v.bulge) > 1e-6) {
        lines.push(pair(42, fmt(v.bulge)));
      }
    }
    return lines;
  }

  if (ent.kind === 'circle') {
    const c = ent as VectorCircle;
    return [
      pair(0, 'CIRCLE'),
      pair(8, c.layer),
      pair(10, fmt(offsetX + c.cx)),
      pair(20, fmt(offsetY + c.cy)),
      pair(30, 0),
      pair(40, fmt(c.r)),
    ];
  }

  if (ent.kind === 'text') {
    const t = ent as VectorText;
    return [
      pair(0, 'TEXT'),
      pair(8, t.layer),
      pair(10, fmt(offsetX + t.x)),
      pair(20, fmt(offsetY + t.y)),
      pair(30, 0),
      pair(40, fmt(t.heightMm)),
      pair(1, t.text),
      pair(72, 1), // Center horizontal alignment
      pair(11, fmt(offsetX + t.x)),
      pair(21, fmt(offsetY + t.y)),
      pair(31, 0),
    ];
  }

  return [];
}

function buildDxfDocument(
  items: { entities: VectorEntity[]; offsetX: number; offsetY: number }[],
  fallbackWidth: number,
  fallbackHeight: number
): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    for (const ent of item.entities) {
      if (ent.kind === 'polyline') {
        for (const v of ent.vertices) {
          const vx = item.offsetX + v.x;
          const vy = item.offsetY + v.y;
          if (vx < minX) minX = vx;
          if (vy < minY) minY = vy;
          if (vx > maxX) maxX = vx;
          if (vy > maxY) maxY = vy;
        }
      } else if (ent.kind === 'circle') {
        const cx = item.offsetX + ent.cx;
        const cy = item.offsetY + ent.cy;
        if (cx - ent.r < minX) minX = cx - ent.r;
        if (cy - ent.r < minY) minY = cy - ent.r;
        if (cx + ent.r > maxX) maxX = cx + ent.r;
        if (cy + ent.r > maxY) maxY = cy + ent.r;
      }
    }
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = fallbackWidth;
    maxY = fallbackHeight;
  }

  const lines: string[] = [
    ...buildDxfHeader(minX, minY, maxX, maxY),
    ...buildDxfTables(),
    pair(0, 'SECTION'),
    pair(2, 'ENTITIES'),
  ];

  for (const item of items) {
    for (const ent of item.entities) {
      lines.push(...entityToDxfLines(ent, item.offsetX, item.offsetY));
    }
  }

  lines.push(pair(0, 'ENDSEC'), pair(0, 'EOF'));
  return lines.join('\n') + '\n';
}

/**
 * Export a single part/tile layer to AutoCAD 2000 ASCII DXF (mm units, LWPOLYLINE bulges, named layers).
 */
export function exportPartToDxf(part: GeneratedTileLayer): string {
  return buildDxfDocument(
    [{ entities: part.entities, offsetX: 0, offsetY: 0 }],
    part.widthMm,
    part.heightMm
  );
}

/**
 * Export a single nested sheet page to DXF.
 */
export function exportSheetToDxf(sheet: SheetPage): string {
  const items = sheet.parts.map((p) => ({
    entities: p.entities,
    offsetX: p.sheetX,
    offsetY: p.sheetY,
  }));
  return buildDxfDocument(items, sheet.widthMm, sheet.heightMm);
}

/**
 * Export all sheets arranged in CAD coordinates into a single DXF file.
 */
export function exportAllSheetsToDxf(sheets: SheetPage[]): string {
  if (sheets.length === 0) {
    return buildDxfDocument([], 100, 100);
  }
  if (sheets.length === 1) {
    return exportSheetToDxf(sheets[0]);
  }

  const gap = 15;
  const maxX = Math.max(...sheets.map((s) => s.widthMm));
  const items: { entities: VectorEntity[]; offsetX: number; offsetY: number }[] = [];
  let yCursor = 0;

  for (const s of sheets) {
    for (const p of s.parts) {
      items.push({
        entities: p.entities,
        offsetX: p.sheetX,
        offsetY: yCursor + p.sheetY,
      });
    }
    yCursor += s.heightMm + gap;
  }

  return buildDxfDocument(items, maxX, yCursor - gap);
}
