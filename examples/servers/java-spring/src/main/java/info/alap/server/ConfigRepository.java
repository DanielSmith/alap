// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package info.alap.server;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Data access for Alap configurations stored in SQLite.
 */
@Repository
public class ConfigRepository {

    private final JdbcTemplate jdbc;

    public ConfigRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Return all config names, sorted alphabetically. */
    public List<String> listNames() {
        return jdbc.queryForList("SELECT name FROM configs ORDER BY name", String.class);
    }

    /** Load a single config by name. */
    public Optional<ConfigRecord> findByName(String name) {
        List<ConfigRecord> rows = jdbc.query(
            "SELECT name, config, created_at, updated_at FROM configs WHERE name = ?",
            (rs, rowNum) -> new ConfigRecord(
                rs.getString("name"),
                rs.getString("config"),
                rs.getString("created_at"),
                rs.getString("updated_at")
            ),
            name
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    /** Load all configs (for cross-config search). */
    public List<ConfigRecord> findAll() {
        return jdbc.query(
            "SELECT name, config, created_at, updated_at FROM configs",
            (rs, rowNum) -> new ConfigRecord(
                rs.getString("name"),
                rs.getString("config"),
                rs.getString("created_at"),
                rs.getString("updated_at")
            )
        );
    }

    /** Insert or update a config. */
    public void upsert(String name, String configJson) {
        String now = Instant.now().toString();
        int updated = jdbc.update(
            "UPDATE configs SET config = ?, updated_at = ? WHERE name = ?",
            configJson, now, name
        );
        if (updated == 0) {
            jdbc.update(
                "INSERT INTO configs (name, config, created_at, updated_at) VALUES (?, ?, ?, ?)",
                name, configJson, now, now
            );
        }
    }

    /** Delete a config by name. */
    public void delete(String name) {
        jdbc.update("DELETE FROM configs WHERE name = ?", name);
    }

    /** A row from the configs table. */
    public record ConfigRecord(String name, String config, String createdAt, String updatedAt) {}
}
