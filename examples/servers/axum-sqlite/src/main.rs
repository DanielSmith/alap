// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0

use std::sync::{Arc, Mutex};

use anyhow::Result;
use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Db = Arc<Mutex<Connection>>;

#[derive(Serialize)]
struct ConfigResponse {
    config: serde_json::Value,
    meta: Meta,
}

#[derive(Serialize)]
struct Meta {
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
}

#[derive(Deserialize)]
struct SearchParams {
    tag: Option<String>,
    q: Option<String>,
    regex: Option<String>,
    fields: Option<String>,
    config: Option<String>,
    limit: Option<usize>,
}

#[derive(Serialize)]
struct SearchResponse {
    results: Vec<SearchHit>,
    #[serde(rename = "configsSearched")]
    configs_searched: usize,
    #[serde(rename = "linksScanned")]
    links_scanned: usize,
}

#[derive(Serialize)]
struct SearchHit {
    #[serde(rename = "configName")]
    config_name: String,
    id: String,
    link: serde_json::Value,
}

#[derive(Deserialize)]
struct CherryPickBody {
    source: Option<String>,
    expression: Option<String>,
}

#[derive(Deserialize)]
struct QueryBody {
    expression: Option<String>,
    #[serde(rename = "configName")]
    config_name: Option<String>,
    configs: Option<Vec<String>>,
}

