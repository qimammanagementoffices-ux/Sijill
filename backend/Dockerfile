# Multi-stage build: compile with Gradle (no local wrapper required),
# ship only the runtime JRE + jar.

FROM gradle:8.10-jdk21-alpine AS build
WORKDIR /home/gradle/src
COPY build.gradle.kts settings.gradle.kts ./
# Resolve dependencies in their own layer, keyed only on the build files. src
# changes on every deploy, so without this the layer below is always a cache
# miss and every deploy re-downloads the whole dependency graph before it can
# start compiling.
RUN gradle --no-daemon dependencies --configuration runtimeClasspath > /dev/null
COPY src src
RUN gradle build --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# pg_dump for the daily backup job (BackupService) — shells out to it
# via ProcessBuilder rather than a JDBC-based dump implementation.
RUN apk add --no-cache postgresql-client
RUN addgroup -S sijill && adduser -S sijill -G sijill
COPY --from=build /home/gradle/src/build/libs/*.jar app.jar
USER sijill
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
