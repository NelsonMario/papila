'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlavorPairing {
  source_flavor: string;
  source_category: string;
  target_flavor: string;
  target_category: string;
  co_occurrence: number;
  harmony_score: number;
}

interface PairingWheelProps {
  pairings: FlavorPairing[];
  highlightFlavors?: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Fruity': '#a8a878',
  'Floral': '#c8b8a8',
  'Spicy': '#8b6b5b',
  'Woody': '#6b5b4b',
  'Roasted': '#5b4b3b',
  'Savory': '#7b6b5b',
  'Sweet': '#b8a898',
  'Acidic': '#9b8b7b',
  'Green': '#8b9b7b',
  'Herbal': '#7b8b6b',
  'Dairy': '#d8c8b8',
  'Chemical': '#7b7b7b',
  'Other': '#9b9b9b',
};

export default function PairingWheel({ pairings, highlightFlavors = [] }: PairingWheelProps) {
  const [hoveredFlavor, setHoveredFlavor] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; pairings: FlavorPairing[] } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const highlightSet = useMemo(() => 
    new Set(highlightFlavors.map(f => f.toLowerCase())), 
    [highlightFlavors]
  );

  const { nodes, links, categories } = useMemo(() => {
    const nodeMap = new Map<string, { name: string; category: string; count: number }>();
    const categorySet = new Set<string>();

    pairings.forEach(p => {
      categorySet.add(p.source_category);
      categorySet.add(p.target_category);
      
      if (!nodeMap.has(p.source_flavor)) {
        nodeMap.set(p.source_flavor, { name: p.source_flavor, category: p.source_category, count: 0 });
      }
      if (!nodeMap.has(p.target_flavor)) {
        nodeMap.set(p.target_flavor, { name: p.target_flavor, category: p.target_category, count: 0 });
      }
      nodeMap.get(p.source_flavor)!.count += p.co_occurrence;
      nodeMap.get(p.target_flavor)!.count += p.co_occurrence;
    });

    const sortedNodes = Array.from(nodeMap.values())
      .sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return b.count - a.count;
      });

    return {
      nodes: sortedNodes,
      links: pairings,
      categories: Array.from(categorySet).sort(),
    };
  }, [pairings]);

  const size = isMobile ? 320 : 520;
  const center = size / 2;
  const outerRadius = size / 2 - (isMobile ? 50 : 70);
  const innerRadius = outerRadius - (isMobile ? 18 : 25);
  const pad = isMobile ? 40 : 60;

  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number; angle: number }>();
    const angleStep = (2 * Math.PI) / nodes.length;
    
    nodes.forEach((node, i) => {
      const angle = i * angleStep - Math.PI / 2;
      positions.set(node.name, {
        x: center + Math.cos(angle) * innerRadius,
        y: center + Math.sin(angle) * innerRadius,
        angle,
      });
    });
    
    return positions;
  }, [nodes, center, innerRadius]);

  const maxCoOccurrence = Math.max(...pairings.map(p => p.co_occurrence));

  const isHighlighted = (flavor: string) => {
    if (highlightSet.size === 0) return false;
    return highlightSet.has(flavor.toLowerCase());
  };

  const isPairingHighlighted = (source: string, target: string) => {
    if (highlightSet.size === 0) return false;
    return highlightSet.has(source.toLowerCase()) && highlightSet.has(target.toLowerCase());
  };

  const getFlavorPairings = (flavor: string) => {
    return pairings.filter(p => 
      p.source_flavor.toLowerCase() === flavor.toLowerCase() || 
      p.target_flavor.toLowerCase() === flavor.toLowerCase()
    ).filter(p => {
      if (highlightSet.size === 0) return true;
      const other = p.source_flavor.toLowerCase() === flavor.toLowerCase() 
        ? p.target_flavor.toLowerCase() 
        : p.source_flavor.toLowerCase();
      return highlightSet.has(other);
    }).slice(0, 5);
  };

  const handleNodeHover = (node: { name: string }, event: React.MouseEvent) => {
    if (!isHighlighted(node.name)) return;
    
    const relevantPairings = getFlavorPairings(node.name);
    if (relevantPairings.length > 0) {
      setHoveredFlavor(node.name);
      setTooltipData({
        x: event.clientX,
        y: event.clientY,
        pairings: relevantPairings,
      });
    }
  };

  const handleNodeLeave = () => {
    setHoveredFlavor(null);
    setTooltipData(null);
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg
        viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: size + pad * 2 }}
        className="overflow-visible"
      >
        <defs>
          <filter id="glow-active">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* All Links - show all but dim non-highlighted */}
        <g>
          {links.map((link, i) => {
            const source = nodePositions.get(link.source_flavor);
            const target = nodePositions.get(link.target_flavor);
            if (!source || !target) return null;

            const isActive = isPairingHighlighted(link.source_flavor, link.target_flavor);
            const isHovered = hoveredFlavor && 
              (link.source_flavor.toLowerCase() === hoveredFlavor.toLowerCase() || 
               link.target_flavor.toLowerCase() === hoveredFlavor.toLowerCase());
            
            const opacity = highlightSet.size === 0 
              ? 0.08 + (link.harmony_score * 0.12)
              : isActive 
                ? (isHovered ? 0.9 : 0.5) 
                : 0.03;

            const strokeWidth = isActive 
              ? (isHovered ? 3 : 2)
              : 0.5;

            const midX = center;
            const midY = center;

            return (
              <motion.path
                key={`${link.source_flavor}-${link.target_flavor}-${i}`}
                d={`M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`}
                fill="none"
                stroke={isActive ? CATEGORY_COLORS[link.source_category] || '#555' : '#ccc'}
                strokeWidth={strokeWidth}
                initial={{ opacity: 0 }}
                animate={{ opacity }}
                transition={{ duration: 0.3 }}
                style={{ pointerEvents: 'none' }}
              />
            );
          })}
        </g>

        {/* Category arcs */}
        {categories.map((category, catIndex) => {
          const categoryNodes = nodes.filter(n => n.category === category);
          if (categoryNodes.length === 0) return null;
          
          const firstNode = nodePositions.get(categoryNodes[0].name);
          const lastNode = nodePositions.get(categoryNodes[categoryNodes.length - 1].name);
          if (!firstNode || !lastNode) return null;

          const startAngle = firstNode.angle;
          const endAngle = lastNode.angle + (2 * Math.PI / nodes.length);
          
          const arcPath = `
            M ${center + Math.cos(startAngle) * outerRadius} ${center + Math.sin(startAngle) * outerRadius}
            A ${outerRadius} ${outerRadius} 0 0 1 ${center + Math.cos(endAngle) * outerRadius} ${center + Math.sin(endAngle) * outerRadius}
          `;

          return (
            <motion.path
              key={category}
              d={arcPath}
              fill="none"
              stroke={CATEGORY_COLORS[category] || '#888'}
              strokeWidth={6}
              opacity={0.25}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: catIndex * 0.05 }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const pos = nodePositions.get(node.name);
          if (!pos) return null;
          
          const highlighted = isHighlighted(node.name);
          const isHovered = hoveredFlavor === node.name;
          const nodeSize = isMobile 
            ? (highlighted ? (isHovered ? 4 : 3) : 2)
            : (highlighted ? (isHovered ? 6 : 4) : 2.5);
          
          const labelRadius = outerRadius + (isMobile ? 8 : 12);
          const labelX = center + Math.cos(pos.angle) * labelRadius;
          const labelY = center + Math.sin(pos.angle) * labelRadius;
          const rotation = (pos.angle * 180) / Math.PI;
          const flipText = rotation > 90 || rotation < -90;

          return (
            <g 
              key={node.name}
              onMouseEnter={(e) => handleNodeHover(node, e)}
              onMouseLeave={handleNodeLeave}
              style={{ cursor: highlighted ? 'pointer' : 'default' }}
            >
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                r={nodeSize}
                fill={highlighted ? CATEGORY_COLORS[node.category] || '#555' : '#ddd'}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: 1,
                  r: nodeSize,
                }}
                transition={{ duration: 0.3, delay: i * 0.005 }}
                filter={isHovered ? "url(#glow-active)" : undefined}
              />
              <motion.text
                x={labelX}
                y={labelY}
                textAnchor={flipText ? "end" : "start"}
                dominantBaseline="middle"
                transform={`rotate(${flipText ? rotation + 180 : rotation}, ${labelX}, ${labelY})`}
                className={`${isMobile ? 'text-[5px]' : 'text-[7px]'} capitalize select-none ${
                  highlighted 
                    ? 'fill-neutral-800 font-medium' 
                    : 'fill-neutral-300'
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: highlighted ? 1 : 0.5 }}
                transition={{ duration: 0.3 }}
              >
                {node.name}
              </motion.text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {categories.slice(0, 8).map(category => (
          <div key={category} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[category] || '#888' }}
            />
            <span className="text-[10px] text-neutral-500">{category}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipData && hoveredFlavor && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-neutral-200 p-3 max-w-xs"
            style={{
              left: tooltipData.x + 15,
              top: tooltipData.y - 10,
              transform: 'translateY(-50%)',
            }}
          >
            <p className="text-xs font-semibold capitalize mb-2 text-neutral-800">
              {hoveredFlavor}
            </p>
            <div className="space-y-1.5">
              {tooltipData.pairings.map((p, idx) => {
                const otherFlavor = p.source_flavor.toLowerCase() === hoveredFlavor.toLowerCase()
                  ? p.target_flavor
                  : p.source_flavor;
                const strength = p.harmony_score >= 0.7 ? 'often' : p.harmony_score >= 0.4 ? 'commonly' : 'sometimes';
                
                return (
                  <p key={idx} className="text-[11px] text-neutral-600">
                    <span className="capitalize font-medium">{hoveredFlavor}</span>
                    {' '}{strength} pairs with{' '}
                    <span className="capitalize font-medium">{otherFlavor}</span>
                  </p>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      {highlightSet.size === 0 && (
        <p className="mt-4 text-xs text-neutral-400 text-center">
          Select an ingredient to highlight its flavor pairings
        </p>
      )}
    </div>
  );
}
