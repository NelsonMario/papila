package engine

import (
	"context"
	"sort"

	"flavonomics-backend/internal/dao"
	"flavonomics-backend/internal/dto"
	"flavonomics-backend/internal/models"
)

type PairingEngine struct {
	ingredientDAO dao.IngredientDAO
}

func NewPairingEngine(ingredientDAO dao.IngredientDAO) *PairingEngine {
	return &PairingEngine{
		ingredientDAO: ingredientDAO,
	}
}

// CalculatePairings computes the true chemical overlap (Jaccard Index)
func (e *PairingEngine) CalculatePairings(ctx context.Context, stackIDs []string) ([]dto.PairingResponse, error) {
	stackSet := make(map[string]bool)
	for _, id := range stackIDs {
		stackSet[id] = true
	}

	// 1. Fetch all ingredients with their molecules using DAO
	allIngredients, err := e.ingredientDAO.FetchAllWithMolecules(ctx)
	if err != nil {
		return nil, err
	}

	var stackMolecules = make(map[int]bool)
	var candidates []models.Ingredient

	// 2. Separate into Stacks vs Candidates in memory
	for _, ing := range allIngredients {
		if stackSet[ing.ID] {
			for _, m := range ing.Molecules {
				stackMolecules[m.ID] = true
			}
		} else {
			if len(ing.Molecules) > 0 {
				candidates = append(candidates, ing)
			}
		}
	}

	if len(stackMolecules) == 0 {
		return []dto.PairingResponse{}, nil
	}

	// 3. Jaccard Array logic
	var results []dto.PairingResponse
	for _, cand := range candidates {
		intersectCount := 0
		unionSet := make(map[int]bool)
		for mID := range stackMolecules {
			unionSet[mID] = true
		}

		for _, m := range cand.Molecules {
			unionSet[m.ID] = true
			if stackMolecules[m.ID] {
				intersectCount++
			}
		}

		if intersectCount > 0 {
			unionCount := len(unionSet)
			score := (float64(intersectCount) / float64(unionCount)) * 100.0

			results = append(results, dto.PairingResponse{
				IngredientID:   cand.ID,
				IngredientName: cand.Name,
				Category:       cand.Category,
				SharedCount:    intersectCount,
				JaccardScore:   score,
			})
		}
	}

	// 4. Sort descending
	sort.Slice(results, func(i, j int) bool {
		return results[i].JaccardScore > results[j].JaccardScore
	})

	if len(results) > 50 {
		results = results[:50]
	}

	return results, nil
}
