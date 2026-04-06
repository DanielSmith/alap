// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

// Alap Config Server — Go + Gin + SQLite implementation.
//
// All 7 endpoints fully functional, including expression resolution
// via the native Go port of the Alap expression parser.
package main

import (
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "modernc.org/sqlite"

	"github.com/DanielSmith/alap-go"
)

//go:embed public
var publicFS embed.FS

var db *sql.DB

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	var err error
	db, err = sql.Open("sqlite", "alap_configs.db")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	initDB()

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.Use(cors.Default())

	// Static files
	publicSub, _ := fs.Sub(publicFS, "public")
	staticHandler := http.FileServer(http.FS(publicSub))
	r.GET("/", gin.WrapH(staticHandler))
	r.GET("/style.css", gin.WrapH(staticHandler))
	r.GET("/app.js", gin.WrapH(staticHandler))

	// API endpoints
	r.GET("/configs", listConfigs)
	r.GET("/configs/:name", loadConfig)
	r.PUT("/configs/:name", saveConfig)
	r.DELETE("/configs/:name", deleteConfig)
	r.GET("/search", searchConfigs)
	r.POST("/cherry-pick", cherryPick)
	r.POST("/query", queryEndpoint)

	fmt.Printf("Alap config server (Gin + SQLite) running at http://localhost:%s\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

// warnHyphens logs a warning for any hyphenated keys in allLinks, macros, or searchPatterns.
func warnHyphens(body map[string]any) {
	sections := []string{"allLinks", "macros", "searchPatterns"}
	for _, section := range sections {
		mapping, ok := body[section].(map[string]any)
		if !ok {
			continue
		}
		for key := range mapping {
			if strings.Contains(key, "-") {
				log.Printf("[alap] %s key %q contains a hyphen — use underscores. \"-\" is the WITHOUT operator.", section, key)
			}
		}
	}
}

func initDB() {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS configs (
			name       TEXT PRIMARY KEY,
			config     TEXT NOT NULL,
			created_at TEXT,
			updated_at TEXT
		)
	`)
	if err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}
}

// ---------------------------------------------------------------------------
// 1. GET /configs — list all config names
// ---------------------------------------------------------------------------

func listConfigs(c *gin.Context) {
	rows, err := db.Query("SELECT name FROM configs ORDER BY name")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	names := make([]string, 0)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		names = append(names, name)
	}
	c.JSON(http.StatusOK, names)
}

// ---------------------------------------------------------------------------
// 2. GET /configs/:name — load a config
// ---------------------------------------------------------------------------

func loadConfig(c *gin.Context) {
	name := c.Param("name")
	var configText, createdAt, updatedAt string
	err := db.QueryRow(
		"SELECT config, created_at, updated_at FROM configs WHERE name = ?", name,
	).Scan(&configText, &createdAt, &updatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Config not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var config any
	if err := json.Unmarshal([]byte(configText), &config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "corrupt config JSON"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"config": config,
		"meta": gin.H{
			"createdAt": createdAt,
			"updatedAt": updatedAt,
		},
	})
}

// ---------------------------------------------------------------------------
// 3. PUT /configs/:name — save / upsert a config
// ---------------------------------------------------------------------------

func saveConfig(c *gin.Context) {
	name := c.Param("name")

	var body any
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body"})
		return
	}

	if bodyMap, ok := body.(map[string]any); ok {
		warnHyphens(bodyMap)
	}

	configBytes, err := json.Marshal(body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to serialize JSON"})
		return
	}

	now := time.Now().UTC().Format("2006-01-02 15:04:05")

	var exists bool
	_ = db.QueryRow("SELECT 1 FROM configs WHERE name = ?", name).Scan(&exists)

	if exists {
		if _, err := db.Exec("UPDATE configs SET config = ?, updated_at = ? WHERE name = ?",
			string(configBytes), now, name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else {
		if _, err := db.Exec("INSERT INTO configs (name, config, created_at, updated_at) VALUES (?, ?, ?, ?)",
			name, string(configBytes), now, now); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.Status(http.StatusNoContent)
}

// ---------------------------------------------------------------------------
// 4. DELETE /configs/:name — remove a config
// ---------------------------------------------------------------------------

func deleteConfig(c *gin.Context) {
	name := c.Param("name")
	if _, err := db.Exec("DELETE FROM configs WHERE name = ?", name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------------------------------------------------------------------------
// 5. GET /search — cross-config search
// ---------------------------------------------------------------------------

func searchConfigs(c *gin.Context) {
	tag := c.Query("tag")
	q := c.Query("q")
	regexStr := c.Query("regex")
	fieldsParam := c.DefaultQuery("fields", "label,url,tags,description,id")
	configPattern := c.Query("config")
	limitStr := c.DefaultQuery("limit", "100")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 1000 {
		limit = 100
	}

	if tag == "" && q == "" && regexStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Provide at least one of: tag, q, regex"})
		return
	}

	fields := strings.Split(fieldsParam, ",")
	for i := range fields {
		fields[i] = strings.TrimSpace(fields[i])
	}

	var compiledRegex *regexp.Regexp
	if regexStr != "" {
		check := alap.ValidateRegex(regexStr)
		if !check.Safe {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid regex: " + check.Reason})
			return
		}
		compiledRegex, err = regexp.Compile("(?i)" + regexStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid regex"})
			return
		}
	}

	var configRegex *regexp.Regexp
	if configPattern != "" {
		check := alap.ValidateRegex(configPattern)
		if !check.Safe {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid config regex: " + check.Reason})
			return
		}
		configRegex, err = regexp.Compile("(?i)" + configPattern)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid config regex"})
			return
		}
	}

	rows, err := db.Query("SELECT name, config FROM configs")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type searchResult struct {
		ConfigName string `json:"configName"`
		ID         string `json:"id"`
		Link       any    `json:"link"`
	}

	results := make([]searchResult, 0)
	configsSearched := 0
	linksScanned := 0

	for rows.Next() {
		var name, configText string
		if err := rows.Scan(&name, &configText); err != nil {
			continue
		}

		if configRegex != nil && !configRegex.MatchString(name) {
			continue
		}
		configsSearched++

		var config map[string]any
		if err := json.Unmarshal([]byte(configText), &config); err != nil {
			continue
		}
		allLinks, _ := config["allLinks"].(map[string]any)

		for id, linkAny := range allLinks {
			linksScanned++
			if len(results) >= limit {
				break
			}

			link, ok := linkAny.(map[string]any)
			if !ok {
				continue
			}

			if matchesSearch(link, id, tag, q, compiledRegex, fields) {
				results = append(results, searchResult{name, id, link})
			}
		}
		if len(results) >= limit {
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"results":         results,
		"configsSearched": configsSearched,
		"linksScanned":    linksScanned,
	})
}

func matchesSearch(link map[string]any, id, tag, q string, regex *regexp.Regexp, fields []string) bool {
	if tag != "" {
		tags, _ := link["tags"].([]any)
		found := false
		for _, t := range tags {
			if t == tag {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	if q != "" {
		qLower := strings.ToLower(q)
		if !anyFieldContains(link, id, fields, qLower) {
			return false
		}
	}

	if regex != nil {
		if !anyFieldMatches(link, id, fields, regex) {
			return false
		}
	}

	return tag != "" || q != "" || regex != nil
}

func anyFieldContains(link map[string]any, id string, fields []string, q string) bool {
	for _, f := range fields {
		switch f {
		case "id":
			if strings.Contains(strings.ToLower(id), q) {
				return true
			}
		case "tags":
			tags, _ := link["tags"].([]any)
			for _, t := range tags {
				if s, ok := t.(string); ok && strings.Contains(strings.ToLower(s), q) {
					return true
				}
			}
		default:
			if v, ok := link[f].(string); ok && strings.Contains(strings.ToLower(v), q) {
				return true
			}
		}
	}
	return false
}

func anyFieldMatches(link map[string]any, id string, fields []string, re *regexp.Regexp) bool {
	for _, f := range fields {
		switch f {
		case "id":
			if re.MatchString(id) {
				return true
			}
		case "tags":
			tags, _ := link["tags"].([]any)
			for _, t := range tags {
				if s, ok := t.(string); ok && re.MatchString(s) {
					return true
				}
			}
		default:
			if v, ok := link[f].(string); ok && re.MatchString(v) {
				return true
			}
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// 6. POST /cherry-pick — resolve expression, return subset
// ---------------------------------------------------------------------------

func cherryPick(c *gin.Context) {
	var body struct {
		Source     string `json:"source"`
		Expression string `json:"expression"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Source == "" || body.Expression == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": `Provide "source" and "expression"`})
		return
	}

	config, err := loadConfigFromDB(body.Source)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Config %q not found", body.Source)})
		return
	}

	result := alap.CherryPick(c.Request.Context(), config, body.Expression)
	c.JSON(http.StatusOK, gin.H{"allLinks": result})
}

