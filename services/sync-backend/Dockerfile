# Build from repository root so the canonical shared catalogue is included.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY services/sync-backend services/sync-backend
COPY shared/data/catalogue.json shared/data/mock_gstin_registry.json shared/data/mock_udyam_registry.json shared/data/kyc-ocr-fixtures.json shared/data/
WORKDIR /workspace/services/sync-backend
RUN chmod +x mvnw && ./mvnw --batch-mode -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/services/sync-backend/target/sync-backend-0.0.1-SNAPSHOT.jar app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
