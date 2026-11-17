import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, GRIDFINITY_SPEC } from './gridfinitySpec';
import {
  computeDimensions,
  computeEntityCutLength,
  computeToolpathOverlayEntities,
  generateGridfinityBaseplate,
  makeRoundedRectPolyline,
  splitGridUnits,
} from './geometry';
import {
  exportAllSheetsToSvg,
  exportPartToSvg,
  polylineToSvgPath,
} from './svgExporter';
import { exportAllSheetsToDxf, exportPartToDxf } from './dxfExporter';
import { parsePresetJson, serializePresetJson } from './presetIO';
import type {
  GridfinityConfig,
  VectorCircle,
  VectorPolyline,
  VectorText,
} from './types';

test('standard grid dimensions equal exact 42mm multiples', () => {
  const dims = computeDimensions({
    ...DEFAULT_CONFIG,
    sizingMode: 'grid',
    gridCols: 4,
    gridRows: 3,
  });
  assert.equal(dims.cols, 4);
  assert.equal(dims.rows, 3);
  assert.equal(dims.totalWidthMm, 4 * 42);
  assert.equal(dims.totalDepthMm, 3 * 42);
  assert.equal(dims.marginLeftMm, 0);
  assert.equal(dims.marginTopMm, 0);
});

test('drawer-fit mode computes max grid units and symmetric border margins', () => {
  const dims = computeDimensions({
    ...DEFAULT_CONFIG,
    sizingMode: 'drawer',
    drawerWidthMm: 350,
    drawerDepthMm: 260,
    fillDrawerBorders: true,
  });
  // floor(350/42) = 8 (336mm -> 14mm slack -> 7mm per side)
  // floor(260/42) = 6 (252mm -> 8mm slack -> 4mm per side)
  assert.equal(dims.cols, 8);
  assert.equal(dims.rows, 6);
  assert.equal(dims.gridWidthMm, 336);
  assert.equal(dims.gridDepthMm, 252);
  assert.equal(dims.totalWidthMm, 350);
  assert.equal(dims.totalDepthMm, 260);
  assert.equal(dims.marginLeftMm, 7);
  assert.equal(dims.marginRightMm, 7);
  assert.equal(dims.marginBottomMm, 4);
  assert.equal(dims.marginTopMm, 4);
});

test('splitGridUnits balances oversized plates evenly across tiles', () => {
  assert.deepEqual(splitGridUnits(7, 5), [4, 3]);
  assert.deepEqual(splitGridUnits(10, 4), [4, 3, 3]);
  assert.deepEqual(splitGridUnits(3, 5), [3]);
});

