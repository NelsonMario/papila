package handlers

import (
	"flavonomics-backend/internal/dao"
	"flavonomics-backend/internal/dto"
	"flavonomics-backend/internal/engine"

	"github.com/gofiber/fiber/v2"
)

type IngredientHandler struct {
	ingredientDAO dao.IngredientDAO
	engine        *engine.PairingEngine
}

func NewIngredientHandler(ingredientDAO dao.IngredientDAO, engine *engine.PairingEngine) *IngredientHandler {
	return &IngredientHandler{
		ingredientDAO: ingredientDAO,
		engine:        engine,
	}
}

func (h *IngredientHandler) Search(c *fiber.Ctx) error {
	ingredients, err := h.ingredientDAO.Search(c.Context(), c.Query("q", ""), 30)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": ingredients})
}

func (h *IngredientHandler) GetDetails(c *fiber.Ctx) error {
	ing, err := h.ingredientDAO.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Ingredient not found"})
	}

	var molecules []dto.MoleculeResponse
	for _, m := range ing.Molecules {
		molecules = append(molecules, dto.MoleculeResponse{
			Name:              m.CommonName,
			FlavorDescription: m.FlavorDescription,
		})
	}

	return c.JSON(dto.IngredientDetailResponse{
		ID:        ing.ID,
		Name:      ing.Name,
		Category:  ing.Category,
		Molecules: molecules,
	})
}

func (h *IngredientHandler) AnalyzeStack(c *fiber.Ctx) error {
	var req dto.AnalyzeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if len(req.Stack) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Stack cannot be empty"})
	}

	results, err := h.engine.CalculatePairings(c.Context(), req.Stack)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "data": results})
}

func (h *IngredientHandler) RecommendPairings(c *fiber.Ctx) error {
	var req dto.RecommendationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if len(req.Ingredients) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ingredients cannot be empty"})
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}

	results, err := h.engine.CalculatePairings(c.Context(), req.Ingredients)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if len(results) > req.Limit {
		results = results[:req.Limit]
	}

	return c.JSON(fiber.Map{
		"status":          "success",
		"recommendations": results,
	})
}
