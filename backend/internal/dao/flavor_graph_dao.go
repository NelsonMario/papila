package dao

import (
	"context"

	"flavonomics-backend/internal/models"

	"gorm.io/gorm"
)

type FlavorGraphDAO interface {
	SearchFlavors(ctx context.Context, query string, limit int) ([]models.FlavorSearchResult, error)
	GetHarmonyScore(ctx context.Context, noteA, noteB string) (float64, error)
	GetBestPairings(ctx context.Context, note string, limit int) ([]models.FlavorPairing, error)
	GetClashingPairings(ctx context.Context, note string, limit int) ([]models.FlavorPairing, error)
	FindBridges(ctx context.Context, noteA, noteB string, limit int) ([]string, error)
	GetStats(ctx context.Context) (models.GraphStats, error)
	FindPath(ctx context.Context, start, end string) ([]models.PathStep, error)
	FindPathsKSP(ctx context.Context, start, end string, k int) ([]models.PathStep, error)
	FindNearby(ctx context.Context, note string, maxCost float64) ([]models.FlavorDistance, error)
	// Ingredient-based flavor analysis
	SearchIngredients(ctx context.Context, query string, limit int) ([]models.IngredientSearchResult, error)
	GetIngredientFlavorProfiles(ctx context.Context, ingredient string) ([]models.FlavorProfile, error)
	GetSharedFlavorProfiles(ctx context.Context, ingredients []string) ([]models.SharedFlavorProfile, error)
	GetIngredientPairingScore(ctx context.Context, ingredientA, ingredientB string) (*models.PairingScore, error)
	GetRecommendedPairings(ctx context.Context, ingredient string, limit int) ([]models.RecommendedPairing, error)
	// Flavor wheel
	GetFlavorCategories(ctx context.Context) ([]models.FlavorCategory, error)
	GetFlavorWheelData(ctx context.Context) ([]models.FlavorWheelCategory, error)
	GetFlavorsByCategory(ctx context.Context, category string) ([]models.FlavorNodeWithCount, error)
	// Flavor pairings
	GetFlavorPairings(ctx context.Context, limit int) ([]models.FlavorPairing, error)
}

type flavorGraphDAO struct {
	db *gorm.DB
}

func NewFlavorGraphDAO(store *Store) FlavorGraphDAO {
	return &flavorGraphDAO{db: store.DB}
}

func (d *flavorGraphDAO) SearchFlavors(ctx context.Context, query string, limit int) ([]models.FlavorSearchResult, error) {
	var results []models.FlavorSearchResult
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM search_flavors(?, ?)", query, limit).
		Scan(&results).Error
	return results, err
}

func (d *flavorGraphDAO) GetHarmonyScore(ctx context.Context, noteA, noteB string) (float64, error) {
	var score float64
	err := d.db.WithContext(ctx).
		Raw("SELECT get_harmony_score(?, ?)", noteA, noteB).
		Scan(&score).Error
	return score, err
}

func (d *flavorGraphDAO) GetBestPairings(ctx context.Context, note string, limit int) ([]models.FlavorPairing, error) {
	var results []models.FlavorPairing
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM get_best_pairings(?, ?)", note, limit).
		Scan(&results).Error
	return results, err
}

func (d *flavorGraphDAO) GetClashingPairings(ctx context.Context, note string, limit int) ([]models.FlavorPairing, error) {
	var results []models.FlavorPairing
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM get_clashing_pairings(?, ?)", note, limit).
		Scan(&results).Error
	return results, err
}

func (d *flavorGraphDAO) FindBridges(ctx context.Context, noteA, noteB string, limit int) ([]string, error) {
	var bridges []string
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM find_flavor_bridges(?, ?, ?)", noteA, noteB, limit).
		Scan(&bridges).Error
	return bridges, err
}

func (d *flavorGraphDAO) GetStats(ctx context.Context) (models.GraphStats, error) {
	var stats models.GraphStats
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM get_graph_stats()").
		Scan(&stats).Error
	return stats, err
}

func (d *flavorGraphDAO) FindPath(ctx context.Context, start, end string) ([]models.PathStep, error) {
	var path []models.PathStep
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM find_flavor_path(?, ?)", start, end).
		Scan(&path).Error
	return path, err
}

