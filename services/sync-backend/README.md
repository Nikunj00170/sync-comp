# Sync backend configuration

## Cognito JWT authentication

The backend protects every route except `GET /health` and `GET /v1/catalogue`. Protected routes require a Cognito **access token**. The resource server verifies the token signature using the JWK set discovered from the issuer, then validates issuer, expiry, not-before, `token_use=access`, and the configured app client ID against the Cognito `client_id` claim. It does not use `aud` for the app client check.

Set these environment variables when running the backend:

```sh
export COGNITO_ISSUER_URI='https://cognito-idp.<region>.amazonaws.com/<user-pool-id>'
export COGNITO_CLIENT_ID='<app-client-id>'
./mvnw spring-boot:run
```

Find the issuer URI in the Cognito user pool's **Overview** as the issuer URL. Find the client ID under **App integration → App clients and analytics** for the app client used by the client application. These are identifiers, not AWS credentials; do not put secrets in source control.

The application can start without either variable so local non-authenticated work such as `/health` and the catalogue remains available. Authentication fails closed: a protected request without a token receives 401, and a bearer token cannot be decoded without both settings. Configure both values before exercising protected endpoints. The test suite uses a generated local RSA key and a controlled test issuer; it does not connect to Cognito.

Routes under `/v1/admin/**` additionally require the `admin` scope and return 403 when an otherwise valid access token lacks it.
