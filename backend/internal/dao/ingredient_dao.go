package dao

import (
	"context"

	"flavonomics-backend/internal/dto"
	"flavonomics-backend/internal/models"
)

type IngredientDAO interface {
	Search(ctx context.Context, query string, limit int) ([]dto.IngredientResponse, error)
	FetchAllWithMolecules(ctx context.Context) ([]models.Ingredient, error)
	GetByID(ctx context.Context, id string) (*models.Ingredient, error)
}

type ingredientDAO struct {
	store *Store
}

func NewIngredientDAO(store *Store) IngredientDAO {
	return &ingredientDAO{store: store}
}

func (d *ingredientDAO) Search(ctx context.Context, query string, limit int) ([]dto.IngredientResponse, error) {
	var ingredients []dto.IngredientResponse

	err := d.store.DB.WithContext(ctx).
		Model(&models.Ingredient{}).
		Select("id, name, category").
		Where("name ILIKE ?", "%"+query+"%").
		Limit(limit).
		Find(&ingredients).Error

	return ingredients, err
}

func (d *ingredientDAO) FetchAllWithMolecules(ctx context.Context) ([]models.Ingredient, error) {
	var results []models.Ingredient
	err := d.store.DB.WithContext(ctx).Preload("Molecules").Find(&results).Error
	return results, err
}

func (d *ingredientDAO) GetByID(ctx context.Context, id string) (*models.Ingredient, error) {
	var ingredient models.Ingredient
	err := d.store.DB.WithContext(ctx).Preload("Molecules").First(&ingredient, "id = ?", id).Error
	return &ingredient, err
}
