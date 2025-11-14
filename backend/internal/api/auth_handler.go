package api

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/timeline/backend/internal/db"
	"github.com/timeline/backend/internal/models"
)

type AuthHandler struct {
	database *db.DB
}

func NewAuthHandler(database *db.DB) *AuthHandler {
	return &AuthHandler{database: database}
}

// TwitterCallbackRequest represents the data sent from frontend after Twitter OAuth
type TwitterCallbackRequest struct {
	TwitterID      string `json:"twitter_id" binding:"required"`
	Username       string `json:"username" binding:"required"`
	DisplayName    string `json:"display_name"`
	AvatarURL      string `json:"avatar_url"`
	IsVerified     bool   `json:"is_verified"`
}

// AuthResponse is returned to frontend with user data and session token
type AuthResponse struct {
	UserID         string `json:"user_id"`
	Username       string `json:"username"`
	DisplayName    string `json:"display_name"`
	AvatarURL      string `json:"avatar_url"`
	IsVerified     bool   `json:"is_verified"`
	SessionToken   string `json:"session_token"`
}

// ExchangeCodeRequest represents the OAuth code exchange request
type ExchangeCodeRequest struct {
	Code         string `json:"code" binding:"required"`
	CodeVerifier string `json:"code_verifier"`
}

// ExchangeCode exchanges an OAuth authorization code for a session token
func (h *AuthHandler) ExchangeCode(c *gin.Context) {
	var req ExchangeCodeRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	codeSnip := req.Code
	if len(req.Code) > 20 {
		codeSnip = req.Code[:20] + "..."
	}
	log.Printf("Received exchange-code request: code=%s", codeSnip)

	// Exchange code for access token with Twitter API
	twitterResp, err := exchangeCodeForAccessToken(req.Code, req.CodeVerifier)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to exchange code: " + err.Error()})
		return
	}

	// Get user info from Twitter API
	userInfo, err := getUserInfoFromTwitter(twitterResp.AccessToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to get user info: " + err.Error()})
		return
	}

	// Create or update user in database
	callbackReq := TwitterCallbackRequest{
		TwitterID:   userInfo.ID,
		Username:    userInfo.Username,
		DisplayName: userInfo.Name,
		AvatarURL:   userInfo.ProfileImageURL,
		IsVerified:  userInfo.Verified,
	}

	// Generate deterministic user ID from Twitter ID
	userID := h.generateUserID(callbackReq.TwitterID)

	// Check if user exists
	var existingUser models.User
	err = h.database.QueryRow(
		"SELECT id, x_user_id, username, display_name, avatar_url, is_twitter_verified FROM users WHERE x_user_id = $1",
		callbackReq.TwitterID,
	).Scan(
		&existingUser.ID,
		&existingUser.XUserID,
		&existingUser.Username,
		&existingUser.DisplayName,
		&existingUser.AvatarURL,
		&existingUser.IsTwitterVerified,
	)

	var user models.User

	if err == sql.ErrNoRows {
		// Create new user
		xUserID := callbackReq.TwitterID
		user = models.User{
			ID:                userID,
			XUserID:           &xUserID,
			Username:          &callbackReq.Username,
			DisplayName:       &callbackReq.DisplayName,
			AvatarURL:         &callbackReq.AvatarURL,
			IsActive:          true,
			IsTwitterVerified: callbackReq.IsVerified,
			CreatedAt:         time.Now(),
		}

		_, err := h.database.Exec(
			`INSERT INTO users (id, x_user_id, username, display_name, avatar_url, is_active, is_twitter_verified, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			user.ID, user.XUserID, user.Username, user.DisplayName,
			user.AvatarURL, user.IsActive, user.IsTwitterVerified, user.CreatedAt,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	} else {
		// Update existing user with latest data from Twitter
		user = existingUser
		user.Username = &callbackReq.Username
		user.DisplayName = &callbackReq.DisplayName
		user.AvatarURL = &callbackReq.AvatarURL
		user.IsTwitterVerified = callbackReq.IsVerified

		_, err := h.database.Exec(
			`UPDATE users SET username = $1, display_name = $2, avatar_url = $3, is_twitter_verified = $4, last_login_at = $5 WHERE id = $6`,
			user.Username, user.DisplayName, user.AvatarURL, user.IsTwitterVerified, time.Now(), user.ID,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user: " + err.Error()})
			return
		}
	}

	// Return user data and session token (which is their user ID)
	username := ""
	displayName := ""
	avatarURL := ""
	if user.Username != nil {
		username = *user.Username
	}
	if user.DisplayName != nil {
		displayName = *user.DisplayName
	}
	if user.AvatarURL != nil {
		avatarURL = *user.AvatarURL
	}

	response := AuthResponse{
		UserID:       user.ID,
		Username:     username,
		DisplayName:  displayName,
		AvatarURL:    avatarURL,
		IsVerified:   user.IsTwitterVerified,
		SessionToken: user.ID, // Session token is the user ID
	}

	c.JSON(http.StatusOK, response)
}

// TwitterCallback handles OAuth callback from frontend
// Creates or updates user in database and returns session token
func (h *AuthHandler) TwitterCallback(c *gin.Context) {
	var req TwitterCallbackRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Generate deterministic user ID from Twitter ID
	// This ensures same Twitter user always gets same UUID across sessions
	userID := h.generateUserID(req.TwitterID)

	// Check if user exists
	var existingUser models.User
	err := h.database.QueryRow(
		"SELECT id, x_user_id, username, display_name, avatar_url, is_twitter_verified FROM users WHERE x_user_id = $1",
		req.TwitterID,
	).Scan(
		&existingUser.ID,
		&existingUser.XUserID,
		&existingUser.Username,
		&existingUser.DisplayName,
		&existingUser.AvatarURL,
		&existingUser.IsTwitterVerified,
	)

	var user models.User

	if err == sql.ErrNoRows {
		// Create new user
		xUserID := req.TwitterID
		user = models.User{
			ID:                userID,
			XUserID:           &xUserID,
			Username:          &req.Username,
			DisplayName:       &req.DisplayName,
			AvatarURL:         &req.AvatarURL,
			IsActive:          true,
			IsTwitterVerified: req.IsVerified,
			CreatedAt:         time.Now(),
		}

		_, err := h.database.Exec(
			`INSERT INTO users (id, x_user_id, username, display_name, avatar_url, is_active, is_twitter_verified, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			user.ID, user.XUserID, user.Username, user.DisplayName,
			user.AvatarURL, user.IsActive, user.IsTwitterVerified, user.CreatedAt,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	} else {
		// Update existing user with latest data from Twitter
		user = existingUser
		user.Username = &req.Username
		user.DisplayName = &req.DisplayName
		user.AvatarURL = &req.AvatarURL
		user.IsTwitterVerified = req.IsVerified

		_, err := h.database.Exec(
			`UPDATE users SET username = $1, display_name = $2, avatar_url = $3, is_twitter_verified = $4, last_login_at = $5 WHERE id = $6`,
			user.Username, user.DisplayName, user.AvatarURL, user.IsTwitterVerified, time.Now(), user.ID,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user: " + err.Error()})
			return
		}
	}

	// Return user data and session token (which is their user ID)
	username := ""
	displayName := ""
	avatarURL := ""
	if user.Username != nil {
		username = *user.Username
	}
	if user.DisplayName != nil {
		displayName = *user.DisplayName
	}
	if user.AvatarURL != nil {
		avatarURL = *user.AvatarURL
	}

	response := AuthResponse{
		UserID:       user.ID,
		Username:     username,
		DisplayName:  displayName,
		AvatarURL:    avatarURL,
		IsVerified:   user.IsTwitterVerified,
		SessionToken: user.ID, // Session token is the user ID
	}

	c.JSON(http.StatusOK, response)
}

// Logout endpoint (optional, mostly for frontend to clear local storage)
func (h *AuthHandler) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Logged out"})
}

