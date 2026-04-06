// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package info.alap.server;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import info.alap.server.ConfigRepository.ConfigRecord;

/**
 * Business logic for Alap configurations — JSON parsing, hyphen warnings,
 * and delegation to the repository.
 */
@Service
public class ConfigService {

    private static final Logger log = LoggerFactory.getLogger(ConfigService.class);
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final ConfigRepository repository;
    private final ObjectMapper mapper;

    public ConfigService(ConfigRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    public List<String> listNames() {
        return repository.listNames();
    }

    public Optional<ConfigWithMeta> findByName(String name) {
        return repository.findByName(name).map(this::toConfigWithMeta);
    }

    public Map<String, Object> loadConfigMap(String name) {
        return repository.findByName(name)
            .map(record -> parseJson(record.config()))
            .orElse(null);
    }

    public List<ConfigRepository.ConfigRecord> findAll() {
        return repository.findAll();
    }

    public void save(String name, Map<String, Object> config) {
        warnHyphens(config);
        try {
            repository.upsert(name, mapper.writeValueAsString(config));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize config", e);
        }
    }

    public void delete(String name) {
        repository.delete(name);
    }

    public Map<String, Object> parseJson(String json) {
        try {
            return mapper.readValue(json, MAP_TYPE);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid JSON", e);
        }
    }

    private ConfigWithMeta toConfigWithMeta(ConfigRecord record) {
        Map<String, Object> config = parseJson(record.config());
        return new ConfigWithMeta(config, record.createdAt(), record.updatedAt());
    }

    private void warnHyphens(Map<String, Object> config) {
        List<String> sections = List.of("allLinks", "macros", "searchPatterns");
        for (String section : sections) {
            Object value = config.get(section);
            if (value instanceof Map<?, ?> map) {
                for (Object key : map.keySet()) {
                    if (key instanceof String s && s.contains("-")) {
                        log.warn("[alap] {} key \"{}\" contains a hyphen — use underscores. "
                            + "\"-\" is the WITHOUT operator.", section, s);
                    }
                }
            }
        }
    }

    public record ConfigWithMeta(Map<String, Object> config, String createdAt, String updatedAt) {}
}
