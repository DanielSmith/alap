# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require_relative "alap/sanitize_url"
require_relative "alap/validate_regex"
require_relative "alap/ssrf_guard"
require_relative "alap/link_provenance"
require_relative "alap/deep_clone"
require_relative "alap/deep_freeze"
require_relative "alap/sanitize_by_tier"
require_relative "alap/expression_parser"
require_relative "alap/validate_config"

module Alap
  # Resolve an expression against a config and return matching link hashes with IDs.
  def self.resolve_expression(config, expression, anchor_id: nil)
    parser = ExpressionParser.new(config)
    ids = parser.query(expression, anchor_id: anchor_id)
    all_links = config["allLinks"] || {}

    ids.each_with_object([]) do |item_id, results|
      link = all_links[item_id]
      next unless link.is_a?(Hash)

      results << { "id" => item_id }.merge(sanitize_link(link))
    end
  end

  # Resolve an expression and return { "allLinks" => { id => link, ... } }.
  def self.cherry_pick_links(config, expression)
    parser = ExpressionParser.new(config)
    ids = parser.query(expression)
    all_links = config["allLinks"] || {}

    result = {}
    ids.each do |item_id|
      link = all_links[item_id]
      result[item_id] = sanitize_link(link) if link.is_a?(Hash)
    end
    result
  end

  # Shallow-merge multiple Alap configs. Later configs win on collision.
  def self.merge_configs(*configs)
    blocked = Set.new(%w[__proto__ constructor prototype])
    settings = {}
    macros = {}
    all_links = {}
    search_patterns = {}
    protocols = {}

    configs.each do |cfg|
      next unless cfg.is_a?(Hash)

      (cfg["settings"] || {}).each { |k, v| settings[k] = v unless blocked.include?(k) }
      (cfg["macros"] || {}).each { |k, v| macros[k] = v unless blocked.include?(k) }
      (cfg["allLinks"] || {}).each { |k, v| all_links[k] = v unless blocked.include?(k) }
      (cfg["searchPatterns"] || {}).each { |k, v| search_patterns[k] = v unless blocked.include?(k) }
      (cfg["protocols"] || {}).each { |k, v| protocols[k] = v unless blocked.include?(k) }
    end

    result = { "allLinks" => all_links }
    result["settings"] = settings unless settings.empty?
    result["macros"] = macros unless macros.empty?
    result["searchPatterns"] = search_patterns unless search_patterns.empty?
    result["protocols"] = protocols unless protocols.empty?
    result
  end

  def self.sanitize_link(link)
    url = link["url"]
    if url.is_a?(String)
      safe = SanitizeUrl.call(url)
      return link.merge("url" => safe) if safe != url
    end
    link
  end
  private_class_method :sanitize_link
end
