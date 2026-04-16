const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Ingredient APIs
export const searchIngredients = (query: string) =>
  fetchAPI<{ data: Ingredient[] }>(`/search?q=${encodeURIComponent(query)}`);

export const getIngredientDetails = (id: string) =>
  fetchAPI<IngredientDetail>(`/ingredients/${id}`);

export const recommendPairings = (ingredients: string[], limit = 10) =>
  fetchAPI<{ recommendations: PairingResult[] }>('/recommend', {
    method: 'POST',
    body: JSON.stringify({ ingredients, limit }),
  });

// Flavor Graph APIs
export const searchFlavors = (query: string, limit = 10) =>
  fetchAPI<{ results: FlavorSearchResult[] }>(`/graph/search?q=${encodeURIComponent(query)}&limit=${limit}`);

export const getGraphStats = () =>
  fetchAPI<{ stats: GraphStats }>('/graph/stats');

export const getHarmonyScore = (a: string, b: string) =>
  fetchAPI<HarmonyResult>(`/graph/harmony?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);

export const getBestPairings = (note: string, limit = 10) =>
  fetchAPI<{ pairings: FlavorPairing[] }>(`/graph/pairings/${encodeURIComponent(note)}?limit=${limit}`);

export const getClashingPairings = (note: string, limit = 10) =>
  fetchAPI<{ clashes: FlavorPairing[] }>(`/graph/clashes/${encodeURIComponent(note)}?limit=${limit}`);

export const findNearbyFlavors = (note: string, distance = 2.0) =>
  fetchAPI<{ nearby: FlavorDistance[] }>(`/graph/nearby/${encodeURIComponent(note)}?distance=${distance}`);

export const findFlavorPath = (start: string, end: string) =>
  fetchAPI<{ path: PathStep[]; total_cost: number }>(`/graph/path?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);

export const findFlavorBridges = (a: string, b: string, limit = 5) =>
  fetchAPI<{ bridges: string[] }>(`/graph/bridge?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&limit=${limit}`);

export const analyzeFlavorCombination = (notes: string[]) =>
  fetchAPI<FlavorAnalysis>('/graph/analyze', {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });

// Ingredient-based Flavor Analysis APIs (for chord diagram)
export const searchIngredientsForProfiles = (query: string, limit = 10) =>
  fetchAPI<{ results: IngredientSearchResult[] }>(`/graph/ingredients/search?q=${encodeURIComponent(query)}&limit=${limit}`);

export const getIngredientFlavorProfiles = (ingredient: string) =>
  fetchAPI<{ profiles: FlavorProfile[] }>(`/graph/ingredients/${encodeURIComponent(ingredient)}/profiles`);

export const getSharedFlavorProfiles = (ingredients: string[]) =>
  fetchAPI<{ profiles: SharedFlavorProfile[] }>('/graph/ingredients/shared-profiles', {
    method: 'POST',
    body: JSON.stringify({ ingredients }),
  });

export const getIngredientPairingScore = (a: string, b: string) =>
  fetchAPI<IngredientPairingResult>(`/graph/ingredients/pairing?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);

export const getRecommendedPairings = (ingredient: string, limit = 10) =>
  fetchAPI<{ pairings: RecommendedPairing[] }>(`/graph/ingredients/${encodeURIComponent(ingredient)}/recommendations?limit=${limit}`);

// Flavor Wheel APIs
export const getFlavorWheelData = () =>
  fetchAPI<{ wheel: FlavorWheelCategory[] }>('/graph/wheel');

export const getFlavorPairings = (limit = 50) =>
  fetchAPI<{ pairings: FlavorPairing[] }>(`/graph/wheel/pairings?limit=${limit}`);

export const getFlavorCategories = () =>
  fetchAPI<{ categories: FlavorCategory[] }>('/graph/categories');

export const getFlavorsByCategory = (category: string) =>
  fetchAPI<{ flavors: FlavorNodeWithCount[] }>(`/graph/categories/${encodeURIComponent(category)}/flavors`);

// Types
export interface FlavorSearchResult {
  id: number;
  name: string;
  similarity: number;
}

export interface IngredientSearchResult {
  id: string;
  name: string;
  category: string;
  similarity: number;
}

export interface Ingredient {
  id: string;
  name: string;
  category: string;
}

export interface IngredientDetail extends Ingredient {
  molecules: { name: string; flavor_description: string }[];
}

export interface PairingResult {
  ingredient_id: string;
  ingredient_name: string;
  category: string;
  shared_count: number;
  jaccard_score: number;
}

export interface GraphStats {
  node_count: number;
  edge_count: number;
  positive_edges: number;
  negative_edges: number;
}

export interface FlavorPairing {
  flavor_note: string;
  harmony_score: number;
}

export interface FlavorDistance {
  flavor_name: string;
  distance: number;
}

export interface PathStep {
  seq: number;
  flavor_name: string;
  agg_cost: number;
}

export interface HarmonyResult {
  note_a: string;
  note_b: string;
  harmony_score: number;
  result: 'harmonious' | 'clashing' | 'neutral' | 'unknown';
}

export interface FlavorAnalysis {
  notes: string[];
  pair_analyses: {
    note_a: string;
    note_b: string;
    harmony_score: number;
    result: string;
  }[];
  average_score: number;
  clash_count: number;
  overall_result: string;
}

export interface FlavorProfile {
  flavor_note: string;
  molecule_count: number;
}

export interface SharedFlavorProfile {
  flavor_note: string;
  ingredient_sources: string[];
  total_molecules: number;
  ingredient_count: number;
}

export interface IngredientPairingResult {
  ingredient_a: string;
  ingredient_b: string;
  shared_flavor_notes: string[];
  shared_count: number;
  pairing_score: number;
  result: string;
}

export interface FlavorCategory {
  id: number;
  name: string;
  color: string;
  description: string;
}

export interface FlavorWheelCategory {
  category_name: string;
  category_color: string;
  flavor_count: number;
  flavors: string; // JSON string of flavors
}

export interface FlavorNodeWithCount {
  id: number;
  name: string;
  connection_count: number;
}

export interface RecommendedPairing {
  ingredient_name: string;
  ingredient_category: string;
  shared_count: number;
  shared_flavors: string[];
  shared_molecules: number;
}

export interface FlavorPairing {
  source_flavor: string;
  source_category: string;
  target_flavor: string;
  target_category: string;
  co_occurrence: number;
  harmony_score: number;
}
