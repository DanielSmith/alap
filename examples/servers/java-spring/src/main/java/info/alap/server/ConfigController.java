// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package info.alap.server;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import alap.ExpressionParser;
import alap.ValidateRegex;

import info.alap.server.ConfigRepository.ConfigRecord;
import info.alap.server.ConfigService.ConfigWithMeta;

/**
 * REST controller implementing the standard Alap config server API.
 *
 * <p>Endpoints:
 * <ol>
 *   <li>{@code GET /configs} — list all config names</li>
 *   <li>{@code GET /configs/{name}} — load a config</li>
 *   <li>{@code PUT /configs/{name}} — save / upsert a config</li>
 *   <li>{@code DELETE /configs/{name}} — remove a config</li>
 *   <li>{@code GET /search} — search across all configs</li>
 *   <li>{@code POST /cherry-pick} — resolve expression, return matching links as map</li>
 *   <li>{@code POST /query} — resolve expression, return matching links as list</li>
 * </ol>
 */
@RestController
@CrossOrigin
public class ConfigController {

    private final ConfigService configService;

    public ConfigController(ConfigService configService) {
        this.configService = configService;
    }

    // ── 1. List configs ─────────────────────────────────────────────────

    @GetMapping("/configs")
    public List<String> listConfigs() {
        return configService.listNames();
    }

    // ── 2. Load config ──────────────────────────────────────────────────

    @GetMapping("/configs/{name}")
    public ResponseEntity<?> loadConfig(@PathVariable String name) {
        return configService.findByName(name)
            .<ResponseEntity<?>>map(result -> ResponseEntity.ok(Map.of(
                "config", result.config(),
                "meta", Map.of(
                    "createdAt", nullSafe(result.createdAt()),
                    "updatedAt", nullSafe(result.updatedAt())
                )
            )))
            .orElse(ResponseEntity.status(404).body(Map.of("error", "Config not found")));
    }

    // ── 3. Save config ──────────────────────────────────────────────────

    @PutMapping("/configs/{name}")
    public ResponseEntity<Void> saveConfig(@PathVariable String name,
                                           @RequestBody Map<String, Object> body) {
        configService.save(name, body);
        return ResponseEntity.noContent().build();
    }

    // ── 4. Delete config ────────────────────────────────────────────────

    @DeleteMapping("/configs/{name}")
    public ResponseEntity<Void> deleteConfig(@PathVariable String name) {
        configService.delete(name);
        return ResponseEntity.noContent().build();
    }

