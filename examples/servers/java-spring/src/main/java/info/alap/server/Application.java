// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package info.alap.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Alap Config Server — Spring Boot + SQLite.
 *
 * <p>Serves the standard Alap REST API for storing, querying, and resolving
 * link configurations. Uses the Alap Java expression parser for server-side
 * expression resolution.
 */
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
