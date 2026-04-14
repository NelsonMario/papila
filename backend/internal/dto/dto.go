package dto

// AnalyzeRequest represents the body for pairing computation
type AnalyzeRequest struct {
	Stack []string `json:"stack"` // Array of ingredient UUIDs
}

// RecommendationRequest represents the body for user-friendly recommendations
type RecommendationRequest struct {
	Ingredients []string `json:"ingredients"` // Array of ingredient UUIDs
	Limit       int      `json:"limit"`       // Optional limit, defaults to 10
}

type IngredientResponse struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Category *string `json:"category"`
}

// MoleculeResponse represents flavor notes of a molecule
type MoleculeResponse struct {
	Name              string `json:"name"`
	FlavorDescription string `json:"flavor_description"`
}

// IngredientDetailResponse provides deep info including molecules
type IngredientDetailResponse struct {
	ID        string             `json:"id"`
	Name      string             `json:"name"`
	Category  *string            `json:"category"`
	Molecules []MoleculeResponse `json:"molecules"`
}

// PairingResponse represents the result of a pairing calculation
type PairingResponse struct {
	IngredientID   string  `json:"ingredient_id"`
	IngredientName string  `json:"ingredient_name"`
	Category       *string `json:"category"`
	SharedCount    int     `json:"shared_count"`
	JaccardScore   float64 `json:"jaccard_score"`
}
