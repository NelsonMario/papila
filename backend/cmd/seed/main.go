package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"flavonomics-backend/db"
	"flavonomics-backend/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	fmt.Println("🚀 Starting Database Seeder...")
	// Load .env from project root (run from backend/ directory)
	godotenv.Load("../.env")
	db.Connect()

	start := time.Now()

	seedIngredients()
	seedFlavorGraph()

	fmt.Printf("\n✅ All Seeding Complete! Took %v\n", time.Since(start))
}

func seedIngredients() {
	fmt.Println("\n📦 Seeding Ingredients & Molecules...")

	// Check if already seeded
	var count int64
	db.DB.Model(&models.Ingredient{}).Count(&count)
	if count > 0 {
		fmt.Printf("   Already seeded (%d ingredients), skipping\n", count)
		return
	}

	db.DB.Exec("TRUNCATE TABLE ingredient_molecules CASCADE")
	db.DB.Exec("TRUNCATE TABLE ingredients CASCADE")
	db.DB.Exec("TRUNCATE TABLE molecules CASCADE")

	// Parse Molecules
	molFile, err := os.Open("internal/dataset/molecules.csv")
	if err != nil {
		log.Fatalf("❌ Could not open molecules.csv: %v", err)
	}
	defer molFile.Close()

	molReader := csv.NewReader(molFile)
	molReader.LazyQuotes = true
	molRecords, _ := molReader.ReadAll()

	var molecules []models.Molecule
	for i, record := range molRecords {
		if i == 0 || len(record) < 4 {
			continue
		}
		pubId, err := strconv.Atoi(record[1])
		if err != nil {
			continue
		}

		desc := strings.Trim(record[3], "{}'")
		desc = strings.ReplaceAll(desc, "'", "")

		molecules = append(molecules, models.Molecule{
			CommonName:        record[2],
			PubchemID:         pubId,
			FlavorDescription: desc,
		})
	}

	fmt.Printf("   Inserting %d molecules...\n", len(molecules))
	db.DB.CreateInBatches(molecules, 500)

	// Load molecules into map
	var savedMolecules []models.Molecule
	db.DB.Find(&savedMolecules)
	pubchemToID := make(map[int]models.Molecule)
	for _, m := range savedMolecules {
		pubchemToID[m.PubchemID] = m
	}

	// Parse Ingredients
	ingFile, err := os.Open("internal/dataset/flavordb.csv")
	if err != nil {
		log.Fatalf("❌ Could not open flavordb.csv: %v", err)
	}
	defer ingFile.Close()

	ingReader := csv.NewReader(ingFile)
	ingReader.LazyQuotes = true
	ingRecords, _ := ingReader.ReadAll()

	var ingredients []models.Ingredient
	for i, record := range ingRecords {
		if i == 0 || len(record) < 7 {
			continue
		}

		name := record[2]
		category := record[5]
		if category == "" {
			category = "unknown"
		}

		var connectedMolecules []models.Molecule
		molStr := strings.Trim(record[6], "{} ")
		if molStr != "" {
			for _, p := range strings.Split(molStr, ",") {
				if pub, err := strconv.Atoi(strings.TrimSpace(p)); err == nil {
					if mol, exists := pubchemToID[pub]; exists {
						connectedMolecules = append(connectedMolecules, mol)
					}
				}
			}
		}

		ingredients = append(ingredients, models.Ingredient{
			Name:      name,
			Category:  &category,
			Molecules: connectedMolecules,
		})
	}

	fmt.Printf("   Inserting %d ingredients...\n", len(ingredients))
	db.DB.CreateInBatches(ingredients, 50)
}

func seedFlavorGraph() {
	fmt.Println("\n📊 Seeding Flavor Graph...")

	// Check if already seeded
	var count int64
	db.DB.Model(&models.FlavorEdge{}).Count(&count)
	if count > 0 {
		fmt.Printf("   Already seeded (%d edges), skipping\n", count)
		return
	}

	// Parse flavor_categories.csv first
	catFile, err := os.Open("internal/dataset/flavor_categories.csv")
	if err != nil {
		log.Fatalf("❌ Could not open flavor_categories.csv: %v", err)
	}
	defer catFile.Close()

	catReader := csv.NewReader(catFile)
	catRecords, _ := catReader.ReadAll()

	var categories []models.FlavorCategory
	for i, record := range catRecords {
		if i == 0 || len(record) < 4 {
			continue
		}
		id, _ := strconv.Atoi(record[0])
		categories = append(categories, models.FlavorCategory{
			ID:          id,
			Name:        strings.TrimSpace(record[1]),
			Color:       strings.TrimSpace(record[2]),
			Description: strings.TrimSpace(record[3]),
		})
	}

	fmt.Printf("   Creating %d flavor categories...\n", len(categories))
	db.DB.CreateInBatches(categories, 20)

	// Parse flavor_nodes.csv
	nodesFile, err := os.Open("internal/dataset/flavor_nodes.csv")
	if err != nil {
		log.Fatalf("❌ Could not open flavor_nodes.csv: %v", err)
	}
	defer nodesFile.Close()

	nodesReader := csv.NewReader(nodesFile)
	nodesRecords, _ := nodesReader.ReadAll()

	var nodes []models.FlavorNode
	for i, record := range nodesRecords {
		if i == 0 || len(record) < 3 {
			continue
		}
		id, _ := strconv.ParseInt(record[0], 10, 64)
		name := strings.TrimSpace(record[1])
		category := strings.TrimSpace(record[2])

		nodes = append(nodes, models.FlavorNode{
			ID:       id,
			Name:     name,
			Category: category,
		})
	}

	fmt.Printf("   Creating %d flavor nodes...\n", len(nodes))
	db.DB.CreateInBatches(nodes, 100)

	// Parse flavor_edges.csv
	edgesFile, err := os.Open("internal/dataset/flavor_edges.csv")
	if err != nil {
		log.Fatalf("❌ Could not open flavor_edges.csv: %v", err)
	}
	defer edgesFile.Close()

	edgesReader := csv.NewReader(edgesFile)
	edgesRecords, _ := edgesReader.ReadAll()

	var edges []models.FlavorEdge
	for i, record := range edgesRecords {
		if i == 0 || len(record) < 5 {
			continue
		}
		id, _ := strconv.ParseInt(record[0], 10, 64)
		source, _ := strconv.ParseInt(record[1], 10, 64)
		target, _ := strconv.ParseInt(record[2], 10, 64)
		harmonyScore, _ := strconv.ParseFloat(record[4], 64)

		cost := 1.0 - harmonyScore
		if cost < 0.01 {
			cost = 0.01
		}

		edges = append(edges, models.FlavorEdge{
			ID:           id,
			Source:       source,
			Target:       target,
			Cost:         cost,
			ReverseCost:  cost,
			HarmonyScore: harmonyScore,
		})
	}

	fmt.Printf("   Creating %d flavor edges...\n", len(edges))
	db.DB.CreateInBatches(edges, 500)
}
