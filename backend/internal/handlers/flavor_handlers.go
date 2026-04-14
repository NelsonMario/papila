package handlers

import (
	"flavonomics-backend/internal/dao"
	"flavonomics-backend/internal/models"

	"github.com/gofiber/fiber/v2"
)

type GraphHandler struct {
	flavorDAO dao.FlavorGraphDAO
}

func NewGraphHandler(flavorDAO dao.FlavorGraphDAO) *GraphHandler {
	return &GraphHandler{flavorDAO: flavorDAO}
}

func (h *GraphHandler) SearchFlavors(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" || len(query) < 1 {
		return c.JSON(fiber.Map{"status": "success", "results": []interface{}{}})
	}

	results, err := h.flavorDAO.SearchFlavors(c.Context(), query, c.QueryInt("limit", 10))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "results": results})
}

// SearchIngredients searches ingredients for the chord diagram
func (h *GraphHandler) SearchIngredients(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" || len(query) < 1 {
		return c.JSON(fiber.Map{"status": "success", "results": []interface{}{}})
	}

	results, err := h.flavorDAO.SearchIngredients(c.Context(), query, c.QueryInt("limit", 10))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "results": results})
}

func (h *GraphHandler) GetFlavorPairings(c *fiber.Ctx) error {
	note := c.Params("note")
	if note == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Flavor note is required"})
	}

	pairings, err := h.flavorDAO.GetBestPairings(c.Context(), note, c.QueryInt("limit", 10))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "note": note, "pairings": pairings})
}

func (h *GraphHandler) GetFlavorClashes(c *fiber.Ctx) error {
	note := c.Params("note")
	if note == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Flavor note is required"})
	}

	clashes, err := h.flavorDAO.GetClashingPairings(c.Context(), note, c.QueryInt("limit", 10))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "note": note, "clashes": clashes})
}

func (h *GraphHandler) GetHarmonyScore(c *fiber.Ctx) error {
	noteA, noteB := c.Query("a"), c.Query("b")
	if noteA == "" || noteB == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Both a and b are required"})
	}

	score, err := h.flavorDAO.GetHarmonyScore(c.Context(), noteA, noteB)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	result := "unknown"
	if score > 0.3 {
		result = "harmonious"
	} else if score < -0.3 {
		result = "clashing"
	} else if score != 0 {
		result = "neutral"
	}

	return c.JSON(fiber.Map{
		"status": "success", "note_a": noteA, "note_b": noteB,
		"harmony_score": score, "result": result,
	})
}

func (h *GraphHandler) GetGraphStats(c *fiber.Ctx) error {
	stats, err := h.flavorDAO.GetStats(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "stats": stats})
}

func (h *GraphHandler) FindFlavorBridge(c *fiber.Ctx) error {
	noteA, noteB := c.Query("a"), c.Query("b")
	if noteA == "" || noteB == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Both a and b are required"})
	}

	bridges, err := h.flavorDAO.FindBridges(c.Context(), noteA, noteB, c.QueryInt("limit", 5))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "note_a": noteA, "note_b": noteB, "bridges": bridges})
}

func (h *GraphHandler) FindFlavorPath(c *fiber.Ctx) error {
	start, end := c.Query("start"), c.Query("end")
	if start == "" || end == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Both start and end are required"})
	}

	path, err := h.flavorDAO.FindPath(c.Context(), start, end)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var totalCost float64
	if len(path) > 0 {
		totalCost = path[len(path)-1].AggCost
	}

	return c.JSON(fiber.Map{"status": "success", "start": start, "end": end, "path": path, "total_cost": totalCost})
}

func (h *GraphHandler) FindFlavorPathsKSP(c *fiber.Ctx) error {
	start, end := c.Query("start"), c.Query("end")
	if start == "" || end == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Both start and end are required"})
	}

	paths, err := h.flavorDAO.FindPathsKSP(c.Context(), start, end, c.QueryInt("k", 3))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "start": start, "end": end, "paths": paths})
}

func (h *GraphHandler) FindFlavorsNearby(c *fiber.Ctx) error {
	note := c.Params("note")
	if note == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Flavor note is required"})
	}

	nearby, err := h.flavorDAO.FindNearby(c.Context(), note, c.QueryFloat("distance", 2.0))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "note": note, "nearby": nearby})
}

