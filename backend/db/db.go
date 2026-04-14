package db

import (
	_ "embed"
	"fmt"
	"log"
	"os"

	"flavonomics-backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

//go:embed migrations/001_flavor_graph.sql
var flavorGraphMigration string

var DB *gorm.DB

func Connect() {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")

	if host == "" || user == "" || password == "" {
		log.Fatalf("ERROR: Database configuration is incomplete. Required: DB_HOST, DB_USER, DB_PASSWORD")
	}

	if port == "" {
		port = "5432"
	}
	if dbname == "" {
		dbname = "postgres"
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=require",
		host, port, user, password, dbname)

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true,
	}), &gorm.Config{})

	if err != nil {
		log.Fatalf("Failed to connect to postgres via GORM: %v", err)
	}

	DB = db

	// AutoMigrate the models to ensure consistency without dropping data
	err = DB.AutoMigrate(
		&models.Ingredient{},
		&models.Molecule{},
		&models.IngredientMolecule{},
		&models.FlavorCategory{},
		&models.FlavorNode{},
		&models.FlavorEdge{},
	)
	if err != nil {
		log.Printf("AutoMigrate error (can be ignored if tables match schema): %v", err)
	}

	log.Println("✅ Connected to Supabase PostgreSQL (GORM)!")

	runMigrations()
}

func runMigrations() {
	log.Println("📦 Running SQL migrations...")
	if err := DB.Exec(flavorGraphMigration).Error; err != nil {
		log.Printf("Migration warning (may already exist): %v", err)
	}
	log.Println("✅ Migrations complete!")
}