    // ── 5. Search ───────────────────────────────────────────────────────

    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String regex,
            @RequestParam(defaultValue = "label,url,tags,description,id") String fields,
            @RequestParam(required = false) String config,
            @RequestParam(defaultValue = "100") int limit) {

        limit = Math.min(limit, 1000);
        List<String> fieldList = List.of(fields.split(","));

        // Validate and compile regex patterns
        Pattern compiledRegex = null;
        if (regex != null) {
            var check = ValidateRegex.validate(regex);
            if (!check.safe()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid regex: " + check.reason()));
            }
            try {
                compiledRegex = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
            } catch (PatternSyntaxException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid regex"));
            }
        }

        Pattern configRegex = null;
        if (config != null) {
            var check = ValidateRegex.validate(config);
            if (!check.safe()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid config regex: " + check.reason()));
            }
            try {
                configRegex = Pattern.compile(config, Pattern.CASE_INSENSITIVE);
            } catch (PatternSyntaxException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid config regex"));
            }
        }

        List<Map<String, Object>> results = new ArrayList<>();
        int configsSearched = 0;
        int linksScanned = 0;

        for (ConfigRecord record : configService.findAll()) {
            if (configRegex != null && !configRegex.matcher(record.name()).find()) {
                continue;
            }
            configsSearched++;

            Map<String, Object> parsed = configService.parseJson(record.config());
            Object allLinksObj = parsed.get("allLinks");
            if (!(allLinksObj instanceof Map<?, ?> allLinks)) {
                continue;
            }

            for (Map.Entry<?, ?> entry : allLinks.entrySet()) {
                if (results.size() >= limit) break;
                linksScanned++;

                String linkId = String.valueOf(entry.getKey());
                if (!(entry.getValue() instanceof Map<?, ?> link)) continue;

                @SuppressWarnings("unchecked")
                Map<String, Object> linkMap = (Map<String, Object>) link;

                if (matchesSearch(linkMap, linkId, tag, q, compiledRegex, fieldList)) {
                    results.add(Map.of(
                        "configName", record.name(),
                        "id", linkId,
                        "link", linkMap
                    ));
                }
            }
            if (results.size() >= limit) break;
        }

        return ResponseEntity.ok(Map.of(
            "results", results,
            "configsSearched", configsSearched,
            "linksScanned", linksScanned
        ));
    }

    // ── 6. Cherry-pick ──────────────────────────────────────────────────

    @PostMapping("/cherry-pick")
    public ResponseEntity<?> cherryPick(@RequestBody Map<String, String> body) {
        String source = body.get("source");
        String expression = body.get("expression");

        if (source == null || expression == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Provide \"source\" and \"expression\""));
        }

        Map<String, Object> configMap = configService.loadConfigMap(source);
        if (configMap == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Config \"" + source + "\" not found"));
        }

        Map<String, Object> allLinks = ExpressionParser.cherryPick(configMap, expression);
        return ResponseEntity.ok(Map.of("allLinks", allLinks));
    }

    // ── 7. Query ────────────────────────────────────────────────────────

    @PostMapping("/query")
    public ResponseEntity<?> query(@RequestBody Map<String, Object> body) {
        String expression = (String) body.get("expression");
        if (expression == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Provide \"expression\""));
        }

        Map<String, Object> configMap;

        Object configsObj = body.get("configs");
        if (configsObj instanceof List<?> configNames) {
            List<Map<String, Object>> configs = new ArrayList<>();
            for (Object nameObj : configNames) {
                Map<String, Object> c = configService.loadConfigMap(String.valueOf(nameObj));
                if (c != null) configs.add(c);
            }
            if (configs.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "None of the requested configs were found"));
            }
            @SuppressWarnings("unchecked")
            Map<String, Object>[] arr = configs.toArray(new Map[0]);
            configMap = ExpressionParser.mergeConfigs(arr);
        } else {
            String configName = body.containsKey("configName")
                ? String.valueOf(body.get("configName"))
                : "demo";
            configMap = configService.loadConfigMap(configName);
            if (configMap == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Config \"" + configName + "\" not found"));
            }
        }

        List<Map<String, Object>> results = ExpressionParser.resolve(configMap, expression);
        return ResponseEntity.ok(Map.of("results", results));
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private static boolean matchesSearch(Map<String, Object> link, String linkId,
                                         String tag, String q, Pattern regex,
                                         List<String> fields) {
        // Tag filter is independent
        if (tag != null) {
            Object tagsObj = link.get("tags");
            if (!(tagsObj instanceof List<?> tags) || !tags.contains(tag)) {
                return false;
            }
        }

        // Text or regex search across selected fields
        if (q != null || regex != null) {
            List<String> values = fieldValues(link, linkId, fields);
            if (q != null) {
                String lower = q.toLowerCase();
                if (values.stream().noneMatch(v -> v.toLowerCase().contains(lower))) {
                    return false;
                }
            }
            if (regex != null) {
                if (values.stream().noneMatch(v -> regex.matcher(v).find())) {
                    return false;
                }
            }
        }

        // No criteria means no match
        if (tag == null && q == null && regex == null) {
            return false;
        }

        return true;
    }

    private static List<String> fieldValues(Map<String, Object> link, String linkId,
                                            List<String> fields) {
        List<String> values = new ArrayList<>();
        for (String field : fields) {
            switch (field.strip()) {
                case "id" -> values.add(linkId);
                case "tags" -> {
                    Object tagsObj = link.get("tags");
                    if (tagsObj instanceof List<?> tags) {
                        tags.forEach(t -> values.add(String.valueOf(t)));
                    }
                }
                default -> {
                    Object val = link.get(field.strip());
                    if (val != null) values.add(String.valueOf(val));
                }
            }
        }
        return values;
    }

    private static Object nullSafe(Object value) {
        return value != null ? value : "";
    }
}