test('kerf compensation expands outer perimeter and shrinks inner cutouts', () => {
  const kerf = 0.2;
  const model = generateGridfinityBaseplate({
    ...DEFAULT_CONFIG,
    sizingMode: 'grid',
    gridCols: 1,
    gridRows: 1,
    stackArchitecture: 'three-layer-stepped',
    kerfMm: kerf,
    topOpeningClearanceMm: 0.2, // nominal 41.7mm
    stepOpeningClearanceMm: 0.2, // nominal 37.4mm
    includeMagnets: true,
    magnetHoleDiameterMm: 6.3,
  });

  const topPart = model.parts.find((p) => p.role === 'top-retainer')!;
  const midPart = model.parts.find((p) => p.role === 'mid-step')!;
  const basePart = model.parts.find((p) => p.role === 'bottom-backing')!;

  const outerPoly = topPart.entities.find(
    (e): e is VectorPolyline => e.kind === 'polyline' && e.layer === 'CUT_OUTER'
  )!;
  const xs = outerPoly.vertices.map((v) => v.x);
  const ys = outerPoly.vertices.map((v) => v.y);
  const outerSpanX = Math.max(...xs) - Math.min(...xs);
  const outerSpanY = Math.max(...ys) - Math.min(...ys);
  assert.ok(Math.abs(outerSpanX - (42 + kerf)) < 1e-6);
  assert.ok(Math.abs(outerSpanY - (42 + kerf)) < 1e-6);

  const topInner = topPart.entities.find(
    (e): e is VectorPolyline => e.kind === 'polyline' && e.layer === 'CUT_INNER'
  )!;
  const topInnerXs = topInner.vertices.map((v) => v.x);
  const topInnerSpan = Math.max(...topInnerXs) - Math.min(...topInnerXs);
  // nominal = 41.5 + 0.2 = 41.7, minus kerf 0.2 = 41.5
  assert.ok(Math.abs(topInnerSpan - 41.5) < 1e-6);

  const midInner = midPart.entities.find(
    (e): e is VectorPolyline => e.kind === 'polyline' && e.layer === 'CUT_INNER'
  )!;
  const midInnerXs = midInner.vertices.map((v) => v.x);
  const midInnerSpan = Math.max(...midInnerXs) - Math.min(...midInnerXs);
  // nominal = 37.2 + 0.2 = 37.4, minus kerf 0.2 = 37.2
  assert.ok(Math.abs(midInnerSpan - 37.2) < 1e-6);

  const magnetHole = basePart.entities.find(
    (e): e is VectorCircle => e.kind === 'circle' && e.layer === 'CUT_MAGNETS'
  )!;
  // diameter 6.3 - kerf 0.2 = 6.1 -> radius 3.05
  assert.ok(Math.abs(magnetHole.r - 3.05) < 1e-6);
});

test('oversized plate splits into multiple tiles with interlocking puzzle tabs on backing layer', () => {
  const cfg: GridfinityConfig = {
    ...DEFAULT_CONFIG,
    sizingMode: 'grid',
    gridCols: 10, // 420mm > K40 300mm bed
    gridRows: 6, // 252mm > K40 200mm bed
    bedPreset: 'k40-300x200',
    joineryStyle: 'puzzle-tab',
    stackArchitecture: 'two-layer-standard',
  };
  const model = generateGridfinityBaseplate(cfg);

  assert.equal(model.dimensions.fitsSingleBed, false);
  assert.ok(model.dimensions.tileColSplits.length >= 2);
  assert.ok(model.dimensions.tileRowSplits.length >= 2);
  assert.ok(model.sheets.length >= 2);

  // Backing tile (0,0) should have protruding male tabs on right/top edges -> vertices beyond widthMm
  const baseTile00 = model.parts.find(
    (p) => p.role === 'bottom-backing' && p.tileCol === 0 && p.tileRow === 0
  )!;
  const outer = baseTile00.entities.find(
    (e): e is VectorPolyline => e.kind === 'polyline' && e.layer === 'CUT_OUTER'
  )!;
  const maxX = Math.max(...outer.vertices.map((v) => v.x));
  assert.ok(maxX > baseTile00.widthMm + 3.5);
});

test('rounded rectangle arc perimeter and SVG arc commands are mathematically accurate', () => {
  const rect = makeRoundedRectPolyline(0, 0, 42, 42, 4, 'CUT_OUTER');
  const expectedLength = 4 * (42 - 8) + 2 * Math.PI * 4;
  const actualLength = computeEntityCutLength(rect);
  assert.ok(Math.abs(actualLength - expectedLength) < 1e-4);

  const svgPath = polylineToSvgPath(rect, 0, 0, 42);
  assert.ok(svgPath.startsWith('M 4 42'));
  assert.ok(svgPath.includes('A 4 4 0 0 0'));
  assert.ok(svgPath.endsWith('Z'));
});

