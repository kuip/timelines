package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

// DB wraps the database connection
type DB struct {
	*sql.DB
}

// Config holds database configuration
type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// NewFromURL creates a new database connection from a DATABASE_URL string
func NewFromURL(databaseURL string) (*DB, error) {
	log.Printf("Connecting to database using DATABASE_URL...")

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	// Verify which database we're actually connected to
	var currentDB string
	err = db.QueryRow("SELECT current_database()").Scan(&currentDB)
	if err != nil {
		return nil, fmt.Errorf("error checking database: %w", err)
	}
	log.Printf("Successfully connected to database: %s", currentDB)

	// List all tables visible to this connection
	rows, err := db.Query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
	if err != nil {
		log.Printf("Warning: Could not query pg_tables: %v", err)
	} else {
		defer rows.Close()
		var tables []string
		for rows.Next() {
			var table string
			if err := rows.Scan(&table); err == nil {
				tables = append(tables, table)
			}
		}
		log.Printf("Tables visible in public schema: %v", tables)
	}

	return &DB{db}, nil
}

// New creates a new database connection
func New(config Config) (*DB, error) {
	// Build connection string ensuring dbname is properly quoted if needed
	var connStr string
	if config.Password != "" {
		connStr = fmt.Sprintf(
			"postgresql://%s:%s@%s:%s/%s?sslmode=%s",
			config.User,
			config.Password,
			config.Host,
			config.Port,
			config.DBName,
			config.SSLMode,
		)
	} else {
		connStr = fmt.Sprintf(
			"postgresql://%s@%s:%s/%s?sslmode=%s",
			config.User,
			config.Host,
			config.Port,
			config.DBName,
			config.SSLMode,
		)
	}

	log.Printf("Connecting to database: %s@%s:%s/%s", config.User, config.Host, config.Port, config.DBName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	// Verify which database we're actually connected to
	var currentDB string
	err = db.QueryRow("SELECT current_database()").Scan(&currentDB)
	if err != nil {
		return nil, fmt.Errorf("error checking database: %w", err)
	}
	log.Printf("Successfully connected to database: %s", currentDB)

	// List all tables visible to this connection
	rows, err := db.Query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
	if err != nil {
		log.Printf("Warning: Could not query pg_tables: %v", err)
	} else {
		defer rows.Close()
		var tables []string
		for rows.Next() {
			var table string
			if err := rows.Scan(&table); err == nil {
				tables = append(tables, table)
			}
		}
		log.Printf("Tables visible in public schema: %v", tables)
	}

	// Also check the search_path
	var searchPath string
	err = db.QueryRow("SHOW search_path").Scan(&searchPath)
	if err != nil {
		log.Printf("Warning: Could not get search_path: %v", err)
	} else {
		log.Printf("Current search_path: %s", searchPath)
	}

	return &DB{db}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.DB.Close()
}

// Health checks the database connection
func (db *DB) Health() error {
	return db.Ping()
}
