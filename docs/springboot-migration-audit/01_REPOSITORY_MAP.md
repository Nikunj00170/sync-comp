# Repository map

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Complete relevant directory tree

VERIFIED IN CODE: tracked inventory below includes all source inputs, Android source/resources and lockfiles. Excludes dependencies, build outputs, reports, Git internals and owner-only continuity/configuration. New audit documents live beside the pre-existing docs. Ignored .env.local exists and was inspected by variable name only; ignored deployment JSON is absent in this checkout. Do not copy local values into shared documentation.

```text
.env.example
.gitattributes
.gitignore
.prettierrc.json
README.md
apps/
  customer/
    README.md
    android/
      .gitignore
      app/
        .gitignore
        build.gradle
        capacitor.build.gradle
        proguard-rules.pro
        src/
          main/
            AndroidManifest.xml
            java/
              com/
                airtelsync/
                  customer/
                    MainActivity.java
            res/
              drawable/
                ic_sync_foreground.xml
                splash.xml
              layout/
                activity_main.xml
              mipmap-anydpi/
                ic_launcher.xml
                ic_launcher_round.xml
              mipmap-anydpi-v26/
                ic_launcher.xml
                ic_launcher_round.xml
              values/
                colors.xml
                strings.xml
                styles.xml
              xml/
                file_paths.xml
      build.gradle
      capacitor.settings.gradle
      gradle/
        wrapper/
          gradle-wrapper.jar
          gradle-wrapper.properties
      gradle.properties
      gradlew
      gradlew.bat
      settings.gradle
      variables.gradle
    capacitor.config.ts
    index.html
    package.json
    public/
      favicon.svg
    src/
      App.tsx
      components/
        Brand.tsx
        Modal.tsx
        NetworkArt.tsx
      lib/
        api.ts
        auth.ts
        downloads.ts
        feedback.tsx
        store.tsx
      main.tsx
      pages/
        Account.tsx
        Billing.tsx
        Checkout.tsx
        Dashboard.tsx
        Discover.tsx
        Orders.tsx
        Plans.tsx
        Services.tsx
        Support.tsx
        Verification.tsx
      styles.css
    vite.config.ts
case_source/
  CONTENTS.md
  README.md
  kyc_documents/
    K01_address_proof.png
    K01_gst_certificate.png
    K01_signatory_id.png
    K01_udyam_certificate.png
    K02_address_proof.png
    K02_gst_certificate.png
    K02_signatory_id.png
    K02_udyam_certificate.png
    K03_address_proof.png
    K03_gst_certificate.png
    K03_signatory_id.png
    K03_udyam_certificate.png
    K04_address_proof.png
    K04_gst_certificate.png
    K04_signatory_id.png
    K04_udyam_certificate.png
    K05_address_proof.png
    K05_gst_certificate.png
    K05_signatory_id.png
    K06_address_proof.png
    K06_gst_certificate.png
    K06_signatory_id.png
    K06_udyam_certificate.png
    K07_address_proof.png
    K07_gst_certificate.png
    K07_signatory_id.png
    K07_udyam_certificate.png
    K08_address_proof.png
    K08_gst_certificate.png
    K08_signatory_id.png
    K08_udyam_certificate.png
    K09_address_proof.png
    K09_gst_certificate.png
    K09_signatory_id.png
    K09_udyam_certificate.png
    K10_address_proof.png
    K10_gst_certificate.png
    K10_signatory_id.png
    K10_udyam_certificate.png
    K11_address_proof.png
    K11_gst_certificate.png
    K11_signatory_id.png
    K11_udyam_certificate.png
    K12_address_proof.png
    K12_gst_certificate.png
    K12_signatory_id.png
    K12_udyam_certificate.png
  mock_gstin_registry.csv
  mock_udyam_registry.csv
  product_catalogue.csv
  smb_leads.csv
docs/
  architecture.md
  customer-api-handoff.md
  implementation-plan.md
infra-placeholder/
  README.md
  api/
    documents-cors.json
    events/
      health-check.json
      storage-check.json
    http-api-cors.json
    index.mjs
  aws-prototype-config.example.json
  index.html
package-lock.json
package.json
packages/
  domain/
    package.json
    src/
      index.ts
playwright.config.ts
reference/
  initial-scaffold/
    README.md
    index.html
    package.json
    tsconfig.json
    vite.config.ts
scripts/
  check-staged.mjs
shared/
  data/
    README.md
    catalogue.json
    historical.json
    mock_gstin_registry.json
    mock_udyam_registry.json
tests/
  domain.test.ts
  e2e/
    customer.spec.ts
tsconfig.json
vitest.config.ts
```

## Module responsibilities

| Location | Responsibility and status |
| --- | --- |
| package.json, package-lock.json, tsconfig.json | VERIFIED IN CODE: npm workspaces apps/* and packages/*, Node >=24, root build/typecheck/test/Android scripts. Lockfile records dependency resolution; no backend Maven module. |
| apps/customer/src | VERIFIED IN CODE: one running frontend; see 02 for all routes/components. |
| apps/customer/android | PARTIALLY IMPLEMENTED native wrapper, Gradle/Java/XML resources; generated assets/builds excluded from tree. MainActivity extends Capacitor BridgeActivity, not a Java backend. |
| packages/domain | VERIFIED IN CODE: client/demo domain types, validation and calculations. |
| shared/data | VERIFIED IN CODE: prepared catalogue/registries/historical summary. Only catalogue imported by domain. |
| case_source | VERIFIED IN CODE: four CSVs, guide and 47 images. No PDF/PPTX present despite root README listing them. |
| infra-placeholder | VERIFIED IN CODE: static website diagnostic, Node Lambda diagnostic, CORS templates and example configuration. DOCUMENTED ONLY AWS provisioning handoff. |
| docs | DOCUMENTED ONLY architectural intent/handoff, with stale descriptions identified in 11. |
| reference/initial-scaffold | VERIFIED IN CODE archived configuration only. Express, CDK, tesseract.js, OpenAI, React Query dependencies here do not imply working implementations. Referenced server/local.ts, infra/app.ts and scripts/seed.ts absent. |
| tests | VERIFIED IN CODE domain/PDF tests and Playwright local customer journeys. |
| scripts/check-staged.mjs | VERIFIED IN CODE guard against staging local configuration/secrets; no deployment automation. |

No partner/reviewer/admin frontend, services/api, services/document-worker, packages/contracts, .github workflows, CDK app, Dockerfile or Spring Boot application exists. Android Gradle files must not be mistaken for Spring backend build files. The fixtures/kyc_documents path mentioned by docs is absent; actual images are in case_source/kyc_documents.
