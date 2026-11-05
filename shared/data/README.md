# Prepared synthetic data

These JSON files were prepared from the supplied case pack during brainstorming. The raw CSV files in case_source/ remain the source inputs.

| File | Content |
| --- | --- |
| catalogue.json | 25 products with normalized identifiers, price fields, eligibility and dependencies |
| mock_gstin_registry.json | 3,534 fictional GSTIN registry records |
| mock_udyam_registry.json | 2,723 fictional Udyam registry records |
| historical.json | Segment and funnel/drop-reason summary derived from the 5,000 fictional leads |

Prices in the prepared catalogue are rupee-valued fixture inputs. Convert them deliberately to integer paise at the backend pricing boundary and label the chosen demo pricing version.

Mock registries belong on the backend; do not bundle the full registry or lead file into the customer website. The catalogue can have a deliberately selected public response.

The dataset guide's fixed date of 2026-07-15 is a fixture clock for reproducible case evaluation. Its fictional GSTIN/PAN marker and Udyam district values belong only to mock validation. Live mode must use current time and the relevant provider's validated result.

The extraction/generation script used earlier is not present. Keep the JSON and raw CSV inputs together and add a deterministic importer before changing the fixture format.
