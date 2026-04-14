package models

// Molecule represents a specific chemical volatile with a known PubChem ID.
type Molecule struct {
	ID                int    `gorm:"primaryKey;autoIncrement" json:"id"`
	CommonName        string `json:"common_name"`
	PubchemID         int    `gorm:"unique" json:"pubchem_id"`
	FlavorDescription string `json:"flavor_description"`
}