// ---------------------------------------------------------------------------
// 7. POST /query — server-side expression resolution
// ---------------------------------------------------------------------------

func queryEndpoint(c *gin.Context) {
	var body struct {
		Expression string   `json:"expression"`
		ConfigName string   `json:"configName"`
		Configs    []string `json:"configs"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Expression == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": `Provide "expression"`})
		return
	}

	var config *alap.Config

	if len(body.Configs) > 0 {
		var configs []*alap.Config
		for _, name := range body.Configs {
			cfg, err := loadConfigFromDB(name)
			if err == nil {
				configs = append(configs, cfg)
			}
		}
		if len(configs) == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "None of the requested configs were found"})
			return
		}
		config = alap.MergeConfigs(configs...)
	} else {
		name := body.ConfigName
		if name == "" {
			name = "demo"
		}
		var err error
		config, err = loadConfigFromDB(name)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Config %q not found", name)})
			return
		}
	}

	results := alap.Resolve(c.Request.Context(), config, body.Expression)
	c.JSON(http.StatusOK, gin.H{"results": results})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func loadConfigFromDB(name string) (*alap.Config, error) {
	var configText string
	err := db.QueryRow("SELECT config FROM configs WHERE name = ?", name).Scan(&configText)
	if err != nil {
		return nil, err
	}

	var config alap.Config
	if err := json.Unmarshal([]byte(configText), &config); err != nil {
		return nil, err
	}
	return &config, nil
}
