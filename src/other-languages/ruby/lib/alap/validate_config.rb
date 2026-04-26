# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "set"

module Alap
  # Raised when a config has a legacy shape requiring migration.
  #
  # Currently thrown by +Alap::ValidateConfig.assert_no_handlers_in_config+
  # when a +config["protocols"][<name>]["generate" | "filter" | "handler"]+
  # slot holds a callable. Handlers must be registered separately via the
  # runtime registry; the config itself is pure data.
  class ConfigMigrationError < StandardError; end

  # Config validation — Ruby port of src/core/validateConfig.ts.
  #
  # Takes an untrusted config hash and returns a frozen,
  # provenance-stamped copy. Mirrors the 3.2 reference behaviour:
  #
  # - deep-clones the input (rejects Procs, class instances, Hash/Array
  #   subclasses, cycles);
  # - rejects callable protocol handlers with +ConfigMigrationError+;
  # - stamps each validated link with the caller-supplied provenance tier;
  # - enforces the hooks allowlist against non-author tiers (fail-closed
  #   when +settings.hooks+ is not declared);
  # - sanitizes every URL-bearing field (+url+, +image+, +thumbnail+,
  #   and any +meta.*Url+ key) through +Alap::SanitizeUrl.call+;
  # - strips +__proto__+, +constructor+, +prototype+ keys from all
  #   Hash-shaped fields, including nested +link["meta"]+;
  # - rejects hyphens in link IDs, tag names, macro names, and
  #   searchPattern keys (+-+ is the WITHOUT operator in expressions);
  # - deep-freezes the returned config so handlers see the shape the
  #   validator approved;
  # - short-circuits when re-validating a config it has already produced
  #   (so storage-tier stamps are not overwritten to +"author"+).
  module ValidateConfig
    LINK_FIELD_WHITELIST = Set.new(%w[
      url label tags cssClass image altText targetWindow
      description thumbnail hooks guid createdAt
    ]).freeze

    BLOCKED_KEYS = Set.new(%w[
      __proto__ constructor prototype
      __class__ __bases__ __mro__ __subclasses__
    ]).freeze

    URL_KEY_RE = /url\z/i

    # Module-level WeakMap tracking configs this validator has produced.
    # Weak-keyed so entries auto-clear as the config hashes are GC'd.
    # The WeakMap is the idempotence witness: membership is proof that
    # +call+ produced the hash, so an external caller cannot forge
    # idempotence from outside.
    VALIDATED = ObjectSpace::WeakMap.new

    # Reject callable-valued protocol handlers in +config+.
    #
    # Handlers must be registered via the runtime registry, not embedded
    # in the config. Thrown loudly at the validate front door so the
    # shape mismatch surfaces with the exact field name, not as a
    # missing handler at first dispatch.
    def self.assert_no_handlers_in_config(config)
      return unless config.is_a?(Hash)
      protocols = config["protocols"]
      return unless protocols.is_a?(Hash)

      protocols.each do |name, entry|
        next unless entry.is_a?(Hash)
        %w[generate filter handler].each do |field|
          value = entry[field]
          if value.is_a?(Proc) || value.is_a?(Method) || value.is_a?(UnboundMethod)
            raise ConfigMigrationError,
                  "config[\"protocols\"][#{name.inspect}][#{field.inspect}] is a " \
                  "callable — handlers must be registered separately via the " \
                  "runtime registry, not embedded in the config. " \
                  "See docs/handlers-out-of-config.md."
          end
        end
      end
    end

    # Single source of truth for URL-scheme sanitization on a link.
    #
    # Scans +url+, +image+, +thumbnail+, and any +meta+ key whose name
    # ends with +url+ (case-insensitive), passing each through
    # +Alap::SanitizeUrl.call+. Strips +__proto__+, +constructor+,
    # +prototype+ (plus the Python-port dunders retained for cross-port
    # parity) from +meta+ during the pass.
    def self.sanitize_link_urls(link)
      out = link.dup
      out["url"] = Alap::SanitizeUrl.call(link["url"]) if link["url"].is_a?(String)
      out["image"] = Alap::SanitizeUrl.call(link["image"]) if link["image"].is_a?(String)
      out["thumbnail"] = Alap::SanitizeUrl.call(link["thumbnail"]) if link["thumbnail"].is_a?(String)
      raw_meta = link["meta"]
      if raw_meta.is_a?(Hash)
        safe_meta = {}
        raw_meta.each do |mk, mv|
          next if BLOCKED_KEYS.include?(mk)
          safe_meta[mk] = if mv.is_a?(String) && URL_KEY_RE.match?(mk)
                           Alap::SanitizeUrl.call(mv)
                         else
                           mv
                         end
        end
        out["meta"] = safe_meta
      end
      out
    end

    # Validate and sanitize +config+ from an untrusted source.
    #
    # Returns a frozen copy with each link stamped with +provenance+.
    # Raises +ArgumentError+ on structural invalidity,
    # +ConfigMigrationError+ on callable handlers, or
    # +Alap::DeepClone::Error+ on non-data types / cycles / over-bound
    # structures.
    def self.call(config, provenance: "author")
      # Idempotence short-circuit: a pre-validated config has its
      # original provenance stamps (including storage-tier stamps from
      # storage adapters); re-running the pipeline would overwrite them
      # to "author". VALIDATED membership is proof we produced this
      # object, so the caller cannot forge idempotence from outside.
      return config if config.is_a?(Hash) && VALIDATED[config]

      raise ArgumentError, "Invalid config: expected a Hash" unless config.is_a?(Hash)

      # Reject callable protocol handlers before any further processing
      # so the migration error surfaces at the exact field name, not as
      # a generic "not data" from DeepClone.
      assert_no_handlers_in_config(config)

      # Detach from caller; DeepClone rejects callables / class
      # instances / cycles / non-String keys / over-bound structures.
      raw = Alap::DeepClone.call(config)

      # Hook allowlist pulled from settings up front so the per-link
      # pass below can filter non-author-tier hooks against it.
      raw_settings = raw["settings"]
      hook_allowlist =
        if raw_settings.is_a?(Hash) && raw_settings["hooks"].is_a?(Array)
          Set.new(raw_settings["hooks"].select { |h| h.is_a?(String) })
        end

      # --- allLinks (required) ---------------------------------------
      raw_links = raw["allLinks"]
      raise ArgumentError, "Invalid config: allLinks must be a non-null Hash" unless raw_links.is_a?(Hash)

      sanitized_links = {}
      raw_links.each do |key, link|
        next if BLOCKED_KEYS.include?(key)

        if key.include?("-")
          warn "[Alap] validate_config: skipping allLinks[#{key.inspect}] — " \
               "hyphens are not allowed in item IDs. Use underscores " \
               "instead. The \"-\" character is the WITHOUT operator in expressions."
          next
        end

        unless link.is_a?(Hash)
          warn "[Alap] validate_config: skipping allLinks[#{key.inspect}] — not a valid link object"
          next
        end

        unless link["url"].is_a?(String)
          warn "[Alap] validate_config: skipping allLinks[#{key.inspect}] — missing or invalid url"
          next
        end

        # Tags — strings only, reject hyphens.
        tags = nil
        if link.key?("tags")
          if link["tags"].is_a?(Array)
            tags = link["tags"].select do |t|
              next false unless t.is_a?(String)

              if t.include?("-")
                warn "[Alap] validate_config: allLinks[#{key.inspect}] — " \
                     "stripping tag #{t.inspect} (hyphens not allowed in tags). " \
                     "Use underscores instead."
                next false
              end

              true
            end
          else
            warn "[Alap] validate_config: allLinks[#{key.inspect}].tags is not an Array — ignoring"
          end
        end

        # Shape via whitelist.
        shaped = { "url" => link["url"] }
        shaped["label"] = link["label"] if link["label"].is_a?(String)
        shaped["tags"] = tags unless tags.nil?
        shaped["cssClass"] = link["cssClass"] if link["cssClass"].is_a?(String)
        shaped["image"] = link["image"] if link["image"].is_a?(String)
        shaped["altText"] = link["altText"] if link["altText"].is_a?(String)
        shaped["targetWindow"] = link["targetWindow"] if link["targetWindow"].is_a?(String)
        shaped["description"] = link["description"] if link["description"].is_a?(String)
        shaped["thumbnail"] = link["thumbnail"] if link["thumbnail"].is_a?(String)

        # Hooks — tier-aware allowlist enforcement.
        if link["hooks"].is_a?(Array)
          string_hooks = link["hooks"].select { |h| h.is_a?(String) }
          if provenance == "author"
            shaped["hooks"] = string_hooks unless string_hooks.empty?
          elsif hook_allowlist
            allowed = []
            string_hooks.each do |h|
              if hook_allowlist.include?(h)
                allowed << h
              else
                warn "[Alap] validate_config: allLinks[#{key.inspect}] — " \
                     "stripping hook #{h.inspect} not in settings.hooks " \
                     "allowlist (tier: #{provenance})"
              end
            end
            shaped["hooks"] = allowed unless allowed.empty?
          elsif !string_hooks.empty?
            warn "[Alap] validate_config: allLinks[#{key.inspect}] — " \
                 "dropping #{string_hooks.length} hook(s) on #{provenance}-tier " \
                 "link; declare settings.hooks to allow specific keys"
          end
        end

        shaped["guid"] = link["guid"] if link["guid"].is_a?(String)
        shaped["createdAt"] = link["createdAt"] if link.key?("createdAt")

        # Meta — copy with nested BLOCKED_KEYS filter. (sanitize_link_urls
        # will run a second pass that also strips blocked keys and
        # sanitises *Url fields; this first pass makes sure shaped["meta"]
        # is already a fresh hash.)
        if link["meta"].is_a?(Hash)
          raw_meta = link["meta"]
          safe_meta = {}
          raw_meta.each do |mk, mv|
            next if BLOCKED_KEYS.include?(mk)
            safe_meta[mk] = mv
          end
          shaped["meta"] = safe_meta
        end

        # Single source of truth for URL-field sanitization.
        final_link = sanitize_link_urls(shaped)

        # Stamp provenance AFTER the whitelist pass — since shaped was
        # built from a fixed set of known keys, an incoming config
        # cannot pre-stamp itself via a forged _provenance field.
        Alap::LinkProvenance.stamp(final_link, provenance)

        sanitized_links[key] = final_link
      end

      # --- settings (optional) ---------------------------------------
      settings = nil
      if raw_settings.is_a?(Hash)
        settings = {}
        raw_settings.each do |skey, sval|
          next if BLOCKED_KEYS.include?(skey)
          settings[skey] = sval
        end
      end

      # --- macros (optional) -----------------------------------------
      macros = nil
      raw_macros = raw["macros"]
      if raw_macros.is_a?(Hash)
        macros = {}
        raw_macros.each do |mkey, macro|
          next if BLOCKED_KEYS.include?(mkey)

          if mkey.include?("-")
            warn "[Alap] validate_config: skipping macro #{mkey.inspect} — " \
                 "hyphens are not allowed in macro names. Use underscores " \
                 "instead. The \"-\" character is the WITHOUT operator in expressions."
            next
          end

          if macro.is_a?(Hash) && macro["linkItems"].is_a?(String)
            macros[mkey] = macro
          else
            warn "[Alap] validate_config: skipping macro #{mkey.inspect} — invalid shape"
          end
        end
      end

      # --- searchPatterns (optional) --------------------------------
      search_patterns = nil
      raw_patterns = raw["searchPatterns"]
      if raw_patterns.is_a?(Hash)
        search_patterns = {}
        raw_patterns.each do |pkey, entry|
          next if BLOCKED_KEYS.include?(pkey)

          if pkey.include?("-")
            warn "[Alap] validate_config: skipping searchPattern #{pkey.inspect} — " \
                 "hyphens are not allowed in pattern keys. Use underscores " \
                 "instead. The \"-\" character is the WITHOUT operator in expressions."
            next
          end

          if entry.is_a?(Hash) && entry["pattern"].is_a?(String)
            validation = Alap::ValidateRegex.call(entry["pattern"])
            if validation["safe"]
              search_patterns[pkey] = entry
            else
              warn "[Alap] validate_config: removing searchPattern " \
                   "#{pkey.inspect} — #{validation["reason"]}"
            end
            next
          end

          if entry.is_a?(String)
            validation = Alap::ValidateRegex.call(entry)
            if validation["safe"]
              search_patterns[pkey] = entry
            else
              warn "[Alap] validate_config: removing searchPattern " \
                   "#{pkey.inspect} — #{validation["reason"]}"
            end
            next
          end

          warn "[Alap] validate_config: skipping searchPattern #{pkey.inspect} — invalid shape"
        end
      end

      # --- protocols (optional, data-only since 3.2) ---------------
      protocols = nil
      raw_protocols = raw["protocols"]
      if raw_protocols.is_a?(Hash)
        protocols = {}
        raw_protocols.each do |pkey, pval|
          next if BLOCKED_KEYS.include?(pkey)
          protocols[pkey] = pval
        end
      end

      # Assemble, freeze, track.
      result = { "allLinks" => sanitized_links }
      result["settings"] = settings if settings
      result["macros"] = macros if macros
      result["searchPatterns"] = search_patterns if search_patterns
      result["protocols"] = protocols if protocols

      Alap::DeepFreeze.call(result)
      VALIDATED[result] = true
      result
    end
  end
end
