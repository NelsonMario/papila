package models

import "github.com/lib/pq"

// FlavorCategory represents a main flavor category in the flavor wheel
type FlavorCategory struct {
	ID          int    `gorm:"primaryKey" json:"id"`
	Name        string `gorm:"uniqueIndex;not null" json:"name"`
	Color       string `json:"color"`
	Description string `json:"description"`
}

func (FlavorCategory) TableName() string {
	return "flavor_categories"
}

// FlavorNode represents a node in the flavor graph
type FlavorNode struct {
	ID       int64  `gorm:"primaryKey" json:"id"`
	Name     string `gorm:"uniqueIndex;not null" json:"name"`
	Category string `gorm:"index" json:"category"`
}

func (FlavorNode) TableName() string {
	return "flavor_nodes"
}

// FlavorEdge represents an edge in the flavor graph
type FlavorEdge struct {
	ID           int64   `gorm:"primaryKey" json:"id"`
	Source       int64   `gorm:"index;not null" json:"source"`
	Target       int64   `gorm:"index;not null" json:"target"`
	Cost         float64 `gorm:"not null" json:"cost"`
	ReverseCost  float64 `gorm:"not null" json:"reverse_cost"`
	HarmonyScore float64 `gorm:"not null" json:"harmony_score"`
}

func (FlavorEdge) TableName() string {
	return "flavor_edges"
}

// FlavorSearchResult is a query result for autocomplete
type FlavorSearchResult struct {
	ID         int64   `gorm:"column:id" json:"id"`
	Name       string  `gorm:"column:name" json:"name"`
	Similarity float32 `gorm:"column:similarity" json:"similarity"`
}

// FlavorNoteHarmony is a query result for flavor note harmonies
type FlavorNoteHarmony struct {
	FlavorNote   string  `gorm:"column:flavor_note" json:"flavor_note"`
	HarmonyScore float64 `gorm:"column:harmony_score" json:"harmony_score"`
}

// GraphStats holds graph statistics
type GraphStats struct {
	NodeCount     int64 `gorm:"column:node_count" json:"node_count"`
	EdgeCount     int64 `gorm:"column:edge_count" json:"edge_count"`
	PositiveEdges int64 `gorm:"column:positive_edges" json:"positive_edges"`
	NegativeEdges int64 `gorm:"column:negative_edges" json:"negative_edges"`
}

// PathStep represents a step in a flavor path
type PathStep struct {
	PathID     int     `gorm:"column:path_id" json:"path_id,omitempty"`
	Seq        int     `gorm:"column:seq" json:"seq"`
	FlavorName string  `gorm:"column:flavor_name" json:"flavor_name"`
	Cost       float64 `gorm:"column:cost" json:"cost,omitempty"`
	AggCost    float64 `gorm:"column:agg_cost" json:"agg_cost"`
}

// FlavorDistance represents a flavor and its distance
type FlavorDistance struct {
	FlavorName string  `gorm:"column:flavor_name" json:"flavor_name"`
	Distance   float64 `gorm:"column:distance" json:"distance"`
}

// FlavorPairing represents a pairing between two flavors
type FlavorPairing struct {
	SourceFlavor   string  `gorm:"column:source_flavor" json:"source_flavor"`
	SourceCategory string  `gorm:"column:source_category" json:"source_category"`
	TargetFlavor   string  `gorm:"column:target_flavor" json:"target_flavor"`
	TargetCategory string  `gorm:"column:target_category" json:"target_category"`
	CoOccurrence   int     `gorm:"column:co_occurrence" json:"co_occurrence"`
	HarmonyScore   float64 `gorm:"column:harmony_score" json:"harmony_score"`
}

// PairAnalysis represents analysis of a flavor pair
type PairAnalysis struct {
	NoteA        string  `json:"note_a"`
	NoteB        string  `json:"note_b"`
	HarmonyScore float64 `json:"harmony_score"`
	Result       string  `json:"result"`
}

// IngredientSearchResult is a query result for ingredient autocomplete
type IngredientSearchResult struct {
	ID         string  `gorm:"column:id" json:"id"`
	Name       string  `gorm:"column:name" json:"name"`
	Category   string  `gorm:"column:category" json:"category"`
	Similarity float32 `gorm:"column:similarity" json:"similarity"`
}

// FlavorProfile represents a flavor note with molecule count for an ingredient
type FlavorProfile struct {
	FlavorNote    string `gorm:"column:flavor_note" json:"flavor_note"`
	MoleculeCount int64  `gorm:"column:molecule_count" json:"molecule_count"`
}

// SharedFlavorProfile represents flavor profiles shared across ingredients
type SharedFlavorProfile struct {
	FlavorNote        string         `gorm:"column:flavor_note" json:"flavor_note"`
	IngredientSources pq.StringArray `gorm:"column:ingredient_sources;type:varchar[]" json:"ingredient_sources"`
	TotalMolecules    int64          `gorm:"column:total_molecules" json:"total_molecules"`
	IngredientCount   int            `gorm:"column:ingredient_count" json:"ingredient_count"`
}

// PairingScore represents pairing analysis between two ingredients
type PairingScore struct {
	SharedFlavorNotes pq.StringArray `gorm:"column:shared_flavor_notes;type:varchar[]" json:"shared_flavor_notes"`
	SharedCount       int            `gorm:"column:shared_count" json:"shared_count"`
	PairingScore      float64        `gorm:"column:pairing_score" json:"pairing_score"`
}

// FlavorWheelCategory represents a category with its flavors for the wheel visualization
type FlavorWheelCategory struct {
	CategoryName  string `gorm:"column:category_name" json:"category_name"`
	CategoryColor string `gorm:"column:category_color" json:"category_color"`
	FlavorCount   int64  `gorm:"column:flavor_count" json:"flavor_count"`
	Flavors       string `gorm:"column:flavors" json:"flavors"` // JSON string
}

// FlavorNodeWithCount represents a flavor node with its connection count
type FlavorNodeWithCount struct {
	ID              int64  `gorm:"column:id" json:"id"`
	Name            string `gorm:"column:name" json:"name"`
	ConnectionCount int64  `gorm:"column:connection_count" json:"connection_count"`
}

// RecommendedPairing represents a recommended ingredient pairing
type RecommendedPairing struct {
	IngredientName     string         `gorm:"column:ingredient_name" json:"ingredient_name"`
	IngredientCategory string         `gorm:"column:ingredient_category" json:"ingredient_category"`
	SharedCount        int            `gorm:"column:shared_count" json:"shared_count"`
	SharedFlavors      pq.StringArray `gorm:"column:shared_flavors;type:varchar[]" json:"shared_flavors"`
	SharedMolecules    int            `gorm:"column:shared_molecules" json:"shared_molecules"`
}
