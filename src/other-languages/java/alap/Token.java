// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

/**
 * Lexer tokens for the Alap expression grammar.
 *
 * <p>Sealed interface with record variants — the compiler enforces exhaustive
 * pattern matching in {@code switch} expressions, same guarantee Rust's
 * {@code enum Token} provides.
 */
public sealed interface Token {

    // Variants carrying a value
    record ItemId(String value)   implements Token {}
    record Class(String value)    implements Token {}
    record DomRef(String value)   implements Token {}
    record Regex(String value)    implements Token {}
    record Protocol(String value) implements Token {}
    record Refiner(String value)  implements Token {}

    // Operator / punctuation singletons
    record Plus()   implements Token {}
    record Pipe()   implements Token {}
    record Minus()  implements Token {}
    record Comma()  implements Token {}
    record LParen() implements Token {}
    record RParen() implements Token {}
}
