'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface HarmonyDiagramProps {
  flavors: string[];
  connections: { from: string; to: string; score: number }[];
  onFlavorClick?: (flavor: string) => void;
}

const COLORS = [
  '#8b7355', // warm brown
  '#6b8e9f', // muted blue
  '#9b7b6b', // terracotta
  '#7a8b6e', // sage
  '#a08090', // dusty mauve
];

export default function HarmonyDiagram({
  flavors,
  connections,
  onFlavorClick,
}: HarmonyDiagramProps) {
  const size = 400;
  const center = size / 2;
  const radius = 150;

  const positions = useMemo(() => {
    return flavors.map((flavor, index) => {
      const angle = (index * 2 * Math.PI) / flavors.length - Math.PI / 2;
      return {
        name: flavor,
        x: center + Math.cos(angle) * radius,
        y: center + Math.sin(angle) * radius,
        color: COLORS[index % COLORS.length],
      };
    });
  }, [flavors]);

  const getPosition = (name: string) => {
    return positions.find(p => p.name === name);
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Connection curves */}
        {connections.map((conn, index) => {
          const from = getPosition(conn.from);
          const to = getPosition(conn.to);
          if (!from || !to) return null;

          const isPositive = conn.score > 0;
          const strength = Math.abs(conn.score);
          
          // Bezier curve through center with offset
          const midX = center;
          const midY = center;
          const controlOffset = 50 * (1 - strength);
          
          const path = `M ${from.x} ${from.y} Q ${midX} ${midY + controlOffset} ${to.x} ${to.y}`;

          return (
            <motion.path
              key={`${conn.from}-${conn.to}`}
              d={path}
              fill="none"
              stroke={isPositive ? '#7a8b6e' : '#c27b7b'}
              strokeWidth={1 + strength * 3}
              strokeOpacity={0.4 + strength * 0.4}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            />
          );
        })}

        {/* Flavor nodes */}
        {positions.map((pos, index) => (
          <motion.g
            key={pos.name}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            style={{ cursor: onFlavorClick ? 'pointer' : 'default' }}
            onClick={() => onFlavorClick?.(pos.name)}
          >
            {/* Node circle */}
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={35}
              fill="#faf8f5"
              stroke={pos.color}
              strokeWidth={2}
              whileHover={{ scale: 1.1 }}
            />
            
            {/* Node label */}
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm font-serif fill-[#3d3d3d] capitalize pointer-events-none"
            >
              {pos.name.length > 10 ? pos.name.slice(0, 10) + '…' : pos.name}
            </text>
          </motion.g>
        ))}

        {/* Center decoration */}
        <motion.circle
          cx={center}
          cy={center}
          r={8}
          fill="none"
          stroke="#c4b49a"
          strokeWidth={1}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
        />
      </svg>

      {/* Legend */}
      <div className="flex gap-8 mt-6 text-sm font-serif text-[#6b6b6b]">
        <div className="flex items-center gap-2">
          <span className="w-8 h-0.5 bg-[#7a8b6e]" />
          <span>Harmonious</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 h-0.5 bg-[#c27b7b]" />
          <span>Contrasting</span>
        </div>
      </div>
    </div>
  );
}
