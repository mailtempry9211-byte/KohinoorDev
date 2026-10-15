# Keep default Android optimizations
-dontwarn org.jetbrains.annotations.**

# OkHttp & Okio
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Phone Link Hub Components
-keep class com.phonelink.hub.data.** { *; }
-keep class com.phonelink.hub.system.** { *; }
-keep class com.phonelink.hub.media.** { *; }
-keep class com.phonelink.hub.remote.** { *; }
-keep class com.phonelink.hub.notifications.** { *; }
-keep class com.phonelink.hub.receiver.** { *; }
-keep class com.phonelink.hub.service.** { *; }
-keep class com.phonelink.hub.accessibility.** { *; }
-keep class com.phonelink.hub.blocker.** { *; }
-keep class com.phonelink.hub.util.** { *; }
-keep class com.phonelink.hub.calls.** { *; }
-keep class com.phonelink.hub.sms.** { *; }
-keep class com.phonelink.hub.contacts.** { *; }
-keep class com.phonelink.hub.location.** { *; }
-keep class com.phonelink.hub.files.** { *; }
-keep class com.phonelink.hub.findphone.** { *; }

# WorkManager
-keep class * extends androidx.work.Worker { *; }
-keep class * extends androidx.work.ListenableWorker { *; }
-keep class * extends androidx.work.WorkerParameters { *; }