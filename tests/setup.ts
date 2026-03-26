/**
 * Global test setup — runs once before all test suites.
 *
 * The [alap] warnings on stderr are expected. Tests deliberately exercise
 * error-handling paths (bad configs, missing keys, network failures, etc.)
 * and the library logs warnings for each one. A clean run still shows
 * these lines — they do not indicate a problem.
 */
export default function setup() {
  console.log(
    '\n' +
    '  Note: [alap] warnings on stderr are expected.\n' +
    '  Tests exercise error-handling paths that trigger console.warn.\n'
  );
}
