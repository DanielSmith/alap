# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

module Alap
  # Tier-aware sanitizers — Ruby port of src/core/sanitizeByTier.ts.
  #
  # Consumers (renderers, anything that takes a validated link and
  # forwards it into a rendered surface) read provenance off each link
  # and apply the appropriate rule: strict on anything that crossed a
  # trust boundary (storage adapter, protocol handler, unstamped), loose
  # on author-tier links the developer hand-wrote.
  #
  # Fail-closed policy: a link with no provenance stamp is treated as
  # untrusted. Alap::ValidateConfig stamps every link it returns, so the
  # only way an unstamped link ends up here is if it bypassed validation
  # — a code path that should not exist in normal use.
  module SanitizeByTier
    # Loose sanitize for author-tier, strict otherwise.
    #
    # Author-tier gets +Alap::SanitizeUrl.call+ (permits +tel:+, +mailto:+,
    # and any custom developer-intended scheme that is not explicitly
    # dangerous). Everything else — including unstamped — gets
    # +Alap::SanitizeUrl.strict+ (+http+ / +https+ / +mailto+ only).
    def self.url(url, link)
      if Alap::LinkProvenance.author_tier?(link)
        Alap::SanitizeUrl.call(url)
      else
        Alap::SanitizeUrl.strict(url)
      end
    end

    # Author keeps its +cssClass+; everything else drops it.
    #
    # Attacker-controlled class names can target CSS selectors that
    # exfiltrate data via +content: attr(...)+, trigger layout-driven
    # side channels, or overlay visible UI to mislead the user. There
    # is no narrow allowlist that beats "do not let untrusted input
    # pick a class at all."
    def self.css_class(css_class, link)
      return nil if css_class.nil?
      Alap::LinkProvenance.author_tier?(link) ? css_class : nil
    end

    # Author passes +targetWindow+ through (including +nil+); everything
    # else clamps to +_blank+ unconditionally.
    #
    # Even when a non-author link did not specify its own target, we
    # still clamp to +_blank+ rather than let it inherit the author's
    # named-window default (e.g. +"fromAlap"+). Letting a storage- or
    # protocol-tier link ride into an author-reserved window would let
    # it overwrite whatever the author had open there.
    def self.target_window(target_window, link)
      return target_window if Alap::LinkProvenance.author_tier?(link)
      "_blank"
    end
  end
end