test('SVG and DXF exports produce valid, NaN-free laser-ready vector files', () => {
  const model = generateGridfinityBaseplate({
    ...DEFAULT_CONFIG,
    gridCols: 3,
    gridRows: 2,
    stackArchitecture: 'two-layer-standard',
    includeMagnets: true,
    includeAlignmentScrews: true,
    includeEngravedLabels: true,
  });

  const partSvg = exportPartToSvg(model.parts[0]);
  assert.ok(partSvg.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(partSvg.includes('mm"'));
  assert.ok(partSvg.includes('id="CUT_OUTER"'));
  assert.ok(partSvg.includes('id="CUT_INNER"'));
  assert.equal(partSvg.includes('NaN'), false);

  const allSvg = exportAllSheetsToSvg(model.sheets);
  assert.ok(allSvg.includes('<svg'));
  assert.equal(allSvg.includes('NaN'), false);

  const partDxf = exportPartToDxf(model.parts[0]);
  assert.ok(partDxf.includes('0\nSECTION\n2\nHEADER'));
  assert.ok(partDxf.includes('$INSUNITS\n70\n4'));
  assert.ok(partDxf.includes('0\nLWPOLYLINE'));
  assert.ok(partDxf.includes('42\n0.4142'));
  assert.ok(partDxf.endsWith('0\nEOF\n'));
  assert.equal(partDxf.includes('NaN'), false);

  const allDxf = exportAllSheetsToDxf(model.sheets);
  assert.ok(allDxf.includes('0\nCIRCLE'));
  assert.ok(allDxf.includes('8\nCUT_MAGNETS'));
  assert.ok(allDxf.includes('8\nCUT_SCREWS'));
  assert.equal(allDxf.includes('NaN'), false);
});

test('validation flags drawer dimensions smaller than 1x1 Gridfinity pitch', () => {
  const model = generateGridfinityBaseplate({
    ...DEFAULT_CONFIG,
    sizingMode: 'drawer',
    drawerWidthMm: 30,
    drawerDepthMm: 100,
  });
  assert.ok(
    model.issues.some((i) => i.severity === 'error' && i.message.includes('42'))
  );
  // Still maintains safe fallback >= 1x1 so geometry never explodes
  assert.equal(model.dimensions.cols, 1);
  assert.equal(GRIDFINITY_SPEC.PITCH_MM, 42);
});

test('M3 alignment holes land on solid interior grid intersections and labels do not collide across layers', () => {
  const model = generateGridfinityBaseplate({
    ...DEFAULT_CONFIG,
    sizingMode: 'grid',
    gridCols: 4,
    gridRows: 3,
    stackArchitecture: 'three-layer-stepped',
    includeAlignmentScrews: true,
    includeEngravedLabels: true,
    skeletonizeBacking: true,
  });

  const topPart = model.parts.find((p) => p.role === 'top-retainer')!;
  const midPart = model.parts.find((p) => p.role === 'mid-step')!;
  const basePart = model.parts.find((p) => p.role === 'bottom-backing')!;

  // Check M3 alignment screws are at solid 42mm interior intersections (42, 42), (126, 42), (126, 84), (42, 84)
  const screws = midPart.entities.filter(
    (e): e is VectorCircle => e.kind === 'circle' && e.layer === 'CUT_SCREWS'
  );
  assert.equal(screws.length, 4);
  assert.deepEqual(
    screws.map((s) => [s.cx, s.cy]),
    [
      [42, 42],
      [126, 42],
      [126, 84],
      [42, 84],
    ]
  );

  // Check skeletonized backing generates 4*3 = 12 inner window cutouts on bottom-backing
  const baseWindows = basePart.entities.filter(
    (e): e is VectorPolyline => e.kind === 'polyline' && e.layer === 'CUT_INNER'
  );
  assert.equal(baseWindows.length, 12);

  // Check engraved labels on top-retainer and mid-step do not occupy identical coordinates
  const topLabel = topPart.entities.find(
    (e): e is VectorText => e.kind === 'text' && e.layer === 'ENGRAVE_LABELS'
  )!;
  const midLabel = midPart.entities.find(
    (e): e is VectorText => e.kind === 'text' && e.layer === 'ENGRAVE_LABELS'
  )!;
  assert.notEqual(topLabel.y, midLabel.y);
});

test('preset JSON serializer and parser round-trip configurations and reject invalid JSON', () => {
  const customConfig: GridfinityConfig = {
    ...DEFAULT_CONFIG,
    sizingMode: 'drawer',
    drawerWidthMm: 410,
    drawerDepthMm: 295,
    stackArchitecture: 'two-layer-standard',
    kerfMm: 0.18,
    skeletonizeBacking: true,
    includeAlignmentScrews: true,
  };

  const json = serializePresetJson(customConfig, '2026-11-17T00:00:00.000Z');
  assert.ok(json.includes('"format": "gridcut-preset"'));

  const parsed = parsePresetJson(json);
  assert.deepEqual(parsed, customConfig);

  // Raw config object with out-of-range values should clamp safely
  const clamped = parsePresetJson(
    JSON.stringify({
      sizingMode: 'grid',
      gridCols: 99,
      gridRows: 0,
      kerfMm: 2.5,
    })
  );
  assert.equal(clamped.gridCols, 30);
  assert.equal(clamped.gridRows, 1);
  assert.equal(clamped.kerfMm, 1.5);

  // Invalid JSON or missing recognized fields should throw descriptive errors
  assert.throws(() => parsePresetJson('{ broken json'), /Invalid JSON file/);
  assert.throws(
    () => parsePresetJson(JSON.stringify({ hello: 'world' })),
    /Unrecognized JSON schema/
  );
});

test('base geometry nominalEntities vs kerf-compensated toolpath overlay entities offset accurately', () => {
  const cfg: GridfinityConfig = {
    ...DEFAULT_CONFIG,
    gridCols: 2,
    gridRows: 2,
    kerfMm: 0.15,
    stackArchitecture: 'two-layer-standard',
  };
  const model = generateGridfinityBaseplate(cfg);
  const gridPart = model.parts.find((p) => p.role === 'mid-step')!;

  const nominalOuter = gridPart.nominalEntities.find(
    (e): e is VectorPolyline => e.kind === 'polyline' && e.layer === 'CUT_OUTER'
  )!;
  const nominalInner = gridPart.nominalEntities.find(
    (e): e is VectorPolyline => e.kind === 'polyline' && e.layer === 'CUT_INNER'
  )!;

  const nominalOuterW =
    Math.max(...nominalOuter.vertices.map((v) => v.x)) -
    Math.min(...nominalOuter.vertices.map((v) => v.x));
  const nominalInnerW =
    Math.max(...nominalInner.vertices.map((v) => v.x)) -
    Math.min(...nominalInner.vertices.map((v) => v.x));

  assert.ok(Math.abs(nominalOuterW - 84.0) < 1e-6);
  assert.ok(Math.abs(nominalInnerW - 37.4) < 1e-6);

  const previewOverlay8x = computeToolpathOverlayEntities(
    gridPart,
    cfg,
    model.dimensions,
    8
  );
  const overlayOuter = previewOverlay8x.find(
    (e): e is VectorPolyline => e.kind === 'polyline' && e.layer === 'CUT_OUTER'
  )!;
  const overlayInner = previewOverlay8x.find(
    (e): e is VectorPolyline => e.kind === 'polyline' && e.layer === 'CUT_INNER'
  )!;

  const overlayOuterW =
    Math.max(...overlayOuter.vertices.map((v) => v.x)) -
    Math.min(...overlayOuter.vertices.map((v) => v.x));
  const overlayInnerW =
    Math.max(...overlayInner.vertices.map((v) => v.x)) -
    Math.min(...overlayInner.vertices.map((v) => v.x));

  // 8x scaled kerf (0.15 * 8 = 1.2mm): outer expands by +1.2mm, inner shrinks by -1.2mm
  assert.ok(Math.abs(overlayOuterW - (84.0 + 1.2)) < 1e-6);
  assert.ok(Math.abs(overlayInnerW - (37.4 - 1.2)) < 1e-6);
});



