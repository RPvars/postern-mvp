'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRef, useState, useCallback } from 'react';

interface CompanyRole {
  type: 'owner' | 'board' | 'beneficial';
  label: string;
  since?: string | null;
  until?: string | null;
}

interface CompanyNode {
  registrationNumber: string;
  name: string;
  roles: CompanyRole[];
}

interface RelationshipGraphProps {
  personName: string;
  personalCode: string;
  companies: CompanyNode[];
}

const ROLE_COLORS: Record<string, string> = {
  owner: '#FEC200',
  board: '#60a5fa',
  beneficial: '#a78bfa',
};

function cleanCompanyName(name: string): string {
  return name
    .replace(/^(Sabiedrība ar ierobežotu atbildību|Akciju sabiedrība)\s*/i, '')
    .replace(/^[""\u201C\u201D]|[""\u201C\u201D]$/g, '');
}

function wrapText(text: string, maxWidth: number): string[] {
  const cleaned = cleanCompanyName(text);
  if (cleaned.length <= maxWidth) return [cleaned];
  const words = cleaned.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && (current + ' ' + word).length > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2).map((l, i, arr) =>
    i === arr.length - 1 && lines.length > 2 ? l.substring(0, maxWidth - 1) + '…' : l
  );
}

export function RelationshipGraph({ personName, personalCode, companies }: RelationshipGraphProps) {
  const router = useRouter();
  const t = useTranslations('person');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (companies.length === 0) return null;

  const n = companies.length;
  const centerR = 28;
  const nodeW = 130;
  const nodeH = 50;
  const orbitRadius = n <= 2 ? 100 : n <= 4 ? 120 : 140;

  const startAngle = -Math.PI / 2;
  const nodes = companies.map((company, i) => {
    const angle = startAngle + (2 * Math.PI * i) / n;
    return {
      ...company,
      x: orbitRadius * Math.cos(angle),
      y: orbitRadius * Math.sin(angle),
    };
  });

  const allX = [0, ...nodes.map(nd => nd.x)];
  const allY = [0, ...nodes.map(nd => nd.y)];
  const pad = 40;
  const contentMinX = Math.min(...allX) - nodeW / 2 - pad;
  const contentMinY = Math.min(...allY) - nodeH / 2 - pad;
  const contentMaxX = Math.max(...allX) + nodeW / 2 + pad;
  const contentMaxY = Math.max(...allY) + nodeH / 2 + pad;
  const contentW = contentMaxX - contentMinX;
  const contentH = contentMaxY - contentMinY;

  const hoveredCompany = hoveredNode ? companies.find(c => c.registrationNumber === hoveredNode) : null;

  const handleNodeHover = (regNr: string, e: React.MouseEvent) => {
    const container = (e.currentTarget as SVGElement).closest('.relationship-graph-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setHoveredNode(regNr);
  };

  return (
    <div className="relationship-graph-container relative w-full flex justify-center">
      <PanZoomSvg
        contentMinX={contentMinX}
        contentMinY={contentMinY}
        contentW={contentW}
        contentH={contentH}
        onBackgroundClick={() => setHoveredNode(null)}
      >
        {/* Edges — simple lines */}
        {nodes.map((node) => {
          const primaryColor = ROLE_COLORS[node.roles[0].type];
          const isHovered = hoveredNode === node.registrationNumber;
          return (
            <line
              key={`edge-${node.registrationNumber}`}
              x1={0}
              y1={0}
              x2={node.x}
              y2={node.y}
              stroke={isHovered ? primaryColor : 'var(--border)'}
              strokeWidth={isHovered ? 2 : 1}
              opacity={hoveredNode && !isHovered ? 0.2 : 0.6}
              className="transition-all duration-150"
            />
          );
        })}

        {/* Center person node */}
        <g
          className="cursor-default"
          onMouseEnter={(e) => { handleNodeHover('__person__', e); }}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <circle cx={0} cy={0} r={centerR} fill="#FEC200" />
          <g transform="translate(-10, -10) scale(0.85)">
            <path
              d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
              fill="none"
              stroke="#000"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={12} cy={7} r={4} fill="none" stroke="#000" strokeWidth={2} />
          </g>
        </g>

        {/* Company nodes */}
        {nodes.map((node) => {
          const lines = wrapText(node.name, 14);
          const isHovered = hoveredNode === node.registrationNumber;
          const primaryColor = ROLE_COLORS[node.roles[0].type];
          return (
            <g
              key={`node-${node.registrationNumber}`}
              className="cursor-pointer"
              onClick={() => router.push(`/company/${node.registrationNumber}`)}
              onMouseEnter={(e) => handleNodeHover(node.registrationNumber, e)}
              onMouseLeave={() => setHoveredNode(null)}
              opacity={hoveredNode && !isHovered ? 0.3 : 1}
            >
              <rect
                x={node.x - nodeW / 2}
                y={node.y - nodeH / 2}
                width={nodeW}
                height={nodeH}
                rx={8}
                className="fill-card"
                stroke={isHovered ? primaryColor : 'var(--border)'}
                strokeWidth={isHovered ? 2 : 1}
              />
              {/* Role color dots */}
              {node.roles.map((role, ri) => (
                <circle
                  key={ri}
                  cx={node.x - nodeW / 2 + 12 + ri * 10}
                  cy={node.y - nodeH / 2 + 8}
                  r={3}
                  fill={ROLE_COLORS[role.type]}
                />
              ))}
              {lines.map((line, i) => (
                <text
                  key={i}
                  x={node.x}
                  y={node.y - (lines.length - 1) * 6 + i * 13 + 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground"
                  fontSize={11}
                  fontWeight={500}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}

      </PanZoomSvg>

      {/* Legend — fixed outside SVG */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-5 text-xs text-muted-foreground">
        {Object.entries(ROLE_COLORS).map(([key, color]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {t(`legend.${key}`)}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {(hoveredCompany || hoveredNode === '__person__') && (
        <div
          className="absolute z-50 pointer-events-none bg-card border rounded-lg shadow-lg px-3 py-2 text-xs min-w-[180px]"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 10,
            transform: tooltipPos.x > 400 ? 'translateX(-110%)' : undefined,
          }}
        >
          {hoveredNode === '__person__' ? (
            <>
              <div className="font-medium text-foreground text-sm">{personName}</div>
              <div className="text-muted-foreground">{personalCode}</div>
            </>
          ) : hoveredCompany ? (
            <>
              <div className="font-medium text-foreground text-sm mb-1">
                {cleanCompanyName(hoveredCompany.name)}
              </div>
              <div className="text-muted-foreground mb-2">{hoveredCompany.registrationNumber}</div>
              {hoveredCompany.roles.map((role, i) => (
                <div key={i} className="py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ROLE_COLORS[role.type] }} />
                    <span className="text-muted-foreground">{t(`legend.${role.type}`)}:</span>
                    <span className="text-foreground font-medium">{role.label}</span>
                  </div>
                  {(role.since || role.until) && (
                    <div className="ml-3.5 text-muted-foreground/70">
                      {role.since && !role.until && `${t('since')} ${new Date(role.since).toLocaleDateString('lv-LV')}`}
                      {role.since && role.until && `${new Date(role.since).toLocaleDateString('lv-LV')} – ${new Date(role.until).toLocaleDateString('lv-LV')}`}
                      {!role.since && role.until && `${t('since')} ? – ${new Date(role.until).toLocaleDateString('lv-LV')}`}
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Pan & zoom SVG wrapper
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

interface PanZoomSvgProps {
  contentMinX: number;
  contentMinY: number;
  contentW: number;
  contentH: number;
  children: React.ReactNode;
  onBackgroundClick?: () => void;
}

const PanZoomSvg = ({ contentMinX, contentMinY, contentW, contentH, children, onBackgroundClick }: PanZoomSvgProps & { ref?: React.Ref<SVGSVGElement> }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: contentMinX, y: contentMinY, w: contentW, h: contentH });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vbX: 0, vbY: 0 });

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: viewBox.x + (clientX - rect.left) / rect.width * viewBox.w,
      y: viewBox.y + (clientY - rect.top) / rect.height * viewBox.h,
    };
  }, [viewBox]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only zoom on pinch gesture (ctrlKey), let normal scroll pass through
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY * 0.01;
    const factor = 1 + Math.min(Math.max(delta, -0.3), 0.3);
    const pt = svgPoint(e.clientX, e.clientY);

    setViewBox(prev => {
      const newW = Math.min(Math.max(prev.w * factor, contentW / MAX_ZOOM), contentW / MIN_ZOOM);
      const newH = Math.min(Math.max(prev.h * factor, contentH / MAX_ZOOM), contentH / MIN_ZOOM);
      const ratio = newW / prev.w;
      return { x: pt.x - (pt.x - prev.x) * ratio, y: pt.y - (pt.y - prev.y) * ratio, w: newW, h: newH };
    });
  }, [svgPoint, contentW, contentH]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.cursor-pointer')) return;
    onBackgroundClick?.();
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, vbX: viewBox.x, vbY: viewBox.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [viewBox, onBackgroundClick]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = (e.clientX - panStart.current.x) / rect.width * viewBox.w;
    const dy = (e.clientY - panStart.current.y) / rect.height * viewBox.h;
    setViewBox(prev => ({ ...prev, x: panStart.current.vbX - dx, y: panStart.current.vbY - dy }));
  }, [isPanning, viewBox.w, viewBox.h]);

  const handlePointerUp = useCallback(() => setIsPanning(false), []);

  const handleDoubleClick = useCallback(() => {
    setViewBox({ x: contentMinX, y: contentMinY, w: contentW, h: contentH });
  }, [contentMinX, contentMinY, contentW, contentH]);

  return (
    <svg
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      className="mx-auto select-none"
      style={{ width: '100%', height: 500, cursor: isPanning ? 'grabbing' : 'grab' }}
      preserveAspectRatio="xMidYMid meet"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {children}
    </svg>
  );
};
