package models

// IngredientMolecule is the junction table capturing the concentration ratio
// of a generic molecule inside an ingredient.
type IngredientMolecule struct {
	IngredientID string `gorm:"type:uuid;primaryKey" json:"ingredient_id"`
	MoleculeID   int    `gorm:"primaryKey" json:"molecule_id"`
}
