#!/bin/bash

# Database configuration
DB_NAME=${DB_NAME:-timeline}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "Setting up Timeline database..."

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo "Error: PostgreSQL is not running on $DB_HOST:$DB_PORT"
    exit 1
fi

# Create database if it doesn't exist
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || {
    echo "Creating database '$DB_NAME'..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
}

# Run migrations
echo "Running migrations..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f 001_initial_schema.sql

echo "Database setup complete!"
echo ""
echo "Connection string:"
echo "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