func (d *flavorGraphDAO) FindPathsKSP(ctx context.Context, start, end string, k int) ([]models.PathStep, error) {
	var paths []models.PathStep
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM find_flavor_paths_ksp(?, ?, ?)", start, end, k).
		Scan(&paths).Error
	return paths, err
}

func (d *flavorGraphDAO) FindNearby(ctx context.Context, note string, maxCost float64) ([]models.FlavorDistance, error) {
	var results []models.FlavorDistance
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM find_flavors_nearby(?, ?)", note, maxCost).
		Scan(&results).Error
	return results, err
}

// Ingredient-based flavor analysis

func (d *flavorGraphDAO) SearchIngredients(ctx context.Context, query string, limit int) ([]models.IngredientSearchResult, error) {
	var results []models.IngredientSearchResult
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM search_ingredients(?, ?)", query, limit).
		Scan(&results).Error
	return results, err
}

func (d *flavorGraphDAO) GetIngredientFlavorProfiles(ctx context.Context, ingredient string) ([]models.FlavorProfile, error) {
	var results []models.FlavorProfile
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM get_ingredient_flavor_profiles(?)", ingredient).
		Scan(&results).Error
	return results, err
}

func (d *flavorGraphDAO) GetSharedFlavorProfiles(ctx context.Context, ingredients []string) ([]models.SharedFlavorProfile, error) {
	var results []models.SharedFlavorProfile
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM get_ingredients_shared_profiles(?::VARCHAR[])", "{"+joinStrings(ingredients)+"}").
		Scan(&results).Error
	return results, err
}

func (d *flavorGraphDAO) GetIngredientPairingScore(ctx context.Context, ingredientA, ingredientB string) (*models.PairingScore, error) {
	var result models.PairingScore
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM get_ingredient_pairing_score(?, ?)", ingredientA, ingredientB).
		Scan(&result).Error
	return &result, err
}

func (d *flavorGraphDAO) GetRecommendedPairings(ctx context.Context, ingredient string, limit int) ([]models.RecommendedPairing, error) {
	var results []models.RecommendedPairing
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM get_recommended_pairings(?, ?)", ingredient, limit).
		Scan(&results).Error
	return results, err
}

func joinStrings(strs []string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += ","
		}
		result += s
	}
	return result
}

func (d *flavorGraphDAO) GetFlavorCategories(ctx context.Context) ([]models.FlavorCategory, error) {
	var results []models.FlavorCategory
	err := d.db.WithContext(ctx).
		Order("id").
		Find(&results).Error
	return results, err
}

func (d *flavorGraphDAO) GetFlavorWheelData(ctx context.Context) ([]models.FlavorWheelCategory, error) {
	var results []models.FlavorWheelCategory
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM get_flavor_wheel_data()").
		Scan(&results).Error
	return results, err
}

func (d *flavorGraphDAO) GetFlavorsByCategory(ctx context.Context, category string) ([]models.FlavorNodeWithCount, error) {
	var results []models.FlavorNodeWithCount
	err := d.db.WithContext(ctx).
		Raw("SELECT * FROM get_flavors_by_category(?)", category).
		Scan(&results).Error
	return results, err
}

func (d *flavorGraphDAO) GetFlavorPairings(ctx context.Context, limit int) ([]models.FlavorPairing, error) {
	var results []models.FlavorPairing
	err := d.db.WithContext(ctx).
		Raw(`
			SELECT 
				fn1.name AS source_flavor,
				fn1.category AS source_category,
				fn2.name AS target_flavor,
				fn2.category AS target_category,
				ROUND(100 / GREATEST(fe.cost, 0.01))::INT AS co_occurrence,
				fe.harmony_score
			FROM flavor_edges fe
			JOIN flavor_nodes fn1 ON fn1.id = fe.source
			JOIN flavor_nodes fn2 ON fn2.id = fe.target
			WHERE fe.harmony_score > 0.2
			ORDER BY fe.harmony_score DESC, fe.cost ASC
			LIMIT ?
		`, limit).
		Scan(&results).Error
	return results, err
}
