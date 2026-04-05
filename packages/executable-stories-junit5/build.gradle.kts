plugins {
    kotlin("jvm") version "2.1.0"
    id("com.vanniktech.maven.publish") version "0.30.0"
    id("org.jlleitschuh.gradle.ktlint") version "14.1.0"
    id("io.gitlab.arturbosch.detekt") version "1.23.8"
}

group = "dev.executablestories"
version = "0.1.0"

fun propertyOrEnv(propertyName: String, envName: String): String? =
    providers.gradleProperty(propertyName).orElse(providers.environmentVariable(envName)).orNull

val signingKey = propertyOrEnv("signingKey", "SIGNING_KEY")
val signingPassword = propertyOrEnv("signingPassword", "SIGNING_PASSWORD")

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

mavenPublishing {
    publishToMavenCentral(com.vanniktech.maven.publish.SonatypeHost.CENTRAL_PORTAL)
    if (!signingKey.isNullOrBlank() && !signingPassword.isNullOrBlank()) {
        signAllPublications()
    }

    pom {
        name.set("executable-stories-junit5")
        description.set("JUnit 5 adapter for executable-stories BDD documentation.")
        url.set("https://github.com/jagreehal/executable-stories")

        licenses {
            license {
                name.set("MIT")
                url.set("https://opensource.org/licenses/MIT")
            }
        }

        developers {
            developer {
                id.set("jagreehal")
                name.set("Jag Reehal")
            }
        }

        scm {
            url.set("https://github.com/jagreehal/executable-stories")
            connection.set("scm:git:https://github.com/jagreehal/executable-stories.git")
            developerConnection.set("scm:git:ssh://git@github.com/jagreehal/executable-stories.git")
        }
    }
}

repositories {
    mavenCentral()
}

kotlin {
    jvmToolchain(21)
}

dependencies {
    implementation("com.fasterxml.jackson.core:jackson-databind:2.18.2")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.18.2")

    compileOnly("org.junit.jupiter:junit-jupiter:5.11.4")
    compileOnly("org.junit.platform:junit-platform-launcher:1.11.4")
    compileOnly("io.opentelemetry:opentelemetry-api:1.44.1")

    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    testImplementation("org.junit.platform:junit-platform-launcher:1.11.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:1.11.4")
}

tasks.test {
    useJUnitPlatform()
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
    compilerOptions {
        allWarningsAsErrors.set(true)
    }
}

detekt {
    buildUponDefaultConfig = true
    baseline = file("detekt-baseline.xml")
}
