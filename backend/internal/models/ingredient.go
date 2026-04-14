package models

import "time"

// Ingredient represents a food item or ingredient in the Flavonomics system.
type Ingredient struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string    `gorm:"unique;not null" json:"name"`
	Category  *string   `json:"category"`
	CreatedAt time.Time `gorm:"default:now()" json:"created_at"`

	// GORM many-to-many relationship
	Molecules []Molecule `gorm:"many2many:ingredient_molecules;" json:"molecules"`
}
