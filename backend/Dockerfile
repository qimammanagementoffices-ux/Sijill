# Multi-stage build: compile with Gradle (no local wrapper required),
# ship only the runtime JRE + jar.

FROM gradle:8.10-jdk21-alpine AS build
WORKDIR /home/gradle/src
COPY build.gradle.kts settings.gradle.kts ./
COPY src src
RUN gradle build --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S sijill && adduser -S sijill -G sijill
COPY --from=build /home/gradle/src/build/libs/*.jar app.jar
USER sijill
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
