'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FlavorProfile } from '@/lib/api';

interface CorrelationDiagramProps {
  ingredientA: string;
  ingredientB: string;
  profilesA: FlavorProfile[];
  profilesB: FlavorProfile[];
  sharedNotes: string[];
}

const COLORS = ['#2a2a2a', '#808080'];

export default function CorrelationDiagram({
  ingredientA,
  ingredientB,
  profilesA,
  profilesB,
  sharedNotes,
}: CorrelationDiagramProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const width = isMobile ? 320 : 650;
  const height = isMobile ? 350 : 420;
  const leftX = isMobile ? 50 : 90;
  const rightX = width - (isMobile ? 50 : 90);
  const startY = isMobile ? 40 : 50;
  const nodeSpacing = isMobile ? 26 : 30;
  const maxItems = isMobile ? 10 : 12;

  const topA = useMemo(() => {
    return profilesA.slice(0, maxItems).map(p => ({
      name: p.flavor_note,
      count: p.molecule_count,
      isShared: sharedNotes.includes(p.flavor_note)
    }));
  }, [profilesA, sharedNotes, maxItems]);

  const topB = useMemo(() => {
    return profilesB.slice(0, maxItems).map(p => ({
      name: p.flavor_note,
      count: p.molecule_count,
      isShared: sharedNotes.includes(p.flavor_note)
    }));
  }, [profilesB, sharedNotes, maxItems]);

  const connections = useMemo(() => {
    const conns: { fromIndex: number; toIndex: number; flavorName: string }[] = [];
    topA.forEach((flavorA, indexA) => {
      topB.forEach((flavorB, indexB) => {
        if (flavorA.name === flavorB.name) {
          conns.push({ fromIndex: indexA, toIndex: indexB, flavorName: flavorA.name });
        }
      });
    });
    return conns;
  }, [topA, topB]);

  const maxCountA = Math.max(...topA.map(f => f.count), 1);
  const maxCountB = Math.max(...topB.map(f => f.count), 1);

  const getNodeRadius = (count: number, maxCount: number) => {
    const minRadius = isMobile ? 5 : 8;
    const maxRadius = isMobile ? 12 : 18;
    return minRadius + (count / maxCount) * (maxRadius - minRadius);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 mb-4 sm:mb-8 px-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" style={{ backgroundColor: COLORS[0] }} />
          <h3 className="text-lg sm:text-2xl font-bold capitalize">{ingredientA}</h3>
        </div>
        <span className="text-xs sm:text-sm font-medium text-neutral-400 uppercase tracking-wide">
          vs
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <h3 className="text-lg sm:text-2xl font-bold capitalize">{ingredientB}</h3>
          <span className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" style={{ backgroundColor: COLORS[1] }} />
        </div>
      </div>

      <svg width={width} height={height} className="overflow-visible">
        {/* Connection lines */}
        {connections.map((conn, i) => {
          const fromY = startY + conn.fromIndex * nodeSpacing;
          const toY = startY + conn.toIndex * nodeSpacing;
          const fromRadius = getNodeRadius(topA[conn.fromIndex].count, maxCountA);
          const toRadius = getNodeRadius(topB[conn.toIndex].count, maxCountB);
          
          const midX = width / 2;
          const path = `M ${leftX + fromRadius + 8} ${fromY} 
                        C ${midX} ${fromY}, ${midX} ${toY}, ${rightX - toRadius - 8} ${toY}`;
          
          return (
            <motion.path
              key={`conn-${i}`}
              d={path}
              fill="none"
              stroke="url(#mono-gradient)"
              strokeWidth={3}
              strokeOpacity={0.3}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: i * 0.05, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            />
          );
        })}

        {/* Gradient */}
        <defs>
          <linearGradient id="mono-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={COLORS[0]} />
            <stop offset="100%" stopColor={COLORS[1]} />
          </linearGradient>
        </defs>

        {/* Left side - Ingredient A */}
        {topA.map((flavor, i) => {
          const y = startY + i * nodeSpacing;
          const radius = getNodeRadius(flavor.count, maxCountA);
          
          return (
            <motion.g
              key={`a-${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
            >
              <text
                x={leftX - radius - (isMobile ? 6 : 12)}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className={`${isMobile ? 'text-[10px]' : 'text-sm'} capitalize font-medium`}
                fill={flavor.isShared ? '#1a1a1a' : '#a0a0a0'}
              >
                {flavor.name}
              </text>
              <circle
                cx={leftX}
                cy={y}
                r={radius}
                fill={flavor.isShared ? COLORS[0] : '#e0e0e0'}
              />
            </motion.g>
          );
        })}

        {/* Right side - Ingredient B */}
        {topB.map((flavor, i) => {
          const y = startY + i * nodeSpacing;
          const radius = getNodeRadius(flavor.count, maxCountB);
          
          return (
            <motion.g
              key={`b-${i}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
            >
              <circle
                cx={rightX}
                cy={y}
                r={radius}
                fill={flavor.isShared ? COLORS[1] : '#e0e0e0'}
              />
              <text
                x={rightX + radius + (isMobile ? 6 : 12)}
                y={y}
                textAnchor="start"
                dominantBaseline="middle"
                className={`${isMobile ? 'text-[10px]' : 'text-sm'} capitalize font-medium`}
                fill={flavor.isShared ? '#1a1a1a' : '#a0a0a0'}
              >
                {flavor.name}
              </text>
            </motion.g>
          );
        })}
      </svg>

      <motion.div 
        className="mt-4 sm:mt-6 px-4 sm:px-6 py-2 sm:py-3 bg-neutral-100 rounded-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <span className="text-xs sm:text-sm font-medium text-neutral-500">
          {connections.length} flavor{connections.length !== 1 ? 's' : ''} in common
        </span>
      </motion.div>
    </div>
  );
}
