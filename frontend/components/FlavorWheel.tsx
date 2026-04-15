'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

interface FlavorNode {
  id: number;
  name: string;
}

interface WheelCategory {
  category_name: string;
  category_color: string;
  flavor_count: number;
  flavors: FlavorNode[];
}

interface IngredientFlavors {
  ingredient: string;
  flavors: string[];
  color: string;
}

interface FlavorWheelProps {
  categories: WheelCategory[];
  ingredientFlavors?: IngredientFlavors[];
  onFlavorSelect?: (flavor: string) => void;
}

export default function FlavorWheel({
  categories,
  ingredientFlavors = [],
  onFlavorSelect,
}: FlavorWheelProps) {
  const [hoveredFlavor, setHoveredFlavor] = useState<string | null>(null);
  const [hoveredIngredient, setHoveredIngredient] = useState<string | null>(null);

  const size = 480;
  const center = size / 2;
  const innerRadius = 90;
  const outerRadius = 200;

  const allHighlightedFlavors = useMemo(() => {
    const set = new Set<string>();
    ingredientFlavors.forEach(ing => {
      ing.flavors.forEach(f => set.add(f.toLowerCase().trim()));
    });
    return set;
  }, [ingredientFlavors]);

  const flavorToIngredients = useMemo(() => {
    const map = new Map<string, string[]>();
    ingredientFlavors.forEach(ing => {
      ing.flavors.forEach(f => {
        const key = f.toLowerCase().trim();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ing.ingredient);
      });
    });
    return map;
  }, [ingredientFlavors]);

  const filteredCategories = useMemo(() => {
    if (allHighlightedFlavors.size === 0) return [];
    
    return categories
      .map(cat => ({
        ...cat,
        flavors: cat.flavors.filter(f => 
          allHighlightedFlavors.has(f.name.toLowerCase().trim())
        ),
      }))
      .filter(cat => cat.flavors.length > 0);
  }, [categories, allHighlightedFlavors]);

  const flavorPositions = useMemo(() => {
    const positions: { 
      flavor: string; 
      x: number; 
      y: number; 
      angle: number;
    }[] = [];
    
    const totalFlavors = filteredCategories.reduce((sum, c) => sum + c.flavors.length, 0);
    if (totalFlavors === 0) return positions;

    let currentIndex = 0;
    filteredCategories.forEach(cat => {
      cat.flavors.forEach(flavor => {
        const angle = (currentIndex / totalFlavors) * 2 * Math.PI - Math.PI / 2;
        positions.push({
          flavor: flavor.name,
          x: center + Math.cos(angle) * outerRadius,
          y: center + Math.sin(angle) * outerRadius,
          angle,
        });
        currentIndex++;
      });
    });
    
    return positions;
  }, [filteredCategories, center, outerRadius]);

  if (ingredientFlavors.length === 0 || flavorPositions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <motion.div 
          className="w-48 h-48 rounded-full border-2 border-dashed border-neutral-300 
                   flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        >
          <p className="text-neutral-400 text-center px-6">
            Add ingredients to see flavors
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {ingredientFlavors.map((ing) => (
          <motion.button
            key={ing.ingredient}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200 transition-all"
            style={{ 
              backgroundColor: hoveredIngredient === ing.ingredient ? ing.color : 'white',
              color: hoveredIngredient === ing.ingredient ? 'white' : '#1a1a1a',
              borderColor: hoveredIngredient === ing.ingredient ? ing.color : '#e0e0e0'
            }}
            onMouseEnter={() => setHoveredIngredient(ing.ingredient)}
            onMouseLeave={() => setHoveredIngredient(null)}
            whileHover={{ scale: 1.05 }}
          >
            <span 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: hoveredIngredient === ing.ingredient ? 'white' : ing.color }}
            />
            <span className="text-sm font-medium capitalize">
              {ing.ingredient}
            </span>
          </motion.button>
        ))}
      </div>

      <svg width={size} height={size} className="overflow-visible">
        {/* Center circle */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="#fafafa"
          stroke="#e0e0e0"
          strokeWidth={2}
        />

        {/* Lines from center to flavors */}
        {flavorPositions.map((pos, i) => {
          const flavorKey = pos.flavor.toLowerCase().trim();
          const ingredients = flavorToIngredients.get(flavorKey) || [];
          const isHovered = hoveredFlavor === pos.flavor;
          const isIngredientHovered = hoveredIngredient && ingredients.includes(hoveredIngredient);
          
          return ingredients.map((ing, ingIndex) => {
            const ingData = ingredientFlavors.find(i => i.ingredient === ing);
            if (!ingData) return null;
            
            const offset = (ingIndex - (ingredients.length - 1) / 2) * 3;
            const lineX = center + Math.cos(pos.angle) * (innerRadius + 8);
            const lineY = center + Math.sin(pos.angle) * (innerRadius + 8);
            
            return (
              <motion.line
                key={`line-${i}-${ingIndex}`}
                x1={lineX + Math.sin(pos.angle) * offset}
                y1={lineY - Math.cos(pos.angle) * offset}
                x2={pos.x + Math.sin(pos.angle) * offset}
                y2={pos.y - Math.cos(pos.angle) * offset}
                stroke={ingData.color}
                strokeWidth={isHovered || isIngredientHovered ? 3 : 2}
                strokeOpacity={
                  hoveredIngredient 
                    ? (isIngredientHovered ? 0.8 : 0.06)
                    : (isHovered ? 0.8 : 0.25)
                }
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: i * 0.008, duration: 0.4 }}
              />
            );
          });
        })}

        {/* Flavor dots */}
        {flavorPositions.map((pos, i) => {
          const flavorKey = pos.flavor.toLowerCase().trim();
          const ingredients = flavorToIngredients.get(flavorKey) || [];
          const isShared = ingredients.length > 1;
          const isHovered = hoveredFlavor === pos.flavor;
          const isIngredientHovered = hoveredIngredient && ingredients.includes(hoveredIngredient);
          
          return (
            <motion.g key={`flavor-${i}`}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isShared ? 8 : 5}
                fill={isShared ? '#1a1a1a' : '#b0b0b0'}
                fillOpacity={
                  hoveredIngredient 
                    ? (isIngredientHovered ? 1 : 0.15)
                    : 1
                }
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredFlavor(pos.flavor)}
                onMouseLeave={() => setHoveredFlavor(null)}
                onClick={() => onFlavorSelect?.(pos.flavor)}
              />

              {(isHovered || (isShared && !hoveredIngredient)) && (
                <motion.text
                  x={pos.x + Math.cos(pos.angle) * 16}
                  y={pos.y + Math.sin(pos.angle) * 16}
                  textAnchor={Math.cos(pos.angle) > 0.1 ? 'start' : Math.cos(pos.angle) < -0.1 ? 'end' : 'middle'}
                  dominantBaseline="middle"
                  className="text-xs capitalize pointer-events-none font-medium"
                  fill={isShared ? '#1a1a1a' : '#808080'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {pos.flavor}
                </motion.text>
              )}
            </motion.g>
          );
        })}

        {/* Center text */}
        <text
          x={center}
          y={center - 10}
          textAnchor="middle"
          className="text-3xl font-bold"
          fill="#1a1a1a"
        >
          {flavorPositions.length}
        </text>
        <text
          x={center}
          y={center + 16}
          textAnchor="middle"
          className="text-sm font-medium"
          fill="#a0a0a0"
        >
          flavors
        </text>
      </svg>

      {ingredientFlavors.length > 1 && (
        <motion.div 
          className="mt-6 flex items-center gap-2 text-sm text-neutral-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="w-3 h-3 rounded-full bg-neutral-900" />
          <span>Shared between ingredients</span>
        </motion.div>
      )}
    </div>
  );
}
