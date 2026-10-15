plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.phonelink.hub"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.phonelink.localhub"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
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
            isMinifyEnabled = true
            isShrinkResources = true
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
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity:1.9.2")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.lifecycle:lifecycle-service:2.8.3")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.android.gms:play-services-location:21.3.0")
    // FEATURE D: 15-min keep-alive safety net beyond START_STICKY.
    implementation("androidx.work:work-runtime-ktx:2.9.0")
}