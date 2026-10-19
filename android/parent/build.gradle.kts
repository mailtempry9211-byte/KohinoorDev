plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.phonelink.parent"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.phonelink.parent"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        vectorDrawables {
            useSupportLibrary = true
        }
    }

    signingConfigs {
        create("release") {
            val keyStorePath = System.getenv("KEYSTORE_FILE") ?: "release.keystore"
            val keyStorePassword = System.getenv("KEYSTORE_PASSWORD")
            val keyAliasStr = System.getenv("KEY_ALIAS")
            val keyPass = System.getenv("KEY_PASSWORD")

            val keyFile = file(keyStorePath)
            if (keyFile.exists() && !keyStorePassword.isNullOrBlank() && !keyAliasStr.isNullOrBlank()) {
                storeFile = keyFile
                storePassword = keyStorePassword
                keyAlias = keyAliasStr
                keyPassword = keyPass ?: keyStorePassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            val releaseConfig = signingConfigs.findByName("release")
            if (releaseConfig?.storeFile != null && releaseConfig.storeFile!!.exists()) {
                signingConfig = releaseConfig
            }
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "META-INF/INDEX.LIST"
            excludes += "META-INF/io.netty.versions.properties"
        }
    }
}

dependencies {
    // AndroidX & UI
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.lifecycle:lifecycle-service:2.8.3")

    // JSON Serialization
    implementation("com.google.code.gson:gson:2.10.1")

    // Ktor 2.3.12 Embedded High-Performance Server (HTTP + WebSockets on single port 5000)
    implementation("io.ktor:ktor-server-core:2.3.12")
    implementation("io.ktor:ktor-server-cio:2.3.12")
    implementation("io.ktor:ktor-server-websockets:2.3.12")
    implementation("io.ktor:ktor-server-cors:2.3.12")
    implementation("io.ktor:ktor-server-content-negotiation:2.3.12")
    implementation("io.ktor:ktor-serialization-gson:2.3.12")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