// GetCurrentUser returns the authenticated user's info
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	dbUser := user.(*models.User)
	username := ""
	displayName := ""
	avatarURL := ""
	if dbUser.Username != nil {
		username = *dbUser.Username
	}
	if dbUser.DisplayName != nil {
		displayName = *dbUser.DisplayName
	}
	if dbUser.AvatarURL != nil {
		avatarURL = *dbUser.AvatarURL
	}

	response := AuthResponse{
		UserID:      dbUser.ID,
		Username:    username,
		DisplayName: displayName,
		AvatarURL:   avatarURL,
		IsVerified:  dbUser.IsTwitterVerified,
	}

	c.JSON(http.StatusOK, response)
}

// generateUserID creates a deterministic UUID from Twitter ID
// This ensures the same Twitter user always maps to the same UUID
func (h *AuthHandler) generateUserID(twitterID string) string {
	// Create a deterministic hash from Twitter ID
	hash := sha256.Sum256([]byte("timeline-user:" + twitterID))
	hashStr := hex.EncodeToString(hash[:])

	// Format as UUID v5-like format (8-4-4-4-12)
	return fmt.Sprintf(
		"%s-%s-%s-%s-%s",
		hashStr[0:8],
		hashStr[8:12],
		hashStr[12:16],
		hashStr[16:20],
		hashStr[20:32],
	)
}

// TokenResponse represents the response from Twitter's token endpoint
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// TwitterUserInfo represents user data from Twitter API
type TwitterUserInfo struct {
	ID               string `json:"id"`
	Username         string `json:"username"`
	Name             string `json:"name"`
	Verified         bool   `json:"verified"`
	ProfileImageURL  string `json:"profile_image_url"`
}

// exchangeCodeForAccessToken exchanges an OAuth code for an access token
func exchangeCodeForAccessToken(code, codeVerifier string) (*TokenResponse, error) {
	clientID := os.Getenv("TWITTER_CLIENT_ID")
	clientSecret := os.Getenv("TWITTER_CLIENT_SECRET")
	redirectURI := os.Getenv("TWITTER_REDIRECT_URI")

	if clientID == "" || clientSecret == "" || redirectURI == "" {
		return nil, fmt.Errorf("missing Twitter OAuth credentials")
	}

	client := &http.Client{Timeout: 10 * time.Second}

	// Prepare token request
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)
	if codeVerifier != "" {
		data.Set("code_verifier", codeVerifier)
	}

	req, err := http.NewRequest("POST", "https://x.com/2/oauth2/token", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(clientID, clientSecret)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		errMsg := fmt.Sprintf("Twitter token exchange failed: %d - %s", resp.StatusCode, string(body))
		log.Printf("ERROR: %s", errMsg)
		return nil, fmt.Errorf(errMsg)
	}

	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

// getUserInfoFromTwitter fetches user info from Twitter API v2
func getUserInfoFromTwitter(accessToken string) (*TwitterUserInfo, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest("GET", "https://api.twitter.com/2/users/me?user.fields=verified,profile_image_url", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Add("Authorization", "Bearer "+accessToken)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Twitter API error: %d - %s", resp.StatusCode, string(body))
	}

	var twitterResp struct {
		Data TwitterUserInfo `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&twitterResp); err != nil {
		return nil, err
	}

	return &twitterResp.Data, nil
}
