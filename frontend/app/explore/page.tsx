'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from '@/components/SearchBar';
import ChordDiagram from '@/components/ChordDiagram';
import FlavorWheel from '@/components/FlavorWheel';
import CorrelationDiagram from '@/components/CorrelationDiagram';
import Skeleton, { SkeletonCard, SkeletonRecommendation, SkeletonConnection } from '@/components/Skeleton';
import {
  getIngredientFlavorProfiles,
  getSharedFlavorProfiles,
  getIngredientPairingScore,
  getFlavorWheelData,
  getRecommendedPairings,
  FlavorProfile,
  SharedFlavorProfile,
  RecommendedPairing,
} from '@/lib/api';

interface ParsedWheelCategory {
  category_name: string;
  category_color: string;
  flavor_count: number;
  flavors: { id: number; name: string }[];
}

const MAX_COMPARE = 3;
const MONO_COLORS = ['#2a2a2a', '#555555', '#808080'];

const SUGGESTED_INGREDIENTS = [
  'tomato', 'basil', 'garlic', 'lemon', 'honey', 
  'vanilla', 'coffee', 'cheese', 'salmon', 'beef'
];

interface PairingConnection {
  from: string;
  to: string;
  sharedNotes: string[];
  sharedCount: number;
  pairingScore: number;
  result: string;
}

type ViewMode = 'overview' | 'harmonies' | 'wheel' | 'correlation';

const transition = { duration: 0.4, ease: 'easeOut' as const };

