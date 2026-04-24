'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SharedFlavorProfile } from '@/lib/api';

interface ChordDiagramProps {
  selectedIngredients: string[];
  sharedProfiles: SharedFlavorProfile[];
  colors: string[];
}

export default function ChordDiagram({
  selectedIngredients,
  sharedProfiles,
  colors,
}: ChordDiagramProps) {
  const [hoveredFlavor, setHoveredFlavor] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const width = isMobile ? 320 : 600;
  const height = isMobile ? 350 : 420;
  const padX = isMobile ? 70 : 110;
  
  const sharedOnly = useMemo(() => {
    return sharedProfiles
      .filter(p => p.ingredient_count >= 2)
      .sort((a, b) => b.total_molecules - a.total_molecules)
      .slice(0, 20);
  }, [sharedProfiles]);

  const ingredientPositions = useMemo(() => {
    const startY = isMobile ? 60 : 80;
    const spacing = (height - (isMobile ? 120 : 160)) / Math.max(selectedIngredients.length - 1, 1);
    
    return selectedIngredients.map((name, i) => ({
      name,
      x: isMobile ? 60 : 100,
      y: selectedIngredients.length === 1 ? height / 2 : startY + spacing * i,
      color: colors[i % colors.length],
    }));
  }, [selectedIngredients, colors, height, isMobile]);

  const flavorPositions = useMemo(() => {
    if (sharedOnly.length === 0) return [];
    
    const startY = isMobile ? 40 : 50;
    const maxFlavors = isMobile ? 15 : 20;
    const displayFlavors = sharedOnly.slice(0, maxFlavors);
    const spacing = Math.min(isMobile ? 20 : 32, (height - (isMobile ? 80 : 100)) / displayFlavors.length);
    
    return displayFlavors.map((profile, i) => ({
      name: profile.flavor_note,
      sources: profile.ingredient_sources,
      count: profile.ingredient_count,
      molecules: profile.total_molecules,
      x: width - (isMobile ? 60 : 100),
      y: startY + spacing * i,
    }));
  }, [sharedOnly, height, width, isMobile]);

  if (sharedOnly.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-400 text-lg">No shared flavors found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-4 sm:mb-8">
        <p className="text-xs sm:text-sm font-medium text-neutral-400 uppercase tracking-wide mb-1 sm:mb-2">
          Shared Flavors
        </p>
        <p className="text-sm sm:text-lg text-neutral-600">
          <span className="font-bold text-neutral-900">{sharedOnly.length}</span> flavors connect{' '}
          {selectedIngredients.map((ing, i) => (
            <span key={ing}>
              <span className="font-bold capitalize">{ing}</span>
              {i < selectedIngredients.length - 1 && <span className="text-neutral-300"> + </span>}
            </span>
          ))}
        </p>
      </div>

      <svg
        viewBox={`${-padX} 0 ${width + padX * 2} ${height}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: width + padX * 2 }}
        className="overflow-visible"
      >
        {/* Connection lines */}
        {flavorPositions.map((flavor, fi) => {
          const isHovered = hoveredFlavor === flavor.name;
          
          return flavor.sources.map((source, si) => {
            const ing = ingredientPositions.find(i => i.name === source);
            if (!ing) return null;
            
            const midX = width / 2;
            const path = `M ${ing.x + 15} ${ing.y} 
                          C ${midX} ${ing.y}, ${midX} ${flavor.y}, ${flavor.x - 15} ${flavor.y}`;
            
            return (
              <motion.path
                key={`line-${fi}-${si}`}
                d={path}
                fill="none"
                stroke={ing.color}
                strokeWidth={isHovered ? 3 : 2}
                strokeOpacity={hoveredFlavor ? (isHovered ? 0.7 : 0.06) : 0.2}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: fi * 0.02, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              />
            );
          });
        })}

        {/* Ingredient nodes */}
        {ingredientPositions.map((ing, i) => (
          <motion.g 
            key={ing.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <circle
              cx={ing.x}
              cy={ing.y}
              r={isMobile ? 10 : 14}
              fill={ing.color}
            />
            <text
              x={ing.x - (isMobile ? 16 : 25)}
              y={ing.y}
              textAnchor="end"
              dominantBaseline="middle"
              className={`${isMobile ? 'text-xs' : 'text-base'} capitalize font-bold`}
              fill="#1a1a1a"
            >
              {ing.name}
            </text>
          </motion.g>
        ))}

        {/* Flavor nodes */}
        {flavorPositions.map((flavor, i) => {
          const isHovered = hoveredFlavor === flavor.name;
          const nodeSize = isMobile 
            ? 4 + Math.min(flavor.molecules / 30, 3)
            : 6 + Math.min(flavor.molecules / 25, 5);
          
          return (
            <motion.g 
              key={flavor.name}
              onMouseEnter={() => setHoveredFlavor(flavor.name)}
              onMouseLeave={() => setHoveredFlavor(null)}
              style={{ cursor: 'pointer' }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02, duration: 0.4 }}
            >
              <circle
                cx={flavor.x}
                cy={flavor.y}
                r={nodeSize}
                fill={isHovered ? '#1a1a1a' : '#c0c0c0'}
              />
              <text
                x={flavor.x + (isMobile ? 10 : 18)}
                y={flavor.y}
                textAnchor="start"
                dominantBaseline="middle"
                className={`${isMobile ? 'text-[10px]' : 'text-sm'} capitalize`}
                fill={isHovered ? '#1a1a1a' : '#808080'}
                fontWeight={isHovered ? 600 : 400}
              >
                {flavor.name}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
