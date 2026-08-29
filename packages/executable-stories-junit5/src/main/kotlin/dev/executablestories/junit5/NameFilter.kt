package dev.executablestories.junit5

/**
 * How much of each source file this run covered.
 *
 * The JUnit Platform does not expose discovery filters to an execution listener,
 * so unlike the Vitest, Jest and Playwright adapters this cannot be read off a
 * config object. Two things can still be observed: Maven Surefire's `-Dtest=`
 * arrives as a system property, and EXECUTABLE_STORIES_FILTERED lets a wrapper
 * state what it knows.
 *
 * Returns null when neither says anything, because the run genuinely might have
 * been narrowed by Gradle's `--tests` or an IDE run configuration. Null means
 * unknown, and a consumer keeps what an unknown-scope run did not report rather
 * than retiring it on a guess.
 *
 * @param testProperty value of the `test` system property, or null
 * @param filteredEnv value of EXECUTABLE_STORIES_FILTERED, or null
 */
internal fun runScope(
    testProperty: String?,
    filteredEnv: String?,
): String? {
    val env = filteredEnv?.trim()?.lowercase()
    return when {
        // Explicit either way: an operator saying "0" states the run was complete.
        !env.isNullOrEmpty() -> if (env == "0" || env == "false") "full" else "filtered"
        !testProperty.isNullOrBlank() -> "filtered"
        else -> null
    }
}
