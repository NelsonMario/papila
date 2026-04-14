package dao

import "gorm.io/gorm"

// Store holds our database connection
type Store struct {
	DB *gorm.DB
}

func NewStore(db *gorm.DB) *Store {
	return &Store{DB: db}
}
