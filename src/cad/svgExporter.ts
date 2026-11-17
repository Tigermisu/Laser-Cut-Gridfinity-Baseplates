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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert a VectorPolyline (CAD Y-up coordinates) to an SVG path `d` string
 * in SVG Y-down coordinates with optional sheet translation `(offsetX, offsetY)`
 * and container height `totalHeight`.
 */
export function polylineToSvgPath(
  poly: VectorPolyline,
  offsetX: number,
  offsetY: number,
  totalHeight: number
): string {
  const verts = poly.vertices;
  if (verts.length === 0) return '';

  const toSvgX = (x: number) => offsetX + x;
  const toSvgY = (y: number) => totalHeight - (offsetY + y);

  const parts: string[] = [`M ${fmt(toSvgX(verts[0].x))} ${fmt(toSvgY(verts[0].y))}`];
  const segCount = poly.closed ? verts.length : verts.length - 1;

  for (let i = 0; i < segCount; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const bx = toSvgX(b.x);
    const by = toSvgY(b.y);
    const bulge = a.bulge ?? 0;

    if (Math.abs(bulge) < 1e-6) {
      parts.push(`L ${fmt(bx)} ${fmt(by)}`);
    } else {
      const chord = Math.hypot(b.x - a.x, b.y - a.y);
      if (chord < 1e-9) continue;
      const theta = 4 * Math.atan(Math.abs(bulge));
      const radius = chord / (2 * Math.sin(theta / 2));
      const largeArc = Math.abs(bulge) > 1 ? 1 : 0;
      // CAD Y-up CCW (bulge > 0) flips to SVG sweep-flag = 0 in Y-down
      const sweep = bulge > 0 ? 0 : 1;
      parts.push(
        `A ${fmt(radius)} ${fmt(radius)} 0 ${largeArc} ${sweep} ${fmt(bx)} ${fmt(by)}`
      );
    }
  }

  if (poly.closed) {
    parts.push('Z');
  }

  return parts.join(' ');
}

function renderEntitiesByLayer(
  items: { entities: VectorEntity[]; offsetX: number; offsetY: number }[],
  totalHeight: number,
  strokeWidthMm: number
): string {
  const layerOrder: CutLayerId[] = [
    'CUT_INNER',
    'CUT_MAGNETS',
    'CUT_SCREWS',
    'CUT_OUTER',
    'ENGRAVE_LABELS',
  ];

  const grouped: Record<CutLayerId, string[]> = {
    CUT_OUTER: [],
    CUT_INNER: [],
    CUT_MAGNETS: [],
    CUT_SCREWS: [],
    ENGRAVE_LABELS: [],
  };

  for (const item of items) {
    for (const ent of item.entities) {
      if (ent.kind === 'polyline') {
        const d = polylineToSvgPath(ent, item.offsetX, item.offsetY, totalHeight);
        if (d) {
          grouped[ent.layer].push(`    <path d="${d}" />`);
        }
      } else if (ent.kind === 'circle') {
        const c = ent as VectorCircle;
        const cx = item.offsetX + c.cx;
        const cy = totalHeight - (item.offsetY + c.cy);
        grouped[c.layer].push(
          `    <circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(c.r)}" />`
        );
      } else if (ent.kind === 'text') {
        const t = ent as VectorText;
        const tx = item.offsetX + t.x;
        const ty = totalHeight - (item.offsetY + t.y);
        grouped[t.layer].push(
          `    <text x="${fmt(tx)}" y="${fmt(ty)}" font-family="sans-serif" font-size="${fmt(
            t.heightMm
          )}" text-anchor="middle" dominant-baseline="central" fill="${
            LAYER_STYLE_META[t.layer].strokeHex
          }" stroke="none">${escapeXml(t.text)}</text>`
        );
      }
    }
  }

  const groupBlocks: string[] = [];
  for (const layerId of layerOrder) {
    const children = grouped[layerId];
    if (children.length === 0) continue;
    const meta = LAYER_STYLE_META[layerId];
    const isTextLayer = layerId === 'ENGRAVE_LABELS';
    const attrs = isTextLayer
      ? `id="${layerId}" data-operation="${meta.operation}"`
      : `id="${layerId}" data-operation="${meta.operation}" fill="none" stroke="${meta.strokeHex}" stroke-width="${fmt(
          strokeWidthMm
        )}" stroke-linecap="round" stroke-linejoin="round"`;
    groupBlocks.push(`  <g ${attrs}>\n${children.join('\n')}\n  </g>`);
  }

  return groupBlocks.join('\n');
}

/**
 * Export a single generated tile/layer part to a standalone millimeter-accurate SVG string.
 */
export function exportPartToSvg(part: GeneratedTileLayer): string {
  const pad = 6; // extra padding around tile so protruding male puzzle tabs stay inside viewBox
  const width = part.widthMm + pad * 2;
  const height = part.heightMm + pad * 2;
  const body = renderEntitiesByLayer(
    [{ entities: part.entities, offsetX: pad, offsetY: pad }],
    height,
    0.1
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}mm" height="${fmt(
      height
    )}mm" viewBox="0 0 ${fmt(width)} ${fmt(height)}">`,
    `  <title>GridCut - ${escapeXml(part.label)}</title>`,
    body,
    `</svg>`,
  ].join('\n');
}

/**
 * Export a nested cut sheet page (fitting laser bed) to a millimeter-accurate SVG string.
 */
export function exportSheetToSvg(sheet: SheetPage): string {
  const width = sheet.widthMm;
  const height = sheet.heightMm;
  const items = sheet.parts.map((p) => ({
    entities: p.entities,
    offsetX: p.sheetX,
    offsetY: p.sheetY,
  }));
  const body = renderEntitiesByLayer(items, height, 0.1);

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}mm" height="${fmt(
      height
    )}mm" viewBox="0 0 ${fmt(width)} ${fmt(height)}">`,
    `  <title>GridCut Sheet ${sheet.sheetIndex + 1}</title>`,
    body,
    `</svg>`,
  ].join('\n');
}

/**
 * Export all sheets stacked vertically into a single combined SVG document.
 */
export function exportAllSheetsToSvg(sheets: SheetPage[]): string {
  if (sheets.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 100 100"></svg>`;
  }
  if (sheets.length === 1) {
    return exportSheetToSvg(sheets[0]);
  }

  const gap = 15;
  const totalWidth = Math.max(...sheets.map((s) => s.widthMm));
  const totalHeight =
    sheets.reduce((sum, s) => sum + s.heightMm, 0) + gap * (sheets.length - 1);

  const items: { entities: VectorEntity[]; offsetX: number; offsetY: number }[] = [];
  let yCursor = 0;
  // Arrange sheets top-to-bottom in CAD Y-up order (first sheet at highest Y)
  for (let i = sheets.length - 1; i >= 0; i--) {
    const s = sheets[i];
    for (const p of s.parts) {
      items.push({
        entities: p.entities,
        offsetX: p.sheetX,
        offsetY: yCursor + p.sheetY,
      });
    }
    yCursor += s.heightMm + gap;
  }

  const body = renderEntitiesByLayer(items, totalHeight, 0.1);
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(totalWidth)}mm" height="${fmt(
      totalHeight
    )}mm" viewBox="0 0 ${fmt(totalWidth)} ${fmt(totalHeight)}">`,
    `  <title>GridCut All Sheets (${sheets.length})</title>`,
    body,
    `</svg>`,
  ].join('\n');
}
