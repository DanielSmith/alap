# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

# Alap config server — Sinatra + SQLite.
# Drop-in replacement for the Express/Bun/Hono servers.

require "sinatra"
require "sinatra/json"
require "sqlite3"
require "json"

# Load the Ruby parser from the repo
$LOAD_PATH.unshift(File.expand_path("../../../src/other-languages/ruby/lib", __dir__))
require "alap"

DB_PATH = File.join(__dir__, "alap.db")
PORT = (ENV["PORT"] || 3000).to_i

# --- Database setup ---

DB = SQLite3::Database.new(DB_PATH)
DB.results_as_hash = true
DB.execute("PRAGMA journal_mode=WAL")

DB.execute(<<~SQL)
  CREATE TABLE IF NOT EXISTS configs (
    name       TEXT PRIMARY KEY,
    config     TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
SQL

# --- Sinatra config ---

set :port, PORT
set :bind, "0.0.0.0"
set :public_folder, File.join(__dir__, "public")

# CORS
before do
  headers "Access-Control-Allow-Origin" => "*",
          "Access-Control-Allow-Methods" => "GET, PUT, POST, DELETE, OPTIONS",
          "Access-Control-Allow-Headers" => "Content-Type, Authorization"
end

options "*" do
  200
end

# Parse JSON body for PUT/POST
before do
  if request.content_type&.include?("application/json")
    body = request.body.read
    @json_body = JSON.parse(body) unless body.empty?
  end
end

# --- Hyphen warning ---

def warn_hyphens(config)
  %w[allLinks macros searchPatterns].each do |section|
    next unless config[section].is_a?(Hash)

    config[section].each_key do |key|
      if key.include?("-")
        warn "[alap] #{section} key \"#{key}\" contains a hyphen — use underscores. \"-\" is the WITHOUT operator."
      end
    end
  end
end

# --- Routes ---

get "/" do
  send_file File.join(settings.public_folder, "index.html")
end

# GET /configs — list all config names
get "/configs" do
  rows = DB.execute("SELECT name FROM configs ORDER BY name")
  json rows.map { |r| r["name"] }
end

# GET /configs/:name — load a config entry
get "/configs/:name" do
  row = DB.get_first_row("SELECT config, created_at, updated_at FROM configs WHERE name = ?", params[:name])
  halt 404, json(error: "Not found") unless row

  json(
    config: JSON.parse(row["config"]),
    meta: {
      createdAt: row["created_at"],
      updatedAt: row["updated_at"],
    }
  )
end

# PUT /configs/:name — save (create or update) a config
put "/configs/:name" do
  config = @json_body
  halt 400, json(error: "Request body must be a JSON object") unless config.is_a?(Hash)

  warn_hyphens(config)

  DB.execute(<<~SQL, [params[:name], JSON.generate(config)])
    INSERT INTO configs (name, config, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(name) DO UPDATE SET
      config = excluded.config,
      updated_at = datetime('now')
  SQL

  status 204
end

# DELETE /configs/:name — remove a config
delete "/configs/:name" do
  DB.execute("DELETE FROM configs WHERE name = ?", params[:name])
  status 204
end

# GET /search — search across all configs
get "/search" do
  tag = params[:tag]
  q = params[:q]
  regex_str = params[:regex]
  fields_param = params[:fields]
  config_pattern = params[:config]
  max_results = [[params.fetch(:limit, 100).to_i, 1].max, 1000].min

  search_fields = if fields_param
                    fields_param.split(",").map(&:strip)
                  else
                    %w[label url tags description id]
                  end

  # Build matcher
  matcher = if tag
              ->(_id, link) { link["tags"].is_a?(Array) && link["tags"].include?(tag) }
            elsif q
              term = q.downcase
              lambda { |id, link|
                (search_fields.include?("label") && link["label"].to_s.downcase.include?(term)) ||
                  (search_fields.include?("url") && link["url"].to_s.downcase.include?(term)) ||
                  (search_fields.include?("description") && link["description"].to_s.downcase.include?(term)) ||
                  (search_fields.include?("id") && id.downcase.include?(term)) ||
                  (search_fields.include?("tags") && link["tags"].is_a?(Array) && link["tags"].any? { |t| t.downcase.include?(term) })
              }
            elsif regex_str
              check = Alap::ValidateRegex.call(regex_str)
              halt 400, json(error: "Invalid regex: #{check["reason"]}") unless check["safe"]
              begin
                re = Regexp.new(regex_str, Regexp::IGNORECASE)
              rescue RegexpError
                halt 400, json(error: "Invalid regex")
              end
              lambda { |id, link|
                (search_fields.include?("label") && re.match?(link["label"].to_s)) ||
                  (search_fields.include?("url") && re.match?(link["url"].to_s)) ||
                  (search_fields.include?("description") && re.match?(link["description"].to_s)) ||
                  (search_fields.include?("id") && re.match?(id)) ||
                  (search_fields.include?("tags") && link["tags"].is_a?(Array) && link["tags"].any? { |t| re.match?(t) })
              }
            else
              halt 400, json(error: 'Provide at least one of: tag, q, regex')
            end

  # Filter configs
  config_re = nil
  if config_pattern
    config_check = Alap::ValidateRegex.call(config_pattern)
    halt 400, json(error: "Invalid config pattern: #{config_check["reason"]}") unless config_check["safe"]
    config_re = Regexp.new(config_pattern, Regexp::IGNORECASE)
  end

  rows = DB.execute("SELECT name FROM configs ORDER BY name")
  results = []
  configs_searched = 0
  links_scanned = 0

  rows.each do |name_row|
    name = name_row["name"]
    next if config_re && !config_re.match?(name)

    configs_searched += 1
    row = DB.get_first_row("SELECT config FROM configs WHERE name = ?", name)
    next unless row

    config = JSON.parse(row["config"])
    next unless config["allLinks"].is_a?(Hash)

    config["allLinks"].each do |id, link|
      links_scanned += 1
      if matcher.call(id, link)
        results << { configName: name, id: id, link: link }
        break if results.length >= max_results
      end
    end
    break if results.length >= max_results
  end

  json(results: results, configsSearched: configs_searched, linksScanned: links_scanned)
end

# POST /cherry-pick — resolve expression and return subset
post "/cherry-pick" do
  source = @json_body&.dig("source")
  expression = @json_body&.dig("expression")
  halt 400, json(error: 'Provide "source" (config name) and "expression"') unless source && expression

  row = DB.get_first_row("SELECT config FROM configs WHERE name = ?", source)
  halt 404, json(error: "Config \"#{source}\" not found") unless row

  config = JSON.parse(row["config"])
  result = Alap.cherry_pick_links(config, expression)
  json(allLinks: result)
end

# POST /query — server-side expression resolution
post "/query" do
  expression = @json_body&.dig("expression")
  config_name = @json_body&.dig("configName")
  config_names = @json_body&.dig("configs")
  halt 400, json(error: 'Provide "expression"') unless expression

  config = if config_names.is_a?(Array)
             loaded = config_names.each_with_object([]) do |name, arr|
               row = DB.get_first_row("SELECT config FROM configs WHERE name = ?", name)
               arr << JSON.parse(row["config"]) if row
             end
             halt 404, json(error: "None of the requested configs were found") if loaded.empty?
             Alap.merge_configs(*loaded)
           else
             name = config_name || "demo"
             row = DB.get_first_row("SELECT config FROM configs WHERE name = ?", name)
             halt 404, json(error: "Config \"#{name}\" not found") unless row
             JSON.parse(row["config"])
           end

  results = Alap.resolve_expression(config, expression)
  json(results: results)
end