export default function ExplorePage() {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [ingredientProfiles, setIngredientProfiles] = useState<Record<string, FlavorProfile[]>>({});
  const [sharedProfiles, setSharedProfiles] = useState<SharedFlavorProfile[]>([]);
  const [connections, setConnections] = useState<PairingConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [wheelCategories, setWheelCategories] = useState<ParsedWheelCategory[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedPairing[]>([]);
  const [correlationPair, setCorrelationPair] = useState<[string, string] | null>(null);

  useEffect(() => {
    getFlavorWheelData().then(res => {
      if (res.wheel) {
        const parsed = res.wheel.map(cat => ({
          ...cat,
          flavors: typeof cat.flavors === 'string' ? JSON.parse(cat.flavors) : cat.flavors
        }));
        setWheelCategories(parsed);
      }
    }).catch(console.error);
  }, []);

  const addIngredient = useCallback(async (ingredient: string) => {
    if (selectedIngredients.includes(ingredient)) return;
    if (selectedIngredients.length >= MAX_COMPARE) return;
    
    const newIngredients = [...selectedIngredients, ingredient];
    setSelectedIngredients(newIngredients);
    setIsLoading(true);
    setIsLoadingProfiles(true);
    setIsLoadingRecommendations(true);

    try {
      const profilesRes = await getIngredientFlavorProfiles(ingredient);
      setIngredientProfiles(prev => ({
        ...prev,
        [ingredient]: profilesRes.profiles || []
      }));
      setIsLoadingProfiles(false);

      const newConnections: PairingConnection[] = [];
      for (const existing of selectedIngredients) {
        try {
          const pairingRes = await getIngredientPairingScore(existing, ingredient);
          newConnections.push({
            from: existing,
            to: ingredient,
            sharedNotes: pairingRes.shared_flavor_notes || [],
            sharedCount: pairingRes.shared_count,
            pairingScore: pairingRes.pairing_score,
            result: pairingRes.result,
          });
        } catch (e) {
          console.error(e);
        }
      }
      setConnections(prev => [...prev, ...newConnections]);

      if (newIngredients.length >= 2) {
        try {
          const sharedRes = await getSharedFlavorProfiles(newIngredients);
          setSharedProfiles(sharedRes.profiles || []);
        } catch (e) {
          console.error(e);
        }
      }

      try {
        const recsRes = await getRecommendedPairings(ingredient, 6);
        setRecommendations(recsRes.pairings || []);
      } catch (e) {
        console.error(e);
      }
      setIsLoadingRecommendations(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsLoadingProfiles(false);
      setIsLoadingRecommendations(false);
    }
  }, [selectedIngredients]);

  const removeIngredient = async (ingredient: string) => {
    const newIngredients = selectedIngredients.filter(i => i !== ingredient);
    setSelectedIngredients(newIngredients);
    setIngredientProfiles(prev => {
      const next = { ...prev };
      delete next[ingredient];
      return next;
    });
    setConnections(prev => prev.filter(c => c.from !== ingredient && c.to !== ingredient));
    setCorrelationPair(null);

    if (newIngredients.length >= 2) {
      try {
        const sharedRes = await getSharedFlavorProfiles(newIngredients);
        setSharedProfiles(sharedRes.profiles || []);
      } catch (e) {
        setSharedProfiles([]);
      }
    } else {
      setSharedProfiles([]);
    }

    if (newIngredients.length === 1) {
      setIsLoadingRecommendations(true);
      try {
        const recsRes = await getRecommendedPairings(newIngredients[0], 6);
        setRecommendations(recsRes.pairings || []);
      } catch (e) {
        setRecommendations([]);
      }
      setIsLoadingRecommendations(false);
    } else if (newIngredients.length === 0) {
      setRecommendations([]);
    }
  };

  const reset = () => {
    setSelectedIngredients([]);
    setIngredientProfiles({});
    setSharedProfiles([]);
    setConnections([]);
    setRecommendations([]);
    setCorrelationPair(null);
    setViewMode('overview');
  };

  const handleRecommendationClick = async (recIngredient: string) => {
    if (selectedIngredients.length === 0) return;
    if (selectedIngredients.includes(recIngredient)) return;
    if (selectedIngredients.length >= MAX_COMPARE) return;
    
    const baseIngredient = selectedIngredients[0];
    await addIngredient(recIngredient);
    setCorrelationPair([baseIngredient, recIngredient]);
    setViewMode('correlation');
  };

  const sharedCount = useMemo(() => {
    return sharedProfiles.filter(p => p.ingredient_count > 1).length;
  }, [sharedProfiles]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <motion.header 
        className="pt-12 pb-8 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="inline-block mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="text-sm font-medium tracking-wide text-neutral-400">
              Flavor Explorer
            </span>
          </motion.div>
          
          <motion.h1 
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.9]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="text-neutral-900">Discover flavor</span>
            <br />
            <span className="text-neutral-400">connections</span>
          </motion.h1>
        </div>
      </motion.header>

      <div className="max-w-4xl mx-auto px-6 pb-24">
        {/* Search */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <SearchBar onSelect={addIngredient} disabled={selectedIngredients.length >= MAX_COMPARE} />
        </motion.div>

        {/* Empty State */}
        <AnimatePresence mode="wait">
          {selectedIngredients.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={transition}
            >
              <p className="text-neutral-400 mb-6 text-lg">Try something</p>
              <div className="flex flex-wrap gap-3">
                {SUGGESTED_INGREDIENTS.map((ing, i) => (
                  <motion.button
                    key={ing}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.04 }}
                    onClick={() => addIngredient(ing)}
                    className="px-6 py-3 bg-white rounded-full text-[15px] capitalize
                             border border-neutral-200
                             hover:bg-neutral-900 hover:text-white hover:border-neutral-900
                             transition-all duration-300"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {ing}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Ingredients */}
        <AnimatePresence>
          {selectedIngredients.length > 0 && (
            <motion.div 
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="mb-8"
            >
              {/* Selected Pills */}
              <div className="flex flex-wrap gap-3 mb-8">
                {selectedIngredients.map((ingredient, i) => (
                  <motion.div
                    key={ingredient}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={transition}
                    className="group flex items-center gap-3 px-5 py-3 rounded-full text-white"
                    style={{ backgroundColor: MONO_COLORS[i % MONO_COLORS.length] }}
                  >
                    <span className="capitalize font-medium">{ingredient}</span>
                    <button
                      onClick={() => removeIngredient(ingredient)}
                      className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center
                               hover:bg-white/40 transition-colors text-sm"
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
                
                {selectedIngredients.length < MAX_COMPARE && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="px-5 py-3 rounded-full border-2 border-dashed border-neutral-300
                             text-neutral-400 text-sm"
                  >
                    + {MAX_COMPARE - selectedIngredients.length} more
                  </motion.div>
                )}
                
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={reset}
                  className="px-5 py-3 text-neutral-400 hover:text-neutral-900 
                           text-sm transition-colors"
                  whileHover={{ x: 3 }}
                >
                  start over →
                </motion.button>
              </div>

              {/* View Mode Toggle */}
              <motion.div 
                className="inline-flex bg-white rounded-full p-1.5 border border-neutral-200 mb-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'wheel', label: 'Wheel' },
                  ...(selectedIngredients.length >= 2 ? [{ id: 'harmonies', label: 'Harmonies' }] : []),
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id as ViewMode)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      viewMode === tab.id
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </motion.div>

              {/* Content */}
              <AnimatePresence mode="wait">
                {/* Correlation View */}
                {viewMode === 'correlation' && correlationPair && (
                  <motion.div
                    key="correlation"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={transition}
                    className="bg-white rounded-3xl p-8 border border-neutral-200"
                  >
                    <button
                      onClick={() => setViewMode('overview')}
                      className="text-sm text-neutral-400 hover:text-neutral-900 mb-6 
                               flex items-center gap-2 transition-colors"
                    >
                      ← Back
                    </button>
                    <CorrelationDiagram
                      ingredientA={correlationPair[0]}
                      ingredientB={correlationPair[1]}
                      profilesA={ingredientProfiles[correlationPair[0]] || []}
                      profilesB={ingredientProfiles[correlationPair[1]] || []}
                      sharedNotes={connections.find(c => 
                        (c.from === correlationPair[0] && c.to === correlationPair[1]) ||
                        (c.from === correlationPair[1] && c.to === correlationPair[0])
                      )?.sharedNotes || []}
                    />
                  </motion.div>
                )}

                {/* Wheel View */}
                {viewMode === 'wheel' && (
                  <motion.div
                    key="wheel"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={transition}
                    className="bg-white rounded-3xl p-8 border border-neutral-200"
                  >
                    <FlavorWheel
                      categories={wheelCategories}
                      ingredientFlavors={selectedIngredients.map((ing, i) => ({
                        ingredient: ing,
                        flavors: (ingredientProfiles[ing] || []).slice(0, 25).map(p => p.flavor_note),
                        color: MONO_COLORS[i % MONO_COLORS.length],
                      }))}
                    />
                  </motion.div>
                )}

                {/* Harmonies View */}
                {viewMode === 'harmonies' && selectedIngredients.length >= 2 && (
                  <motion.div
                    key="harmonies"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={transition}
                    className="bg-white rounded-3xl p-8 border border-neutral-200"
                  >
                    {sharedProfiles.length > 0 ? (
                      <ChordDiagram
                        selectedIngredients={selectedIngredients}
                        sharedProfiles={sharedProfiles}
                        colors={MONO_COLORS}
                      />
                    ) : (
                      <div className="text-center py-16">
                        <p className="text-neutral-400 text-lg">
                          {isLoading ? 'Finding connections...' : 'No shared flavors found'}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Overview */}
                {viewMode === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    className="space-y-6"
                  >
                    {/* Pairing Scores */}
                    {(connections.length > 0 || isLoading) && selectedIngredients.length >= 2 && (
                      <motion.div 
                        className="bg-white rounded-3xl p-8 border border-neutral-200"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                      >
                        <h3 className="text-sm font-medium text-neutral-400 mb-6 uppercase tracking-wide">
                          Match Score
                        </h3>
                        
                        {isLoading && connections.length === 0 ? (
                          <div className="space-y-5">
                            <SkeletonConnection />
                          </div>
                        ) : (
                          <div className="space-y-5">
                            {connections.map((conn, idx) => (
                              <motion.div
                                key={`${conn.from}-${conn.to}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group cursor-pointer"
                                onClick={() => {
                                  setCorrelationPair([conn.from, conn.to]);
                                  setViewMode('correlation');
                                }}
                                whileHover={{ x: 6 }}
                              >
                                <div className="flex items-center gap-4 mb-3">
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: MONO_COLORS[selectedIngredients.indexOf(conn.from)] }}
                                    />
                                    <span className="capitalize font-medium">{conn.from}</span>
                                  </div>
                                  <span className="text-neutral-300">+</span>
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: MONO_COLORS[selectedIngredients.indexOf(conn.to)] }}
                                    />
                                    <span className="capitalize font-medium">{conn.to}</span>
                                  </div>
                                  <span className="ml-auto text-3xl font-bold">
                                    {Math.round(conn.pairingScore * 100)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full bg-neutral-900"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${conn.pairingScore * 100}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.1 }}
                                  />
                                </div>
                                <p className="text-sm text-neutral-400 mt-2 group-hover:text-neutral-600 transition-colors">
                                  {conn.sharedCount} flavors in common — tap to explore
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        )}

                        {sharedCount > 0 && (
                          <motion.button
                            onClick={() => setViewMode('harmonies')}
                            className="mt-8 text-sm font-medium text-neutral-500 hover:text-neutral-900 
                                     hover:underline transition-colors"
                            whileHover={{ x: 4 }}
                          >
                            See all {sharedCount} shared flavors →
                          </motion.button>
                        )}
                      </motion.div>
                    )}

                    {/* Recommendations */}
                    {selectedIngredients.length === 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <h3 className="text-sm font-medium text-neutral-400 mb-6 uppercase tracking-wide">
                          Pairs well with
                        </h3>
                        
                        {isLoadingRecommendations ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                              <SkeletonRecommendation key={i} />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {recommendations.map((rec, i) => (
                              <motion.div
                                key={rec.ingredient_name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => handleRecommendationClick(rec.ingredient_name)}
                                className="group bg-white rounded-2xl p-5 cursor-pointer 
                                         border border-neutral-200
                                         hover:border-neutral-900 transition-all duration-300"
                                whileHover={{ y: -4 }}
                              >
                                <div className="flex justify-between items-start mb-4">
                                  <h4 className="text-xl font-bold capitalize">{rec.ingredient_name}</h4>
                                  <motion.span 
                                    className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center
                                             group-hover:bg-neutral-900 group-hover:text-white
                                             transition-all duration-300 text-lg"
                                    whileHover={{ rotate: 90 }}
                                  >
                                    +
                                  </motion.span>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-neutral-400 uppercase">Match</span>
                                    <span className="text-sm font-bold">{Math.round(rec.pairing_score * 100)}%</span>
                                  </div>
                                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full bg-neutral-400"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${rec.pairing_score * 100}%` }}
                                      transition={{ delay: i * 0.05 + 0.3, duration: 0.5 }}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Flavor Profiles */}
                    {selectedIngredients.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        <h3 className="text-sm font-medium text-neutral-400 mb-6 uppercase tracking-wide">
                          Flavor profiles
                        </h3>
                        <div className="grid gap-4" style={{ 
                          gridTemplateColumns: `repeat(${Math.min(selectedIngredients.length, 3)}, 1fr)` 
                        }}>
                          {selectedIngredients.map((ingredient, idx) => (
                            <motion.div
                              key={ingredient}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.08 }}
                            >
                              {isLoadingProfiles && !ingredientProfiles[ingredient] ? (
                                <SkeletonCard />
                              ) : (
                                <div className="bg-white rounded-2xl p-6 border border-neutral-200">
                                  <div className="flex items-center gap-3 mb-5">
                                    <span 
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: MONO_COLORS[idx % MONO_COLORS.length] }}
                                    />
                                    <h4 className="text-xl font-bold capitalize">{ingredient}</h4>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2">
                                    {(ingredientProfiles[ingredient] || []).slice(0, 10).map((profile, pi) => {
                                      const isShared = sharedProfiles.some(
                                        sp => sp.flavor_note === profile.flavor_note && sp.ingredient_count > 1
                                      );
                                      return (
                                        <motion.span
                                          key={profile.flavor_note}
                                          initial={{ opacity: 0, scale: 0.9 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          transition={{ delay: pi * 0.03 }}
                                          className={`px-3 py-1.5 rounded-full text-sm capitalize transition-all ${
                                            isShared 
                                              ? 'bg-neutral-900 text-white font-medium' 
                                              : 'bg-neutral-100 text-neutral-600'
                                          }`}
                                        >
                                          {profile.flavor_note}
                                        </motion.span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
