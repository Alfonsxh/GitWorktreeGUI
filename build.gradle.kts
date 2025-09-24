import org.jetbrains.intellij.platform.gradle.TestFrameworkType
import org.gradle.jvm.toolchain.JavaLanguageVersion

plugins {
    id("org.jetbrains.intellij.platform") version "2.0.0"
    kotlin("jvm") version "1.9.24"
}

group = "com.alfons.worktree"
version = "0.1.0"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

kotlin {
    jvmToolchain(21)
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

dependencies {
    testImplementation(kotlin("test"))

    intellijPlatform {
        intellijIdeaUltimate("2024.3")
        bundledPlugins("Git4Idea", "org.jetbrains.plugins.terminal")
        instrumentationTools()
        pluginVerifier()
        testFramework(TestFrameworkType.Platform)
    }
}

intellijPlatform {
    pluginConfiguration {
        id = "com.alfons.worktree.plugin"
        name = "Worktree Toolwindow"
        version = providers.provider { project.version.toString() }
        description = providers.provider { "Worktree lifecycle management integrated into Git tool window." }
        vendor {
            name = "Alfons"
        }
        ideaVersion {
            sinceBuild = "243"
            untilBuild = "251.*"
        }
    }

    publishing {
        token = providers.environmentVariable("JETBRAINS_PUBLISH_TOKEN")
    }

    signing {
        certificateChain = providers.environmentVariable("JB_CERTIFICATE_CHAIN")
        privateKey = providers.environmentVariable("JB_PRIVATE_KEY")
        password = providers.environmentVariable("JB_PRIVATE_KEY_PASSWORD")
    }
}
