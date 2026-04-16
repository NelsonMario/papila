package main

import (
	"log"
	"os"

	"flavonomics-backend/db"
	"flavonomics-backend/internal/dao"
	"flavonomics-backend/internal/engine"
	"flavonomics-backend/internal/handlers"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	db.Connect()

	// Initialize DAOs
	store := dao.NewStore(db.DB)
	ingredientDAO := dao.NewIngredientDAO(store)
	flavorGraphDAO := dao.NewFlavorGraphDAO(store)

	// Initialize Handlers
	pairingEngine := engine.NewPairingEngine(ingredientDAO)
	ingredientHandler := handlers.NewIngredientHandler(ingredientDAO, pairingEngine)
	graphHandler := handlers.NewGraphHandler(flavorGraphDAO)

	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	api := app.Group("/api/v1")

	// Ingredient API
	api.Get("/search", ingredientHandler.Search)
	api.Get("/ingredients/:id", ingredientHandler.GetDetails)
	api.Post("/analyze", ingredientHandler.AnalyzeStack)
	api.Post("/recommend", ingredientHandler.RecommendPairings)

	// Flavor Graph API
	graph := api.Group("/graph")
	graph.Get("/search", graphHandler.SearchFlavors)
	graph.Get("/stats", graphHandler.GetGraphStats)
	graph.Get("/harmony", graphHandler.GetHarmonyScore)
	graph.Get("/pairings/:note", graphHandler.GetFlavorPairings)
	graph.Get("/clashes/:note", graphHandler.GetFlavorClashes)
	graph.Get("/nearby/:note", graphHandler.FindFlavorsNearby)
	graph.Get("/path", graphHandler.FindFlavorPath)
	graph.Get("/paths", graphHandler.FindFlavorPathsKSP)
	graph.Get("/bridge", graphHandler.FindFlavorBridge)
	graph.Post("/analyze", graphHandler.AnalyzeFlavorCombination)

	// Ingredient-based Flavor Analysis API (for chord diagram)
	graph.Get("/ingredients/search", graphHandler.SearchIngredients)
	graph.Get("/ingredients/:ingredient/profiles", graphHandler.GetIngredientFlavorProfiles)
	graph.Get("/ingredients/:ingredient/recommendations", graphHandler.GetRecommendedPairings)
	graph.Get("/ingredients/pairing", graphHandler.GetIngredientPairingScore)
	graph.Post("/ingredients/shared-profiles", graphHandler.GetSharedFlavorProfiles)

	// Flavor Wheel API
	graph.Get("/wheel", graphHandler.GetFlavorWheelData)
	graph.Get("/wheel/pairings", graphHandler.GetFlavorPairingWheel)
	graph.Get("/categories", graphHandler.GetFlavorCategories)
	graph.Get("/categories/:category/flavors", graphHandler.GetFlavorsByCategory)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Flavor Engine listening on port %s\n", port)
	log.Fatal(app.Listen(":" + port))
}
