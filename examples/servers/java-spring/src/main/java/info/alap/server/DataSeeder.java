// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package info.alap.server;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds the database with a demo configuration on first startup.
 *
 * <p>Skips seeding if the "demo" config already exists (idempotent).
 * Same 12 items and 2 macros used by every Alap server example.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final ConfigRepository repository;
    private final ObjectMapper mapper;

    public DataSeeder(ConfigRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    public void run(String... args) throws Exception {
        if (repository.findByName("demo").isPresent()) {
            log.info("Demo config already exists — skipping seed");
            return;
        }

        Map<String, Object> demoConfig = Map.ofEntries(
            Map.entry("settings", Map.of(
                "listType", "ul",
                "menuTimeout", 5000
            )),
            Map.entry("macros", Map.of(
                "cars", Map.of("linkItems", "vwbug, bmwe36"),
                "nycbridges", Map.of("linkItems", ".nyc + .bridge")
            )),
            Map.entry("allLinks", Map.ofEntries(
                Map.entry("vwbug", Map.of(
                    "label", "VW Bug \u2014 Wikipedia",
                    "url", "https://en.wikipedia.org/wiki/Volkswagen_Beetle",
                    "tags", List.of("car", "vw", "germany")
                )),
                Map.entry("bmwe36", Map.of(
                    "label", "BMW E36 \u2014 Wikipedia",
                    "url", "https://en.wikipedia.org/wiki/BMW_3_Series_(E36)",
                    "tags", List.of("car", "bmw", "germany")
                )),
                Map.entry("miata", Map.of(
                    "label", "Mazda Miata \u2014 Wikipedia",
                    "url", "https://en.wikipedia.org/wiki/Mazda_MX-5",
                    "tags", List.of("car", "mazda", "japan")
                )),
                Map.entry("brooklyn", Map.of(
                    "label", "Brooklyn Bridge",
                    "url", "https://en.wikipedia.org/wiki/Brooklyn_Bridge",
                    "tags", List.of("nyc", "bridge", "landmark")
                )),
                Map.entry("manhattan", Map.of(
                    "label", "Manhattan Bridge",
                    "url", "https://en.wikipedia.org/wiki/Manhattan_Bridge",
                    "tags", List.of("nyc", "bridge")
                )),
                Map.entry("highline", Map.of(
                    "label", "The High Line",
                    "url", "https://en.wikipedia.org/wiki/High_Line",
                    "tags", List.of("nyc", "park", "landmark")
                )),
                Map.entry("centralpark", Map.of(
                    "label", "Central Park",
                    "url", "https://en.wikipedia.org/wiki/Central_Park",
                    "tags", List.of("nyc", "park")
                )),
                Map.entry("goldengate", Map.of(
                    "label", "Golden Gate Bridge",
                    "url", "https://en.wikipedia.org/wiki/Golden_Gate_Bridge",
                    "tags", List.of("sf", "bridge", "landmark")
                )),
                Map.entry("dolores", Map.of(
                    "label", "Dolores Park",
                    "url", "https://en.wikipedia.org/wiki/Dolores_Park",
                    "tags", List.of("sf", "park")
                )),
                Map.entry("aqus", Map.of(
                    "label", "Aqus Cafe",
                    "url", "https://aqus.com",
                    "tags", List.of("coffee", "sf")
                )),
                Map.entry("bluebottle", Map.of(
                    "label", "Blue Bottle Coffee",
                    "url", "https://bluebottlecoffee.com",
                    "tags", List.of("coffee", "sf", "nyc")
                )),
                Map.entry("acre", Map.of(
                    "label", "Acre Coffee",
                    "url", "https://acrecoffee.com",
                    "tags", List.of("coffee")
                ))
            ))
        );

        repository.upsert("demo", mapper.writeValueAsString(demoConfig));
        log.info("Seeded 'demo' config into database");
    }
}