#[derive(Serialize)]
struct ErrorJson {
    error: String,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Log a warning for any hyphenated keys in allLinks, macros, or searchPatterns.
fn warn_hyphens(body: &serde_json::Value) {
    let sections = ["allLinks", "macros", "searchPatterns"];
    for section in &sections {
        if let Some(mapping) = body.get(section).and_then(|v| v.as_object()) {
            for key in mapping.keys() {
                if key.contains('-') {
                    eprintln!(
                        "[alap] {} key \"{}\" contains a hyphen — use underscores. \"-\" is the WITHOUT operator.",
                        section, key
                    );
                }
            }
        }
    }
}

fn err_json(status: StatusCode, msg: impl Into<String>) -> impl IntoResponse {
    (status, Json(ErrorJson { error: msg.into() }))
}

fn open_db() -> Result<Connection> {
    let conn = Connection::open("alap.db")?;
    conn.execute_batch("PRAGMA journal_mode = WAL;")?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS configs (
            name       TEXT PRIMARY KEY,
            config     TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )?;
    Ok(conn)
}

/// Parse a JSON TEXT column into an `alap::Config`.
fn parse_alap_config(json_text: &str) -> Result<alap::Config, serde_json::Error> {
    serde_json::from_str(json_text)
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// GET /configs — list config names
async fn list_configs(State(db): State<Db>) -> impl IntoResponse {
    let db = db.clone();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().expect("db lock poisoned");
        let mut stmt = conn.prepare("SELECT name FROM configs ORDER BY name")?;
        let names: Vec<String> = stmt
            .query_map([], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();
        Ok::<_, anyhow::Error>(names)
    })
    .await
    .expect("blocking task panicked");

    match result {
        Ok(names) => Json(names).into_response(),
        Err(e) => err_json(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// GET /configs/:name — load a config
async fn get_config(
    State(db): State<Db>,
    Path(name): Path<String>,
) -> impl IntoResponse {
    let db = db.clone();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().expect("db lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT config, created_at, updated_at FROM configs WHERE name = ?1",
        )?;
        let row = stmt.query_row([&name], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        });
        match row {
            Ok((config_text, created_at, updated_at)) => {
                let config: serde_json::Value = serde_json::from_str(&config_text)?;
                Ok(Some(ConfigResponse {
                    config,
                    meta: Meta { created_at, updated_at },
                }))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(anyhow::Error::from(e)),
        }
    })
    .await
    .expect("blocking task panicked");

    match result {
        Ok(Some(resp)) => Json(resp).into_response(),
        Ok(None) => err_json(StatusCode::NOT_FOUND, "Not found").into_response(),
        Err(e) => err_json(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// PUT /configs/:name — save/upsert config
async fn put_config(
    State(db): State<Db>,
    Path(name): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    if !body.is_object() {
        return err_json(
            StatusCode::BAD_REQUEST,
            "Request body must be a JSON object",
        )
        .into_response();
    }

    warn_hyphens(&body);

    let db = db.clone();
    let config_text = body.to_string();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().expect("db lock poisoned");
        conn.execute(
            "INSERT INTO configs (name, config, created_at, updated_at)
             VALUES (?1, ?2, datetime('now'), datetime('now'))
             ON CONFLICT(name) DO UPDATE SET
               config = excluded.config,
               updated_at = datetime('now')",
            [&name, &config_text],
        )?;
        Ok::<_, anyhow::Error>(())
    })
    .await
    .expect("blocking task panicked");

    match result {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => err_json(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// DELETE /configs/:name — remove a config
async fn delete_config(
    State(db): State<Db>,
    Path(name): Path<String>,
) -> impl IntoResponse {
    let db = db.clone();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().expect("db lock poisoned");
        conn.execute("DELETE FROM configs WHERE name = ?1", [&name])?;
        Ok::<_, anyhow::Error>(())
    })
    .await
    .expect("blocking task panicked");

    match result {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => err_json(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// GET /search — search across all configs
async fn search(
    State(db): State<Db>,
    Query(params): Query<SearchParams>,
) -> impl IntoResponse {
    // Determine search mode
    let has_tag = params.tag.is_some();
    let has_q = params.q.is_some();
    let has_regex = params.regex.is_some();

    if !has_tag && !has_q && !has_regex {
        return err_json(
            StatusCode::BAD_REQUEST,
            "Provide at least one of: tag, q, regex",
        )
        .into_response();
    }

    // Validate regex params before entering the blocking task
    if let Some(ref re_str) = params.regex {
        let check = alap::validate_regex(re_str);
        if !check.safe {
            let reason = check.reason.unwrap_or_else(|| "unsafe pattern".into());
            return err_json(StatusCode::BAD_REQUEST, format!("Invalid regex: {reason}"))
                .into_response();
        }
        if regex::Regex::new(re_str).is_err() {
            return err_json(StatusCode::BAD_REQUEST, "Invalid regex").into_response();
        }
    }

    if let Some(ref pat) = params.config {
        let check = alap::validate_regex(pat);
        if !check.safe {
            let reason = check.reason.unwrap_or_else(|| "unsafe pattern".into());
            return err_json(
                StatusCode::BAD_REQUEST,
                format!("Invalid config pattern: {reason}"),
            )
            .into_response();
        }
    }

    let max_results = params.limit.unwrap_or(100).min(1000);

    let search_fields: Vec<String> = params
        .fields
        .as_deref()
        .map(|f| f.split(',').map(|s| s.trim().to_owned()).collect())
        .unwrap_or_else(|| {
            vec![
                "label".into(),
                "url".into(),
                "tags".into(),
                "description".into(),
                "id".into(),
            ]
        });

    let db = db.clone();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().expect("db lock poisoned");

        // Compile optional config filter regex
        let config_re = params
            .config
            .as_deref()
            .map(|p| regex::RegexBuilder::new(p).case_insensitive(true).build())
            .transpose()?;

        // Compile optional search regex
        let search_re = params
            .regex
            .as_deref()
            .map(|p| regex::RegexBuilder::new(p).case_insensitive(true).build())
            .transpose()?;

        // List config names
        let mut list_stmt = conn.prepare("SELECT name FROM configs ORDER BY name")?;
        let names: Vec<String> = list_stmt
            .query_map([], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        let mut get_stmt =
            conn.prepare("SELECT config FROM configs WHERE name = ?1")?;

        let mut results: Vec<SearchHit> = Vec::new();
        let mut configs_searched: usize = 0;
        let mut links_scanned: usize = 0;

        for name in &names {
            if let Some(ref cre) = config_re {
                if !cre.is_match(name) {
                    continue;
                }
            }
            configs_searched += 1;

            let config_text: String = match get_stmt.query_row([name], |row| row.get(0)) {
                Ok(t) => t,
                Err(_) => continue,
            };

            let config: serde_json::Value = match serde_json::from_str(&config_text) {
                Ok(v) => v,
                Err(_) => continue,
            };

            let all_links = match config.get("allLinks").and_then(|v| v.as_object()) {
                Some(m) => m,
                None => continue,
            };

            for (id, link) in all_links {
                links_scanned += 1;

                let matched = if has_tag {
                    let tag = params.tag.as_deref().unwrap_or_default();
                    link.get("tags")
                        .and_then(|v| v.as_array())
                        .is_some_and(|tags| tags.iter().any(|t| t.as_str() == Some(tag)))
                } else if has_q {
                    let term = params.q.as_deref().unwrap_or_default().to_lowercase();
                    let check_field = |field: &str, val: Option<&str>| -> bool {
                        search_fields.contains(&field.to_owned())
                            && val.is_some_and(|v| v.to_lowercase().contains(&term))
                    };
                    check_field("label", link.get("label").and_then(|v| v.as_str()))
                        || check_field("url", link.get("url").and_then(|v| v.as_str()))
                        || check_field("description", link.get("description").and_then(|v| v.as_str()))
                        || check_field("id", Some(id.as_str()))
                        || (search_fields.contains(&"tags".to_owned())
                            && link
                                .get("tags")
                                .and_then(|v| v.as_array())
                                .is_some_and(|tags| {
                                    tags.iter().any(|t| {
                                        t.as_str()
                                            .is_some_and(|s| s.to_lowercase().contains(&term))
                                    })
                                }))
                } else {
                    // regex mode
                    let re = search_re.as_ref().expect("regex already validated");
                    let check_re = |field: &str, val: Option<&str>| -> bool {
                        search_fields.contains(&field.to_owned())
                            && val.is_some_and(|v| re.is_match(v))
                    };
                    check_re("label", link.get("label").and_then(|v| v.as_str()))
                        || check_re("url", link.get("url").and_then(|v| v.as_str()))
                        || check_re(
                            "description",
                            link.get("description").and_then(|v| v.as_str()),
                        )
                        || check_re("id", Some(id.as_str()))
                        || (search_fields.contains(&"tags".to_owned())
                            && link
                                .get("tags")
                                .and_then(|v| v.as_array())
                                .is_some_and(|tags| {
                                    tags.iter()
                                        .any(|t| t.as_str().is_some_and(|s| re.is_match(s)))
                                }))
                };

                if matched {
                    results.push(SearchHit {
                        config_name: name.clone(),
                        id: id.clone(),
                        link: link.clone(),
                    });
                    if results.len() >= max_results {
                        break;
                    }
                }
            }
            if results.len() >= max_results {
                break;
            }
        }

        Ok::<_, anyhow::Error>(SearchResponse {
            results,
            configs_searched,
            links_scanned,
        })
    })
    .await
    .expect("blocking task panicked");

    match result {
        Ok(resp) => Json(resp).into_response(),
        Err(e) => err_json(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// POST /cherry-pick — resolve expression against a config, return matching links
async fn cherry_pick(
    State(db): State<Db>,
    Json(body): Json<CherryPickBody>,
) -> impl IntoResponse {
    let source = match body.source {
        Some(s) if !s.is_empty() => s,
        _ => {
            return err_json(
                StatusCode::BAD_REQUEST,
                r#"Provide "source" (config name) and "expression""#,
            )
            .into_response()
        }
    };
    let expression = match body.expression {
        Some(e) if !e.is_empty() => e,
        _ => {
            return err_json(
                StatusCode::BAD_REQUEST,
                r#"Provide "source" (config name) and "expression""#,
            )
            .into_response()
        }
    };

    let db = db.clone();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().expect("db lock poisoned");
        let config_text: String = conn
            .query_row(
                "SELECT config FROM configs WHERE name = ?1",
                [&source],
                |row| row.get(0),
            )
            .map_err(|_| source.clone())?;

        let config: alap::Config = parse_alap_config(&config_text)
            .map_err(|_| "parse error".to_owned())?;

        let all_links = alap::cherry_pick(&config, &expression);

        // Convert to serde_json::Value map for JSON response
        let links_map: serde_json::Map<String, serde_json::Value> = all_links
            .into_iter()
            .filter_map(|(id, link)| {
                serde_json::to_value(link).ok().map(|v| (id, v))
            })
            .collect();

        Ok::<_, String>(links_map)
    })
    .await
    .expect("blocking task panicked");

    match result {
        Ok(all_links) => {
            let resp = serde_json::json!({ "allLinks": all_links });
            Json(resp).into_response()
        }
        Err(source_name) => {
            err_json(
                StatusCode::NOT_FOUND,
                format!(r#"Config "{source_name}" not found"#),
            )
            .into_response()
        }
    }
}

/// POST /query — server-side expression resolution
async fn query(
    State(db): State<Db>,
    Json(body): Json<QueryBody>,
) -> impl IntoResponse {
    let expression = match body.expression {
        Some(e) if !e.is_empty() => e,
        _ => {
            return err_json(StatusCode::BAD_REQUEST, r#"Provide "expression""#).into_response()
        }
    };

    let db = db.clone();
    let config_names = body.configs;
    let config_name = body.config_name;

    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().expect("db lock poisoned");

        let config = if let Some(names) = config_names {
            // Load and merge multiple configs
            let mut loaded: Vec<alap::Config> = Vec::new();
            for name in &names {
                let text: String = match conn.query_row(
                    "SELECT config FROM configs WHERE name = ?1",
                    [name],
                    |row| row.get(0),
                ) {
                    Ok(t) => t,
                    Err(_) => continue,
                };
                if let Ok(c) = parse_alap_config(&text) {
                    loaded.push(c);
                }
            }
            if loaded.is_empty() {
                return Err((
                    StatusCode::NOT_FOUND,
                    "None of the requested configs were found".to_owned(),
                ));
            }
            let refs: Vec<&alap::Config> = loaded.iter().collect();
            alap::merge_configs(&refs)
        } else {
            let name = config_name.unwrap_or_else(|| "demo".into());
            let text: String = conn
                .query_row(
                    "SELECT config FROM configs WHERE name = ?1",
                    [&name],
                    |row| row.get(0),
                )
                .map_err(|_| {
                    (
                        StatusCode::NOT_FOUND,
                        format!(r#"Config "{name}" not found"#),
                    )
                })?;
            parse_alap_config(&text).map_err(|e| {
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?
        };

        let results = alap::resolve(&config, &expression);
        let json_results: Vec<serde_json::Value> = results
            .into_iter()
            .filter_map(|r| serde_json::to_value(r).ok())
            .collect();

        Ok(json_results)
    })
    .await
    .expect("blocking task panicked");

    match result {
        Ok(results) => Json(serde_json::json!({ "results": results })).into_response(),
        Err((status, msg)) => err_json(status, msg).into_response(),
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

#[tokio::main]
async fn main() -> Result<()> {
    let conn = open_db()?;
    let db: Db = Arc::new(Mutex::new(conn));

    let app = Router::new()
        .route("/configs", get(list_configs))
        .route("/configs/{name}", get(get_config).put(put_config).delete(delete_config))
        .route("/search", get(search))
        .route("/cherry-pick", post(cherry_pick))
        .route("/query", post(query))
        .with_state(db)
        .layer(CorsLayer::very_permissive())
        .fallback_service(ServeDir::new("public"));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    println!("Alap config server running at http://localhost:3000");
    println!("Database: alap.db");
    axum::serve(listener, app).await?;

    Ok(())
}