func (h *GraphHandler) AnalyzeFlavorCombination(c *fiber.Ctx) error {
	var req struct {
		Notes []string `json:"notes"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if len(req.Notes) < 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "At least 2 flavor notes required"})
	}

	var analyses []models.PairAnalysis
	var totalScore float64
	var clashCount, knownPairs int

	for i := 0; i < len(req.Notes); i++ {
		for j := i + 1; j < len(req.Notes); j++ {
			score, _ := h.flavorDAO.GetHarmonyScore(c.Context(), req.Notes[i], req.Notes[j])

			result := "unknown"
			if score != 0 {
				knownPairs++
				totalScore += score
				if score > 0.3 {
					result = "harmonious"
				} else if score < -0.3 {
					result = "clashing"
					clashCount++
				} else {
					result = "neutral"
				}
			}

			analyses = append(analyses, models.PairAnalysis{
				NoteA: req.Notes[i], NoteB: req.Notes[j],
				HarmonyScore: score, Result: result,
			})
		}
	}

	var avgScore float64
	if knownPairs > 0 {
		avgScore = totalScore / float64(knownPairs)
	}

	overallResult := "unknown"
	if knownPairs > 0 {
		if avgScore > 0.3 {
			overallResult = "harmonious"
		} else if avgScore < -0.2 || clashCount > 0 {
			overallResult = "problematic"
		} else {
			overallResult = "balanced"
		}
	}

	return c.JSON(fiber.Map{
		"status": "success", "notes": req.Notes, "pair_analyses": analyses,
		"average_score": avgScore, "clash_count": clashCount, "overall_result": overallResult,
	})
}

// GetIngredientFlavorProfiles returns flavor profiles for an ingredient
func (h *GraphHandler) GetIngredientFlavorProfiles(c *fiber.Ctx) error {
	ingredient := c.Params("ingredient")
	if ingredient == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ingredient is required"})
	}

	profiles, err := h.flavorDAO.GetIngredientFlavorProfiles(c.Context(), ingredient)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "ingredient": ingredient, "profiles": profiles})
}

// GetSharedFlavorProfiles returns shared flavor profiles across ingredients (for chord diagram)
func (h *GraphHandler) GetSharedFlavorProfiles(c *fiber.Ctx) error {
	var req struct {
		Ingredients []string `json:"ingredients"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if len(req.Ingredients) < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "At least 1 ingredient required"})
	}

	profiles, err := h.flavorDAO.GetSharedFlavorProfiles(c.Context(), req.Ingredients)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "ingredients": req.Ingredients, "profiles": profiles})
}

// GetIngredientPairingScore returns pairing analysis between two ingredients
// Uses Jaccard similarity (0-1 scale) to determine pairing quality:
// - Excellent: >= 0.5 (50%+ flavor overlap)
// - Good: >= 0.3 (30-50% overlap)
// - Moderate: >= 0.15 (15-30% overlap)
// - Weak: > 0 (some overlap)
// - Poor: 0 (no shared flavors)
func (h *GraphHandler) GetIngredientPairingScore(c *fiber.Ctx) error {
	ingredientA, ingredientB := c.Query("a"), c.Query("b")
	if ingredientA == "" || ingredientB == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Both a and b are required"})
	}

	score, err := h.flavorDAO.GetIngredientPairingScore(c.Context(), ingredientA, ingredientB)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	result := "poor"
	if score.PairingScore >= 0.5 {
		result = "excellent"
	} else if score.PairingScore >= 0.3 {
		result = "good"
	} else if score.PairingScore >= 0.15 {
		result = "moderate"
	} else if score.PairingScore > 0 {
		result = "weak"
	}

	return c.JSON(fiber.Map{
		"status":              "success",
		"ingredient_a":        ingredientA,
		"ingredient_b":        ingredientB,
		"shared_flavor_notes": score.SharedFlavorNotes,
		"shared_count":        score.SharedCount,
		"pairing_score":       score.PairingScore,
		"result":              result,
	})
}

// GetRecommendedPairings returns recommended ingredient pairings
func (h *GraphHandler) GetRecommendedPairings(c *fiber.Ctx) error {
	ingredient := c.Params("ingredient")
	if ingredient == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ingredient is required"})
	}

	limit := c.QueryInt("limit", 10)
	if limit > 20 {
		limit = 20
	}

	pairings, err := h.flavorDAO.GetRecommendedPairings(c.Context(), ingredient, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Add result classification based on pairing score
	type pairingWithResult struct {
		IngredientName     string  `json:"ingredient_name"`
		IngredientCategory string  `json:"ingredient_category"`
		SharedCount        int     `json:"shared_count"`
		PairingScore       float64 `json:"pairing_score"`
		Result             string  `json:"result"`
	}

	results := make([]pairingWithResult, len(pairings))
	for i, p := range pairings {
		result := "weak"
		if p.PairingScore >= 0.5 {
			result = "excellent"
		} else if p.PairingScore >= 0.3 {
			result = "good"
		} else if p.PairingScore >= 0.15 {
			result = "moderate"
		}
		results[i] = pairingWithResult{
			IngredientName:     p.IngredientName,
			IngredientCategory: p.IngredientCategory,
			SharedCount:        p.SharedCount,
			PairingScore:       p.PairingScore,
			Result:             result,
		}
	}

	return c.JSON(fiber.Map{
		"status":      "success",
		"ingredient":  ingredient,
		"pairings":    results,
	})
}

// GetFlavorCategories returns all flavor categories
func (h *GraphHandler) GetFlavorCategories(c *fiber.Ctx) error {
	categories, err := h.flavorDAO.GetFlavorCategories(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "categories": categories})
}

// GetFlavorWheelData returns data for the flavor wheel visualization
func (h *GraphHandler) GetFlavorWheelData(c *fiber.Ctx) error {
	data, err := h.flavorDAO.GetFlavorWheelData(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "wheel": data})
}

// GetFlavorsByCategory returns all flavors in a category
func (h *GraphHandler) GetFlavorsByCategory(c *fiber.Ctx) error {
	category := c.Params("category")
	if category == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Category is required"})
	}

	flavors, err := h.flavorDAO.GetFlavorsByCategory(c.Context(), category)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "category": category, "flavors": flavors})
}
