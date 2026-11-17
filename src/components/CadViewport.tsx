import { type ReactNode, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Crosshair,
  Maximize2,
  Moon,
  Sun,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { computeToolpathOverlayEntities } from '../cad/geometry';
import {
  GRIDFINITY_SPEC,
  LAYER_STYLE_META,
  STACK_ARCHITECTURES,
} from '../cad/gridfinitySpec';
import { polylineToSvgPath } from '../cad/svgExporter';
import type {
  CutLayerId,
  GeneratedModel,
  GeneratedTileLayer,
  LayerRole,
  VectorCircle,
  VectorEntity,
  VectorText,
  ViewportMode,
} from '../cad/types';

interface CadViewportProps {
  model: GeneratedModel;
  viewportMode: ViewportMode;
  onChangeViewportMode: (mode: ViewportMode) => void;
  selectedPartId: string | null;
  isDark: boolean;
  onToggleTheme: () => void;
  manifestCollapsed?: boolean;
  floatingPanel?: ReactNode;
}

const ALL_VECTOR_LAYERS: CutLayerId[] = [
  'CUT_OUTER',
  'CUT_INNER',
  'CUT_MAGNETS',
  'CUT_SCREWS',
  'ENGRAVE_LABELS',
];

export function CadViewport({
  model,
  viewportMode,
  onChangeViewportMode,
  selectedPartId,
  isDark,
  onToggleTheme,
  manifestCollapsed = false,
  floatingPanel,
}: CadViewportProps) {
  const [roleFilter, setRoleFilter] = useState<'all' | LayerRole>('all');
  const [sheetFilter, setSheetFilter] = useState<'all' | number>('all');
  const [visibleLayers, setVisibleLayers] = useState<Record<CutLayerId, boolean>>({
    CUT_OUTER: true,
    CUT_INNER: true,
    CUT_MAGNETS: true,
    CUT_SCREWS: true,
    ENGRAVE_LABELS: true,
  });
  const [showToolpathOverlay, setShowToolpathOverlay] = useState(true);
  const [kerfVisualScale, setKerfVisualScale] = useState<1 | 8>(8);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const archSpec = STACK_ARCHITECTURES[model.config.stackArchitecture];
  const activeRoleExists =
    roleFilter === 'all' || archSpec.layers.some((l) => l.role === roleFilter);
  const effectiveRoleFilter = activeRoleExists ? roleFilter : 'all';

  const toggleLayer = (id: CutLayerId) => {
    setVisibleLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getLayerStroke = (layer: CutLayerId) => {
    if (!isDark) return LAYER_STYLE_META[layer].strokeHex;
    switch (layer) {
      case 'CUT_OUTER':
        return '#F87171';
      case 'CUT_INNER':
        return '#60A5FA';
      case 'CUT_MAGNETS':
        return '#2DD4BF';
      case 'CUT_SCREWS':
        return '#4ADE80';
      case 'ENGRAVE_LABELS':
        return '#94A3B8';
    }
  };

  // Compute global assembled coordinates for each tile in Stacked Blueprint mode
  const assembledTiles = useMemo(() => {
    const { dimensions, parts } = model;
    const pitch = GRIDFINITY_SPEC.PITCH_MM;

    const colOffsets: number[] = [];
    let cx = 0;
    for (let i = 0; i < dimensions.tileColSplits.length; i++) {
      colOffsets.push(cx);
      const marginL = i === 0 ? dimensions.marginLeftMm : 0;
      cx += dimensions.tileColSplits[i] * pitch + marginL;
    }

    const rowOffsets: number[] = [];
    let cy = 0;
    for (let i = 0; i < dimensions.tileRowSplits.length; i++) {
      rowOffsets.push(cy);
      const marginB = i === 0 ? dimensions.marginBottomMm : 0;
      cy += dimensions.tileRowSplits[i] * pitch + marginB;
    }

    return parts
      .filter(
        (p) => effectiveRoleFilter === 'all' || p.role === effectiveRoleFilter
      )
      .map((part) => ({
        part,
        offsetX: colOffsets[part.tileCol] ?? 0,
        offsetY: rowOffsets[part.tileRow] ?? 0,
      }));
  }, [model, effectiveRoleFilter]);

  const renderVectorEntities = (
    entities: VectorEntity[],
    offsetX: number,
    offsetY: number,
    svgTotalHeight: number,
    strokeScale = 1,
    dimmed = false
  ) => {
    return entities.map((ent, idx) => {
      if (!visibleLayers[ent.layer]) return null;
      const strokeColor = getLayerStroke(ent.layer);
      const opacity = dimmed ? 0.35 : showToolpathOverlay && ent.kind !== 'text' ? 0.78 : 1;

      if (ent.kind === 'polyline') {
        const d = polylineToSvgPath(ent, offsetX, offsetY, svgTotalHeight);
        if (!d) return null;
        return (
          <path
            key={idx}
            d={d}
            fill="none"
            stroke={strokeColor}
            strokeWidth={(ent.layer === 'CUT_OUTER' ? 0.52 : 0.38) * strokeScale}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={opacity}
          />
        );
      }

      if (ent.kind === 'circle') {
        const c = ent as VectorCircle;
        return (
          <circle
            key={idx}
            cx={offsetX + c.cx}
            cy={svgTotalHeight - (offsetY + c.cy)}
            r={c.r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={0.35 * strokeScale}
            opacity={opacity}
          />
        );
      }

      if (ent.kind === 'text') {
        const t = ent as VectorText;
        return (
          <text
            key={idx}
            x={offsetX + t.x}
            y={svgTotalHeight - (offsetY + t.y)}
            fontSize={t.heightMm}
            fontFamily="JetBrains Mono, monospace"
            textAnchor="middle"
            dominantBaseline="central"
            fill={strokeColor}
            stroke={isDark ? '#0F172A' : '#ffffff'}
            strokeWidth={0.9 * strokeScale}
            style={{ paintOrder: 'stroke' }}
            opacity={dimmed ? 0.35 : 1}
          >
            {t.text}
          </text>
        );
      }

      return null;
    });
  };

  /**
   * Renders the simplified kerf-compensated laser toolpath overlay on top of the base geometry.
   * Shows the laser beam kerf swath + high-contrast dashed toolpath centerline + pierce start markers.
   */
  const renderToolpathOverlay = (
    part: GeneratedTileLayer,
    offsetX: number,
    offsetY: number,
    svgTotalHeight: number,
    strokeScale = 1,
    dimmed = false
  ) => {
    if (!showToolpathOverlay) return null;

    const toolpathEntities = computeToolpathOverlayEntities(
      part,
      model.config,
      model.dimensions,
      kerfVisualScale
    );

    const beamColor = isDark ? '#FBBF24' : '#D97706';
    const swathColor = isDark ? '#F59E0B' : '#F59E0B';
    const effectiveKerfWidth = Math.max(
      0.45 * strokeScale,
      Math.min(1.6 * strokeScale, model.config.kerfMm * kerfVisualScale)
    );
    const dashLen = 1.6 * strokeScale;
    const gapLen = 1.1 * strokeScale;
    const opacity = dimmed ? 0.25 : 0.95;

    return (
      <g
        data-testid="toolpath-overlay"
        data-part-id={part.id}
        opacity={opacity}
      >
        {toolpathEntities.map((ent, idx) => {
          if (ent.kind === 'text' || !visibleLayers[ent.layer]) return null;

          if (ent.kind === 'polyline') {
            const d = polylineToSvgPath(ent, offsetX, offsetY, svgTotalHeight);
            if (!d) return null;
            const startV = ent.vertices[0];
            const pierceX = startV ? offsetX + startV.x : null;
            const pierceY = startV ? svgTotalHeight - (offsetY + startV.y) : null;

            return (
              <g key={`tp-${idx}`}>
                {/* Laser beam kerf swath */}
                {model.config.kerfMm > 0 && (
                  <path
                    d={d}
                    fill="none"
                    stroke={swathColor}
                    strokeWidth={effectiveKerfWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isDark ? 0.22 : 0.18}
                  />
                )}
                {/* Laser toolpath centerline */}
                <path
                  d={d}
                  fill="none"
                  stroke={beamColor}
                  strokeWidth={0.34 * strokeScale}
                  strokeDasharray={`${dashLen} ${gapLen}`}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Laser pierce / entry point marker on outer perimeter */}
                {ent.layer === 'CUT_OUTER' &&
                  pierceX !== null &&
                  pierceY !== null && (
                    <circle
                      cx={pierceX}
                      cy={pierceY}
                      r={0.75 * strokeScale}
                      fill={beamColor}
                    />
                  )}
              </g>
            );
          }

          if (ent.kind === 'circle') {
            const c = ent as VectorCircle;
            const cx = offsetX + c.cx;
            const cy = svgTotalHeight - (offsetY + c.cy);
            return (
              <g key={`tp-${idx}`}>
                {model.config.kerfMm > 0 && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={c.r}
                    fill="none"
                    stroke={swathColor}
                    strokeWidth={effectiveKerfWidth}
                    opacity={isDark ? 0.22 : 0.18}
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={c.r}
                  fill="none"
                  stroke={beamColor}
                  strokeWidth={0.32 * strokeScale}
                  strokeDasharray={`${dashLen * 0.8} ${gapLen * 0.8}`}
                />
              </g>
            );
          }

          return null;
        })}
      </g>
    );
  };

  const renderStackedBlueprint = () => {
    const { dimensions } = model;
    const pad = 28;
    const totalW = dimensions.totalWidthMm + pad * 2;
    const totalH = dimensions.totalDepthMm + pad * 2;
    const strokeScale = Math.max(0.6, Math.min(2.2, Math.max(totalW, totalH) / 260));

    return (
      <svg
        data-testid="cad-svg-viewport"
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="w-full h-full select-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Plate shadow footprint */}
        <rect
          x={pad}
          y={pad}
          width={dimensions.totalWidthMm}
          height={dimensions.totalDepthMm}
          rx={GRIDFINITY_SPEC.OUTER_CORNER_RADIUS_MM}
          fill={isDark ? '#0F172A' : '#ffffff'}
          fillOpacity={isDark ? 0.9 : 0.85}
        />

        {/* Render each layer/tile in global coordinates: Base geometry first, then Kerf Toolpath overlay */}
        {assembledTiles.map(({ part, offsetX, offsetY }) => {
          const isHighlighted = selectedPartId === part.id;
          const isDimmed =
            selectedPartId !== null &&
            !isHighlighted &&
            effectiveRoleFilter === 'all';
          const effectiveStrokeScale = isHighlighted
            ? strokeScale * 1.45
            : strokeScale;
          const baseEntities = showToolpathOverlay
            ? part.nominalEntities
            : part.entities;

          return (
            <g key={part.id}>
              {renderVectorEntities(
                baseEntities,
                pad + offsetX,
                pad + offsetY,
                totalH,
                effectiveStrokeScale,
                isDimmed
              )}
              {renderToolpathOverlay(
                part,
                pad + offsetX,
                pad + offsetY,
                totalH,
                effectiveStrokeScale,
                isDimmed
              )}
            </g>
          );
        })}

        {/* CAD Dimension Callouts */}
        <g
          className="font-mono"
          fontSize={Math.max(3.6, 4.5 * strokeScale)}
          fill={isDark ? '#94A3B8' : '#475569'}
          stroke={isDark ? '#64748B' : '#64748B'}
          strokeWidth={0.28 * strokeScale}
        >
          {/* Top width dimension line */}
          <line
            x1={pad}
            y1={pad - 9}
            x2={pad + dimensions.totalWidthMm}
            y2={pad - 9}
          />
          <line x1={pad} y1={pad - 12} x2={pad} y2={pad - 6} />
          <line
            x1={pad + dimensions.totalWidthMm}
            y1={pad - 12}
            x2={pad + dimensions.totalWidthMm}
            y2={pad - 6}
          />
          <text
            x={pad + dimensions.totalWidthMm / 2}
            y={pad - 12.5}
            textAnchor="middle"
            stroke="none"
          >
            {dimensions.totalWidthMm.toFixed(1)} mm ({dimensions.cols}U)
          </text>

          {/* Left depth dimension line */}
          <line
            x1={pad - 9}
            y1={pad}
            x2={pad - 9}
            y2={pad + dimensions.totalDepthMm}
          />
          <line x1={pad - 12} y1={pad} x2={pad - 6} y2={pad} />
          <line
            x1={pad - 12}
            y1={pad + dimensions.totalDepthMm}
            x2={pad - 6}
            y2={pad + dimensions.totalDepthMm}
          />
          <text
            x={pad - 13}
            y={pad + dimensions.totalDepthMm / 2}
            textAnchor="middle"
            stroke="none"
            transform={`rotate(-90 ${pad - 13} ${pad + dimensions.totalDepthMm / 2})`}
          >
            {dimensions.totalDepthMm.toFixed(1)} mm ({dimensions.rows}U)
          </text>
        </g>
      </svg>
    );
  };

  const renderCutSheetLayout = () => {
    const { sheets } = model;
    const validSheetFilter =
      sheetFilter === 'all' || sheetFilter < sheets.length ? sheetFilter : 'all';
    const visibleSheets =
      validSheetFilter === 'all' ? sheets : [sheets[validSheetFilter]];

    const gapX = 24;
    const gapY = 30;
    const cols =
      visibleSheets.length <= 1 ? 1 : visibleSheets.length <= 4 ? 2 : 3;

    const sheetW = Math.max(...visibleSheets.map((s) => s.widthMm), 100);
    const sheetH = Math.max(...visibleSheets.map((s) => s.heightMm), 100);
    const rows = Math.ceil(visibleSheets.length / cols);

    const pad = 24;
    const totalW = cols * sheetW + (cols - 1) * gapX + pad * 2;
    const totalH = rows * sheetH + (rows - 1) * gapY + pad * 2 + 12;
    const strokeScale = Math.max(
      0.65,
      Math.min(2.4, Math.max(totalW, totalH) / (cols === 1 ? 300 : 480))
    );

    return (
      <svg
        data-testid="cad-svg-viewport"
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="w-full h-full select-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {visibleSheets.map((sheet, idx) => {
          const gridCol = idx % cols;
          const gridRow = Math.floor(idx / cols);
          const sheetXLeft = pad + gridCol * (sheetW + gapX);
          const sheetYTop = pad + 10 + gridRow * (sheetH + gapY);

          return (
            <g key={sheet.sheetIndex}>
              {/* Laser Bed Frame */}
              <rect
                x={sheetXLeft}
                y={sheetYTop}
                width={sheet.widthMm}
                height={sheet.heightMm}
                fill={isDark ? '#0F172A' : '#ffffff'}
                stroke={isDark ? '#475569' : '#94A3B8'}
                strokeWidth={0.6 * strokeScale}
                strokeDasharray={`${3 * strokeScale} ${2 * strokeScale}`}
              />
              <text
                x={sheetXLeft}
                y={sheetYTop - 4 * strokeScale}
                fontSize={4.8 * strokeScale}
                fontFamily="JetBrains Mono, monospace"
                fill={isDark ? '#94A3B8' : '#475569'}
              >
                SHEET {sheet.sheetIndex + 1} · {sheet.widthMm.toFixed(0)} ×{' '}
                {sheet.heightMm.toFixed(0)} mm ({sheet.parts.length} parts)
              </text>

              {/* Render packed tile parts inside sheet */}
              {sheet.parts.map((part: GeneratedTileLayer) => {
                const partLocalHeight = sheetYTop + sheet.heightMm;
                const isHighlighted = selectedPartId === part.id;
                const isDimmed = selectedPartId !== null && !isHighlighted;
                const effectiveStrokeScale = isHighlighted
                  ? strokeScale * 1.45
                  : strokeScale;
                const baseEntities = showToolpathOverlay
                  ? part.nominalEntities
                  : part.entities;

                return (
                  <g key={part.id}>
                    {renderVectorEntities(
                      baseEntities,
                      sheetXLeft + part.sheetX,
                      part.sheetY,
                      partLocalHeight,
                      effectiveStrokeScale,
                      isDimmed
                    )}
                    {renderToolpathOverlay(
                      part,
                      sheetXLeft + part.sheetX,
                      part.sheetY,
                      partLocalHeight,
                      effectiveStrokeScale,
                      isDimmed
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    );
  };

  const renderCrossSectionFit = () => {
    const { config, summary } = model;
    const isThreeLayer = config.stackArchitecture === 'three-layer-stepped';
    const isSingleLayer = config.stackArchitecture === 'single-layer-minimal';

    const topT = isThreeLayer ? config.topLayerThicknessMm : 0;
    const midT = config.midLayerThicknessMm;
    const baseT = isSingleLayer ? 0 : config.bottomLayerThicknessMm;
    const totalStackT = topT + midT + baseT;

    // SVG coordinate scale: 1 mm = 10 px, positioned with generous right room for callouts
    const scale = 10;
    const cx = 240;
    const floorY = 260;

    const binHalfTop = (GRIDFINITY_SPEC.BIN_BODY_MM / 2) * scale; // 20.75 * 10
    const binHalfShoulder = (GRIDFINITY_SPEC.BIN_SHOULDER_MM / 2) * scale; // 18.6 * 10
    const binHalfBase = (GRIDFINITY_SPEC.BIN_BASE_MM / 2) * scale; // 17.8 * 10

    const topCutHalf = (summary.topCutoutMm / 2) * scale;
    const stepCutHalf = (summary.stepCutoutMm / 2) * scale;
    const skelHalf = (GRIDFINITY_SPEC.SKELETON_WINDOW_MM / 2) * scale;
    const magHalf = (config.magnetHoleDiameterMm / 2) * scale;
    const cellHalfOuter = (GRIDFINITY_SPEC.PITCH_MM / 2) * scale; // 21.0 * 10

    // Kerf toolpath offset in 10:1 cross-section coordinates
    const kerfHalfPx =
      Math.max(0.15, (config.kerfMm / 2) * (kerfVisualScale === 8 ? 4 : 1)) * scale;
    const beamColor = isDark ? '#FBBF24' : '#D97706';

    // Calculate bin seating Z relative to bottom of stack (baseT)
    const baseTopY = floorY - baseT * scale;
    const midTopY = baseTopY - midT * scale;
    const topTopY = midTopY - topT * scale;

    // Bin foot vertical points relative to its bottom Z=0 (bottom sits at baseTopY)
    const binBottomY = baseTopY;
    const binZ08 = binBottomY - GRIDFINITY_SPEC.FOOT_BOTTOM_CHAMFER_H_MM * scale;
    const binZ26 = binZ08 - GRIDFINITY_SPEC.FOOT_VERTICAL_H_MM * scale;
    const binZ475 = binZ26 - GRIDFINITY_SPEC.FOOT_UPPER_CHAMFER_H_MM * scale;
    const binBodyTopY = binZ475 - 35;

    const binProfilePath = [
      `M ${cx - binHalfBase} ${binBottomY}`,
      `L ${cx + binHalfBase} ${binBottomY}`,
      `L ${cx + binHalfShoulder} ${binZ08}`,
      `L ${cx + binHalfShoulder} ${binZ26}`,
      `L ${cx + binHalfTop} ${binZ475}`,
      `L ${cx + binHalfTop} ${binBodyTopY}`,
      `L ${cx - binHalfTop} ${binBodyTopY}`,
      `L ${cx - binHalfTop} ${binZ475}`,
      `L ${cx - binHalfShoulder} ${binZ26}`,
      `L ${cx - binHalfShoulder} ${binZ08}`,
      'Z',
    ].join(' ');

    return (
      <svg
        data-testid="cad-svg-viewport"
        viewBox="0 0 740 340"
        className="w-full h-full max-w-4xl mx-auto select-none"
      >
        {/* Title */}
        <text
          x={24}
          y={28}
          fontSize={12}
          fontWeight={600}
          fill={isDark ? '#F1F5F9' : '#0F172A'}
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          1U Cell Cross-Section Profile (Scale 10:1 · Standard 41.5 mm Bin Foot)
        </text>
        <text
          x={24}
          y={46}
          fontSize={10.5}
          fill={isDark ? '#94A3B8' : '#475569'}
          fontFamily="JetBrains Mono, monospace"
        >
          Total Stack: {totalStackT.toFixed(1)} mm · Shoulder Opening:{' '}
          {summary.stepCutoutMm.toFixed(2)} mm
          {isThreeLayer
            ? ` · Collar Opening: ${summary.topCutoutMm.toFixed(2)} mm`
            : ''}
        </text>

        {/* Backing Layer or Single-Layer Drawer Floor Reference */}
        {!isSingleLayer ? (
          <g>
            {config.skeletonizeBacking ? (
              <>
                <rect
                  x={cx - cellHalfOuter - 30}
                  y={baseTopY}
                  width={cellHalfOuter + 30 - skelHalf}
                  height={baseT * scale}
                  fill={isDark ? '#334155' : '#CBD5E1'}
                  stroke={isDark ? '#94A3B8' : '#475569'}
                  strokeWidth={1.2}
                />
                <rect
                  x={cx + skelHalf}
                  y={baseTopY}
                  width={cellHalfOuter + 30 - skelHalf}
                  height={baseT * scale}
                  fill={isDark ? '#334155' : '#CBD5E1'}
                  stroke={isDark ? '#94A3B8' : '#475569'}
                  strokeWidth={1.2}
                />
              </>
            ) : (
              <rect
                x={cx - cellHalfOuter - 30}
                y={baseTopY}
                width={(cellHalfOuter + 30) * 2}
                height={baseT * scale}
                fill={isDark ? '#334155' : '#CBD5E1'}
                stroke={isDark ? '#94A3B8' : '#475569'}
                strokeWidth={1.2}
              />
            )}
            {config.includeMagnets && (
              <>
                <rect
                  x={cx - 13 * scale - magHalf}
                  y={baseTopY}
                  width={config.magnetHoleDiameterMm * scale}
                  height={baseT * scale}
                  fill="#0D9488"
                  fillOpacity={isDark ? 0.5 : 0.35}
                  stroke={isDark ? '#2DD4BF' : '#0D9488'}
                  strokeWidth={1}
                />
                <rect
                  x={cx + 13 * scale - magHalf}
                  y={baseTopY}
                  width={config.magnetHoleDiameterMm * scale}
                  height={baseT * scale}
                  fill="#0D9488"
                  fillOpacity={isDark ? 0.5 : 0.35}
                  stroke={isDark ? '#2DD4BF' : '#0D9488'}
                  strokeWidth={1}
                />
              </>
            )}
            <text
              x={cx + cellHalfOuter + 40}
              y={baseTopY + (baseT * scale) / 2}
              fontSize={10}
              dominantBaseline="central"
              fill={isDark ? '#CBD5E1' : '#334155'}
              fontFamily="JetBrains Mono, monospace"
            >
              Base ({baseT.toFixed(1)} mm){config.includeMagnets ? ' + Magnets' : ''}
              {config.skeletonizeBacking ? ' · Skeleton' : ''}
            </text>
          </g>
        ) : (
          <g>
            <line
              x1={cx - cellHalfOuter - 30}
              y1={floorY}
              x2={cx + cellHalfOuter + 30}
              y2={floorY}
              stroke={isDark ? '#94A3B8' : '#64748B'}
              strokeWidth={1.5}
              strokeDasharray="6 3"
            />
            <text
              x={cx + cellHalfOuter + 40}
              y={floorY}
              fontSize={10}
              dominantBaseline="central"
              fill={isDark ? '#94A3B8' : '#475569'}
              fontFamily="JetBrains Mono, monospace"
            >
              Drawer Floor Surface
            </text>
          </g>
        )}

        {/* Mid Step / Standard Grid Layer (Left & Right walls around stepCutHalf) */}
        <g>
          <rect
            x={cx - cellHalfOuter - 30}
            y={midTopY}
            width={cellHalfOuter + 30 - stepCutHalf}
            height={midT * scale}
            fill={isDark ? '#1E3A8A' : '#DBEAFE'}
            stroke={isDark ? '#60A5FA' : '#2563EB'}
            strokeWidth={1.2}
          />
          <rect
            x={cx + stepCutHalf}
            y={midTopY}
            width={cellHalfOuter + 30 - stepCutHalf}
            height={midT * scale}
            fill={isDark ? '#1E3A8A' : '#DBEAFE'}
            stroke={isDark ? '#60A5FA' : '#2563EB'}
            strokeWidth={1.2}
          />
          <text
            x={cx + cellHalfOuter + 40}
            y={midTopY + (midT * scale) / 2}
            fontSize={10}
            dominantBaseline="central"
            fill={isDark ? '#93C5FD' : '#1E40AF'}
            fontFamily="JetBrains Mono, monospace"
          >
            {isThreeLayer ? 'Step Shelf' : 'Grid Frame'} ({midT.toFixed(1)} mm)
          </text>
        </g>

        {/* Top Collar Layer (3-layer mode only) */}
        {isThreeLayer && (
          <g>
            <rect
              x={cx - cellHalfOuter - 30}
              y={topTopY}
              width={cellHalfOuter + 30 - topCutHalf}
              height={topT * scale}
              fill={isDark ? '#7F1D1D' : '#FEE2E2'}
              stroke={isDark ? '#F87171' : '#DC2626'}
              strokeWidth={1.2}
            />
            <rect
              x={cx + topCutHalf}
              y={topTopY}
              width={cellHalfOuter + 30 - topCutHalf}
              height={topT * scale}
              fill={isDark ? '#7F1D1D' : '#FEE2E2'}
              stroke={isDark ? '#F87171' : '#DC2626'}
              strokeWidth={1.2}
            />
            <text
              x={cx + cellHalfOuter + 40}
              y={topTopY + (topT * scale) / 2}
              fontSize={10}
              dominantBaseline="central"
              fill={isDark ? '#FCA5A5' : '#991B1B'}
              fontFamily="JetBrains Mono, monospace"
            >
              Collar ({topT.toFixed(1)} mm)
            </text>
          </g>
        )}

        {/* Kerf Toolpath Cross-Section Overlay */}
        {showToolpathOverlay && (
          <g data-testid="toolpath-overlay">
            {/* Step cutout laser beam paths (shifted inward into cutout void by kerfHalfPx) */}
            <line
              x1={cx - stepCutHalf + kerfHalfPx}
              y1={midTopY - 6}
              x2={cx - stepCutHalf + kerfHalfPx}
              y2={baseTopY + 6}
              stroke={beamColor}
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
            <line
              x1={cx + stepCutHalf - kerfHalfPx}
              y1={midTopY - 6}
              x2={cx + stepCutHalf - kerfHalfPx}
              y2={baseTopY + 6}
              stroke={beamColor}
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
            {isThreeLayer && (
              <>
                <line
                  x1={cx - topCutHalf + kerfHalfPx}
                  y1={topTopY - 6}
                  x2={cx - topCutHalf + kerfHalfPx}
                  y2={midTopY + 4}
                  stroke={beamColor}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
                <line
                  x1={cx + topCutHalf - kerfHalfPx}
                  y1={topTopY - 6}
                  x2={cx + topCutHalf - kerfHalfPx}
                  y2={midTopY + 4}
                  stroke={beamColor}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
              </>
            )}
          </g>
        )}

        {/* Gridfinity Bin Foot Profile */}
        <path
          d={binProfilePath}
          fill={isDark ? '#94A3B8' : '#64748B'}
          fillOpacity={isDark ? 0.22 : 0.18}
          stroke={isDark ? '#E2E8F0' : '#0F172A'}
          strokeWidth={1.6}
          strokeDasharray="4 2"
        />
        <text
          x={cx}
          y={binBodyTopY + 18}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight={600}
          fill={isDark ? '#F1F5F9' : '#0F172A'}
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          Standard Gridfinity Bin Foot (41.5 mm)
        </text>

        {/* Pitch & Cutout Dimension Callouts */}
        <g
          stroke={isDark ? '#94A3B8' : '#475569'}
          strokeWidth={1}
          fontSize={10}
          fill={isDark ? '#CBD5E1' : '#334155'}
          fontFamily="JetBrains Mono, monospace"
        >
          <line
            x1={cx - cellHalfOuter}
            y1={floorY + 24}
            x2={cx + cellHalfOuter}
            y2={floorY + 24}
          />
          <line
            x1={cx - cellHalfOuter}
            y1={floorY + 18}
            x2={cx - cellHalfOuter}
            y2={floorY + 30}
          />
          <line
            x1={cx + cellHalfOuter}
            y1={floorY + 18}
            x2={cx + cellHalfOuter}
            y2={floorY + 30}
          />
          <text x={cx} y={floorY + 42} textAnchor="middle" stroke="none">
            42.00 mm Grid Pitch
          </text>
        </g>
      </svg>
    );
  };

  return (
    <main className="flex-1 min-w-0 flex flex-col bg-slate-50 dark:bg-slate-950 lg:h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Workspace Toolbar */}
      <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-10">
        {/* View Mode Switch */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
          <button
            type="button"
            onClick={() => onChangeViewportMode('stacked')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              viewportMode === 'stacked'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Stacked Blueprint
          </button>
          <button
            type="button"
            onClick={() => onChangeViewportMode('sheet')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              viewportMode === 'sheet'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Cut Sheet Layout
          </button>
          <button
            type="button"
            onClick={() => onChangeViewportMode('cross-section')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              viewportMode === 'cross-section'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Cross-Section Fit
          </button>
        </div>

        {/* Layer Role Filter, Vector Layer Visibility & Toolpath Overlay Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewportMode === 'stacked' && (
            <select
              aria-label="Filter stack layer"
              value={effectiveRoleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as 'all' | LayerRole)
              }
              className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Stack Layers Overlaid</option>
              {archSpec.layers.map((l) => (
                <option key={l.role} value={l.role}>
                  {l.label} Only
                </option>
              ))}
            </select>
          )}

          {viewportMode === 'sheet' && model.sheets.length > 1 && (
            <select
              aria-label="Filter cut sheet"
              value={
                sheetFilter === 'all' || sheetFilter >= model.sheets.length
                  ? 'all'
                  : String(sheetFilter)
              }
              onChange={(e) =>
                setSheetFilter(
                  e.target.value === 'all' ? 'all' : Number(e.target.value)
                )
              }
              className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Sheets ({model.sheets.length})</option>
              {model.sheets.map((s) => (
                <option key={s.sheetIndex} value={String(s.sheetIndex)}>
                  Sheet {s.sheetIndex + 1} Only
                </option>
              ))}
            </select>
          )}

          {viewportMode !== 'cross-section' && (
            <div className="flex items-center gap-1 flex-wrap">
              {ALL_VECTOR_LAYERS.map((layerId) => {
                const meta = LAYER_STYLE_META[layerId];
                const active = visibleLayers[layerId];
                return (
                  <button
                    key={layerId}
                    type="button"
                    onClick={() => toggleLayer(layerId)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-xs inline-block"
                      style={{
                        backgroundColor: active
                          ? getLayerStroke(layerId)
                          : isDark
                          ? '#334155'
                          : '#CBD5E1',
                      }}
                    />
                    <span>{meta.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Kerf Toolpath Preview Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowToolpathOverlay((prev) => !prev)}
            aria-pressed={showToolpathOverlay}
            title="Toggle kerf-compensated laser toolpath overlay on top of base geometry"
            className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded border transition-colors whitespace-nowrap cursor-pointer ${
              showToolpathOverlay
                ? 'border-amber-400/80 dark:border-amber-500/70 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Crosshair className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Toolpath Overlay</span>
          </button>
        </div>

        {/* Zoom Controls + Theme Toggle */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {viewportMode !== 'cross-section' && (
            <>
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(2))))
                }
                aria-label="Zoom out"
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetView}
                className="px-2 py-1 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                title="Reset zoom and pan"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.min(4, Number((z + 0.2).toFixed(2))))
                }
                aria-label="Zoom in"
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetView}
                aria-label="Fit canvas"
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <span
                className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"
                aria-hidden="true"
              />
            </>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Validation Banner (only when issues exist) */}
      {model.issues.length > 0 && (
        <div
          role="alert"
          className="px-4 py-2 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/80 flex flex-col gap-1 shrink-0"
        >
          {model.issues.map((issue, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 text-xs font-medium ${
                issue.severity === 'error'
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-amber-800 dark:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Full-Width CAD Drafting Canvas with Floating Overlay Controls */}
      <div
        className="flex-1 min-h-[420px] cad-grid-bg overflow-hidden relative flex items-center justify-center cursor-grab active:cursor-grabbing"
        onWheel={(e) => {
          if (viewportMode === 'cross-section') return;
          const delta = e.deltaY < 0 ? 0.1 : -0.1;
          setZoom((z) =>
            Math.max(0.4, Math.min(4, Number((z + delta).toFixed(2))))
          );
        }}
        onPointerDown={(e) => {
          if (viewportMode === 'cross-section') return;
          // Do not start canvas pan if clicking inside floating overlay UI
          if ((e.target as HTMLElement).closest('[data-floating-ui="true"]')) {
            return;
          }
          dragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            origX: pan.x,
            origY: pan.y,
          };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current.active) return;
          setPan({
            x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
            y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
          });
        }}
        onPointerUp={() => {
          dragRef.current.active = false;
        }}
        onPointerLeave={() => {
          dragRef.current.active = false;
        }}
      >
        {/* SVG Canvas Wrapper — shifts right padding on lg+ when floating manifest is open so the blueprint stays centered in the visible grid */}
        <div
          className={`w-full h-full flex items-center justify-center p-4 lg:p-6 transition-[padding] duration-200 ${
            !manifestCollapsed ? 'lg:pr-[348px]' : ''
          }`}
        >
          {viewportMode === 'stacked' && renderStackedBlueprint()}
          {viewportMode === 'sheet' && renderCutSheetLayout()}
          {viewportMode === 'cross-section' && renderCrossSectionFit()}
        </div>

        {/* Bottom-Left Toolpath Overlay HUD Legend */}
        {showToolpathOverlay && (
          <div
            data-floating-ui="true"
            className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 shadow-md text-[11px] text-slate-700 dark:text-slate-300 cursor-default"
          >
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                className="w-4 h-0.5 border-t-2 border-dashed border-amber-500 dark:border-amber-400 inline-block"
                aria-hidden="true"
              />
              <span>
                Laser Toolpath:{' '}
                <strong className="font-mono text-slate-900 dark:text-slate-100">
                  ±{(model.config.kerfMm / 2).toFixed(3)} mm
                </strong>{' '}
                offset ({model.config.kerfMm.toFixed(2)} mm kerf)
              </span>
            </span>
            <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">
              ·
            </span>
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
              Outer: +outward · Pockets/Holes: −inward
            </span>
            <button
              type="button"
              onClick={() =>
                setKerfVisualScale((prev) => (prev === 8 ? 1 : 8))
              }
              title="Toggle between 8× visual offset magnification and 1× true millimeter scale"
              className="px-1.5 py-0.5 font-mono text-[10px] font-semibold rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
            >
              {kerfVisualScale === 8 ? '8× Visual Offset' : '1× True Scale'}
            </button>
          </div>
        )}

        {/* Top-Right Floating Collapsible Cut Manifest & Export Panel */}
        {floatingPanel && (
          <div
            data-floating-ui="true"
            className="absolute top-3 right-3 z-20 pointer-events-none flex justify-end max-w-[calc(100%-1.5rem)]"
          >
            {floatingPanel}
          </div>
        )}
      </div>
    </main>
  );
}
