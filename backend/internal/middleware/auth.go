package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/timeline/backend/internal/db"
	"github.com/timeline/backend/internal/models"
)

// AuthMiddleware extracts user from Authorization header (Bearer token format: user_id)
// For now, this is a simple bearer token format where the token is the user ID
// In production, you'd validate JWT tokens or session IDs here
func AuthMiddleware(database *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No auth provided, continue as unauthenticated
			c.Set("user", nil)
			c.Next()
			return
		}

		// Extract token from "Bearer <token>" format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		userID := strings.TrimSpace(parts[1])
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Empty user ID"})
			c.Abort()
			return
		}

		// Fetch user from database
		var dbUser models.User
		var lastLoginAt interface{}
		err := database.QueryRow(
			"SELECT id, x_user_id, username, display_name, avatar_url, bio, role, is_active, is_twitter_verified, created_at, last_login_at FROM users WHERE id = $1",
			userID,
		).Scan(
			&dbUser.ID,
			&dbUser.XUserID,
			&dbUser.Username,
			&dbUser.DisplayName,
			&dbUser.AvatarURL,
			&dbUser.Bio,
			&dbUser.Role,
			&dbUser.IsActive,
			&dbUser.IsTwitterVerified,
			&dbUser.CreatedAt,
			&lastLoginAt,
		)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		if !dbUser.IsActive {
			c.JSON(http.StatusForbidden, gin.H{"error": "User account is inactive"})
			c.Abort()
			return
		}

		// Store user in context for later use
		c.Set("user", &dbUser)
		c.Next()
	}
}

// RequireAuth middleware ensures user is authenticated
func RequireAuth(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		c.Abort()
		return
	}
}

// RequireTwitterVerified middleware ensures user has Twitter verification (blue checkmark)
func RequireTwitterVerified(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		c.Abort()
		return
	}

	dbUser, ok := user.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user object"})
		c.Abort()
		return
	}

	if !dbUser.IsTwitterVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "Twitter verification (blue checkmark) required for this action"})
		c.Abort()
		return
	}
}

// GetAuthUser retrieves the authenticated user from context
func GetAuthUser(c *gin.Context) *models.User {
	user, exists := c.Get("user")
	if !exists {
		return nil
	}

	dbUser, ok := user.(*models.User)
	if !ok {
		return nil
	}

	return dbUser
}
