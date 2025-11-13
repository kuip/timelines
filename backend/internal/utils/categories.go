package utils

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
)

type CategoryMetadata struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	Icon        string `json:"icon,omitempty"`
}

type CategoryGroup struct {
	ID          string               `json:"id"`
	Name        string               `json:"name"`
	Description string               `json:"description"`
	Color       string               `json:"color"`
	Icon        string               `json:"icon,omitempty"`
	Children    []CategoryMetadata   `json:"children"`
}

type CategoriesConfig struct {
	Categories []CategoryGroup `json:"categories"`
}

var validCategories map[string]CategoryMetadata
var categoriesTree []CategoryGroup

func init() {
	validCategories = make(map[string]CategoryMetadata)
	loadCategories()
}

func loadCategories() {
	// Try to load from config file
	configPath := os.Getenv("CATEGORIES_CONFIG_PATH")
	if configPath == "" {
		// Default path relative to binary
		configPath = filepath.Join("config", "categories.json")
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		log.Printf("Warning: Could not load categories config from %s: %v", configPath, err)
		// Provide default categories in case file is not found
		populateDefaultCategories()
		return
	}

	var config CategoriesConfig
	if err := json.Unmarshal(data, &config); err != nil {
		log.Printf("Warning: Could not parse categories config: %v", err)
		populateDefaultCategories()
		return
	}

	// Store full tree structure
	categoriesTree = config.Categories

	// Flatten categories for validation lookups
	for _, group := range config.Categories {
		for _, child := range group.Children {
			validCategories[child.ID] = child
		}
	}
}

func populateDefaultCategories() {
	// Add some default categories if config file is not found
	defaultCategories := map[string]CategoryMetadata{
		"cosmic_formation": {ID: "cosmic_formation", Name: "Cosmic Formation"},
		"moon_landing": {ID: "moon_landing", Name: "Moon Exploration"},
		"medicine_breakthrough": {ID: "medicine_breakthrough", Name: "Medical Breakthroughs"},
		"revolution_uprising": {ID: "revolution_uprising", Name: "Revolutions & Uprisings"},
		"cinema_film": {ID: "cinema_film", Name: "Cinema & Film"},
		"space_exploration": {ID: "space_exploration", Name: "Space Programs"},
	}
	validCategories = defaultCategories
}

// IsValidCategory checks if a category ID is valid
func IsValidCategory(categoryID string) bool {
	_, exists := validCategories[categoryID]
	return exists
}

// GetCategoryColor returns the color for a category, or a default color if not found
func GetCategoryColor(categoryID string) string {
	if cat, exists := validCategories[categoryID]; exists {
		return cat.Color
	}
	return "#6b7280" // Default gray
}

// GetAllCategories returns all valid categories
func GetAllCategories() map[string]CategoryMetadata {
	return validCategories
}

// GetCategoriesTree returns the full hierarchical category structure
func GetCategoriesTree() []CategoryGroup {
	return categoriesTree
}
