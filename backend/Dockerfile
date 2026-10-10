# The API image for Railway (or any Docker host). Build context: this folder.
#   docker build -t suprmama-api backend && docker run -p 8080:8080 --env-file api.env suprmama-api
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 10001 app && mkdir -p /data/uploads && chown app /data/uploads
COPY --from=build /src/target/foodcart-api-0.0.1.jar app.jar
USER app
# Uploaded dish photos: mount a persistent volume here (Railway: Volumes → /data).
ENV UPLOAD_DIR=/data/uploads
EXPOSE 8080
# MaxRAMPercentage keeps the JVM inside the container's memory limit.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
