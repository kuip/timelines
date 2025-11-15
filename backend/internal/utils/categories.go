package utils

import (
	"database/sql"
	"log"
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
var db *sql.DB

func init() {
	validCategories = make(map[string]CategoryMetadata)
}

// SetDB sets the database connection for loading categories
func SetDB(database *sql.DB) {
	db = database
	loadCategoriesFromDB()
}

func loadCategoriesFromDB() {
	if db == nil {
		log.Printf("Warning: Database not set, cannot load categories")
		populateDefaultCategories()
		return
	}

	// Query all categories from database
	rows, err := db.Query(`
		SELECT id, name, description, color, icon, parent_id
		FROM categories
		ORDER BY parent_id NULLS FIRST, id
	`)
	if err != nil {
		log.Printf("Warning: Could not load categories from database: %v", err)
		populateDefaultCategories()
		return
	}
	defer rows.Close()

	// Build tree structure
	parents := make(map[string]*CategoryGroup)
	children := make(map[string][]CategoryMetadata)

	for rows.Next() {
		var id, name, description, color string
		var icon sql.NullString
		var parentID sql.NullString

		if err := rows.Scan(&id, &name, &description, &color, &icon, &parentID); err != nil {
			log.Printf("Error scanning category row: %v", err)
			continue
		}

		iconStr := ""
		if icon.Valid {
			iconStr = icon.String
		}

		if !parentID.Valid {
			// This is a parent category
			parents[id] = &CategoryGroup{
				ID:          id,
				Name:        name,
				Description: description,
				Color:       color,
				Icon:        iconStr,
				Children:    []CategoryMetadata{},
			}
		} else {
			// This is a child category
			child := CategoryMetadata{
				ID:          id,
				Name:        name,
				Description: description,
				Color:       color,
				Icon:        iconStr,
			}
			children[parentID.String] = append(children[parentID.String], child)
			validCategories[id] = child
		}
	}

	// Build final tree
	categoriesTree = []CategoryGroup{}
	for _, parent := range parents {
		if childList, ok := children[parent.ID]; ok {
			parent.Children = childList
		}
		categoriesTree = append(categoriesTree, *parent)
	}

	log.Printf("Loaded %d parent categories and %d child categories from database", len(parents), len(validCategories))
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
