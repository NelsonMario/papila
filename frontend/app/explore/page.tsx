'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from '@/components/SearchBar';
import ChordDiagram from '@/components/ChordDiagram';
import PairingWheel from '@/components/PairingWheel';
import CorrelationDiagram from '@/components/CorrelationDiagram';
import Skeleton, { SkeletonCard, SkeletonRecommendation } from '@/components/Skeleton';
import {
  getIngredientFlavorProfiles,
  getSharedFlavorProfiles,
  getIngredientPairingScore,
  getFlavorPairings,
  getRecommendedPairings,
  FlavorProfile,
  SharedFlavorProfile,
  RecommendedPairing,
  FlavorPairing,
} from '@/lib/api';

interface RecommendationDetailProps {
  recommendation: RecommendedPairing;
  baseIngredient: string;
  onClose: () => void;
  onAdd: () => void;
}

function RecommendationDetail({ recommendation, baseIngredient, onClose, onAdd }: RecommendationDetailProps) {
  const harmonyPercent = Math.min(100, Math.round((recommendation.shared_count / 300) * 100));
  const moleculePercent = Math.min(100, Math.round((recommendation.shared_molecules / 150) * 100));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="bg-[#f5f3ef] rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with add button */}
        <div className="relative p-4 pb-6">
          <button
            onClick={onAdd}
            className="absolute top-4 right-4 w-10 h-10 border-2 border-neutral-800 rounded-md 
                     flex items-center justify-center text-xl hover:bg-neutral-800 hover:text-white 
                     transition-colors"
          >
            +
          </button>
          
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
            Pairs with {baseIngredient}
          </p>
          <h2 className="text-2xl font-bold capitalize">{recommendation.ingredient_name}</h2>
          <p className="text-sm text-neutral-500">{recommendation.ingredient_category}</p>
        </div>

        {/* Stats */}
        <div className="px-6 pb-6 space-y-4">
          {/* Harmony Bar */}
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-wide text-neutral-500 w-20">Harmony</span>
            <div className="flex-1 h-2.5 bg-neutral-300 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${harmonyPercent}%` }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: '#8b8b6b' }}
              />
            </div>
            <span className="text-sm font-medium w-10 text-right">{harmonyPercent}%</span>
          </div>

          {/* Molecule Bar */}
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-wide text-neutral-500 w-20">Molecule</span>
            <div className="flex-1 h-2.5 bg-neutral-300 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${moleculePercent}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="h-full rounded-full"
                style={{ backgroundColor: '#8b6b5b' }}
              />
            </div>
            <span className="text-sm font-medium w-10 text-right">{moleculePercent}%</span>
          </div>
        </div>

        {/* Flavor Notes */}
        <div className="px-6 pb-6">
          <p className="text-xs uppercase tracking-wide text-neutral-500 mb-3">Top Flavor Notes</p>
          <div className="flex flex-wrap gap-2">
            {(recommendation.shared_flavors || []).slice(0, 8).map((flavor) => (
              <span
                key={flavor}
                className="px-3 py-1.5 bg-white rounded-full text-sm capitalize border border-neutral-200"
              >
                {flavor}
              </span>
            ))}
          </div>
        </div>

        {/* Close button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
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
}

type ViewMode = 'overview' | 'harmonies' | 'pairings' | 'correlation';

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
  const [flavorPairings, setFlavorPairings] = useState<FlavorPairing[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedPairing[]>([]);
  const [correlationPair, setCorrelationPair] = useState<[string, string] | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendedPairing | null>(null);

  useEffect(() => {
    getFlavorPairings(100).then(res => {
      if (res.pairings) {
        setFlavorPairings(res.pairings);
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
        const recsRes = await getRecommendedPairings(ingredient, 8);
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
        const recsRes = await getRecommendedPairings(newIngredients[0], 8);
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
        className="pt-8 sm:pt-12 pb-6 sm:pb-8 px-4 sm:px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="inline-block mb-4 sm:mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="text-xs sm:text-sm font-medium tracking-wide text-neutral-400">
              Flavor Explorer
            </span>
          </motion.div>
          
          <motion.h1 
            className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[0.9]"
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        {/* Search */}
        <motion.div 
          className="mb-8 sm:mb-12"
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
              <p className="text-neutral-400 mb-4 sm:mb-6 text-base sm:text-lg">Try something</p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {SUGGESTED_INGREDIENTS.map((ing, i) => (
                  <motion.button
                    key={ing}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.04 }}
                    onClick={() => addIngredient(ing)}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-white rounded-full text-sm sm:text-[15px] capitalize
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
              className="mb-6 sm:mb-8"
            >
              {/* Selected Pills */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
                {selectedIngredients.map((ingredient, i) => (
                  <motion.div
                    key={ingredient}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={transition}
                    className="group flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2 sm:py-3 rounded-full text-white text-sm sm:text-base"
                    style={{ backgroundColor: MONO_COLORS[i % MONO_COLORS.length] }}
                  >
                    <span className="capitalize font-medium">{ingredient}</span>
                    <button
                      onClick={() => removeIngredient(ingredient)}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center
                               hover:bg-white/40 transition-colors text-xs sm:text-sm"
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
                    className="px-4 sm:px-5 py-2 sm:py-3 rounded-full border-2 border-dashed border-neutral-300
                             text-neutral-400 text-xs sm:text-sm"
                  >
                    + {MAX_COMPARE - selectedIngredients.length} more
                  </motion.div>
                )}
                
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={reset}
                  className="px-4 sm:px-5 py-2 sm:py-3 text-neutral-400 hover:text-neutral-900 
                           text-xs sm:text-sm transition-colors"
                  whileHover={{ x: 3 }}
                >
                  start over →
                </motion.button>
              </div>

              {/* View Mode Toggle */}
              <motion.div 
                className="flex flex-wrap gap-2 sm:inline-flex sm:bg-white sm:rounded-full sm:p-1.5 sm:border sm:border-neutral-200 mb-6 sm:mb-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'pairings', label: 'Pairings' },
                  ...(selectedIngredients.length >= 2 ? [{ id: 'harmonies', label: 'Harmonies' }] : []),
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id as ViewMode)}
                    className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                      viewMode === tab.id
                        ? 'bg-neutral-900 text-white'
                        : 'bg-white sm:bg-transparent text-neutral-500 hover:text-neutral-900 border border-neutral-200 sm:border-0'
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
                    className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-neutral-200 overflow-x-auto"
                  >
                    <button
                      onClick={() => setViewMode('overview')}
                      className="text-sm text-neutral-400 hover:text-neutral-900 mb-4 sm:mb-6 
                               flex items-center gap-2 transition-colors"
                    >
                      ← Back
                    </button>
                    <div className="min-w-[320px]">
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
                    </div>
                  </motion.div>
                )}

                {/* Pairings View */}
                {viewMode === 'pairings' && (
                  <motion.div
                    key="pairings"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={transition}
                    className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-neutral-200 overflow-x-auto"
                  >
                    <h3 className="text-xs sm:text-sm font-medium text-neutral-400 mb-4 uppercase tracking-wide">
                      Flavor Pairings
                    </h3>
                    <p className="text-sm text-neutral-500 mb-6">
                      Common flavor combinations based on molecular co-occurrence
                    </p>
                    <div className="min-w-[320px]">
                      <PairingWheel
                        pairings={flavorPairings}
                        highlightFlavors={
                          selectedIngredients.length > 0
                            ? selectedIngredients.flatMap(ing => 
                                (ingredientProfiles[ing] || []).slice(0, 10).map(p => p.flavor_note)
                              )
                            : []
                        }
                      />
                    </div>
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
                    className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-neutral-200 overflow-x-auto"
                  >
                    {sharedProfiles.length > 0 ? (
                      <div className="min-w-[320px]">
                        <ChordDiagram
                          selectedIngredients={selectedIngredients}
                          sharedProfiles={sharedProfiles}
                          colors={MONO_COLORS}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-12 sm:py-16">
                        <p className="text-neutral-400 text-base sm:text-lg">
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
                    className="space-y-4 sm:space-y-6"
                  >
                    {/* Flavor Connections */}
                    {connections.length > 0 && selectedIngredients.length >= 2 && (
                      <motion.div 
                        className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-neutral-200"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                      >
                        <h3 className="text-xs sm:text-sm font-medium text-neutral-400 mb-4 sm:mb-6 uppercase tracking-wide">
                          Flavor Connections
                        </h3>
                        
                        <div className="space-y-4">
                          {connections.map((conn, idx) => (
                            <motion.div
                              key={`${conn.from}-${conn.to}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="group cursor-pointer p-3 sm:p-4 rounded-xl hover:bg-neutral-50 transition-colors"
                              onClick={() => {
                                setCorrelationPair([conn.from, conn.to]);
                                setViewMode('correlation');
                              }}
                            >
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                                    style={{ backgroundColor: MONO_COLORS[selectedIngredients.indexOf(conn.from)] }}
                                  />
                                  <span className="capitalize font-medium text-sm sm:text-base">{conn.from}</span>
                                </div>
                                <span className="text-neutral-300">+</span>
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                                    style={{ backgroundColor: MONO_COLORS[selectedIngredients.indexOf(conn.to)] }}
                                  />
                                  <span className="capitalize font-medium text-sm sm:text-base">{conn.to}</span>
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm text-neutral-400 group-hover:text-neutral-600 transition-colors">
                                {conn.sharedCount} shared flavors — tap to explore
                              </p>
                            </motion.div>
                          ))}
                        </div>

                        {sharedCount > 0 && (
                          <motion.button
                            onClick={() => setViewMode('harmonies')}
                            className="mt-6 sm:mt-8 text-xs sm:text-sm font-medium text-neutral-500 hover:text-neutral-900 
                                     hover:underline transition-colors"
                            whileHover={{ x: 4 }}
                          >
                            See all {sharedCount} shared flavors →
                          </motion.button>
                        )}
                      </motion.div>
                    )}

                    {/* Flavor Profiles */}
                    {selectedIngredients.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                      >
                        <h3 className="text-xs sm:text-sm font-medium text-neutral-400 mb-4 sm:mb-6 uppercase tracking-wide">
                          Flavor profiles
                        </h3>
                        <div className={`grid gap-3 sm:gap-4 ${
                          selectedIngredients.length === 1 
                            ? 'grid-cols-1' 
                            : selectedIngredients.length === 2 
                              ? 'grid-cols-1 sm:grid-cols-2' 
                              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                        }`}>
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
                                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-neutral-200">
                                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                                    <span 
                                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: MONO_COLORS[idx % MONO_COLORS.length] }}
                                    />
                                    <h4 className="text-lg sm:text-xl font-bold capitalize">{ingredient}</h4>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {(ingredientProfiles[ingredient] || []).slice(0, 12).map((profile, pi) => {
                                      const isShared = sharedProfiles.some(
                                        sp => sp.flavor_note === profile.flavor_note && sp.ingredient_count > 1
                                      );
                                      return (
                                        <motion.span
                                          key={profile.flavor_note}
                                          initial={{ opacity: 0, scale: 0.9 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          transition={{ delay: pi * 0.02 }}
                                          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm capitalize transition-all ${
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

                    {/* Recommendations */}
                    {selectedIngredients.length === 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <h3 className="text-xs sm:text-sm font-medium text-neutral-400 mb-4 sm:mb-6 uppercase tracking-wide">
                          Try pairing with <span className="capitalize text-neutral-600">{selectedIngredients[0]}</span>
                        </h3>
                        
                        {isLoadingRecommendations ? (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                              <SkeletonRecommendation key={i} />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {recommendations.map((rec, i) => {
                              const harmonyPercent = Math.min(100, Math.round((rec.shared_count / 300) * 100));
                              const moleculePercent = Math.min(100, Math.round((rec.shared_molecules / 150) * 100));
                              
                              return (
                                <motion.div
                                  key={rec.ingredient_name}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  onClick={() => setSelectedRecommendation(rec)}
                                  className="group bg-[#f5f3ef] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer 
                                           border border-neutral-200 hover:border-neutral-400 transition-all duration-300"
                                  whileHover={{ y: -2 }}
                                >
                                  {/* Card Header */}
                                  <div className="p-3 sm:p-4 pb-3">
                                    <div className="flex justify-between items-start mb-1">
                                      <h4 className="text-sm sm:text-base font-bold capitalize leading-tight">{rec.ingredient_name}</h4>
                                      <motion.span 
                                        className="w-6 h-6 sm:w-7 sm:h-7 border border-neutral-400 rounded flex items-center justify-center
                                                 group-hover:bg-neutral-900 group-hover:text-white group-hover:border-neutral-900
                                                 transition-all duration-300 text-xs sm:text-sm flex-shrink-0 ml-2"
                                        whileHover={{ rotate: 90 }}
                                      >
                                        +
                                      </motion.span>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-neutral-400">{rec.ingredient_category}</p>
                                  </div>

                                  {/* Progress Bars */}
                                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
                                    {/* Harmony */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] sm:text-[10px] uppercase tracking-wide text-neutral-400 w-14 sm:w-16">Harmony</span>
                                      <div className="flex-1 h-1.5 sm:h-2 bg-neutral-300 rounded-full overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${harmonyPercent}%` }}
                                          transition={{ duration: 0.5, delay: i * 0.03 + 0.2 }}
                                          className="h-full rounded-full"
                                          style={{ backgroundColor: '#8b8b6b' }}
                                        />
                                      </div>
                                      <span className="text-[10px] sm:text-xs font-medium w-7 sm:w-8 text-right">{harmonyPercent}%</span>
                                    </div>

                                    {/* Molecule */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] sm:text-[10px] uppercase tracking-wide text-neutral-400 w-14 sm:w-16">Molecule</span>
                                      <div className="flex-1 h-1.5 sm:h-2 bg-neutral-300 rounded-full overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${moleculePercent}%` }}
                                          transition={{ duration: 0.5, delay: i * 0.03 + 0.3 }}
                                          className="h-full rounded-full"
                                          style={{ backgroundColor: '#8b6b5b' }}
                                        />
                                      </div>
                                      <span className="text-[10px] sm:text-xs font-medium w-7 sm:w-8 text-right">{moleculePercent}%</span>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recommendation Detail Modal */}
      <AnimatePresence>
        {selectedRecommendation && selectedIngredients.length === 1 && (
          <RecommendationDetail
            recommendation={selectedRecommendation}
            baseIngredient={selectedIngredients[0]}
            onClose={() => setSelectedRecommendation(null)}
            onAdd={() => {
              handleRecommendationClick(selectedRecommendation.ingredient_name);
              setSelectedRecommendation(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
