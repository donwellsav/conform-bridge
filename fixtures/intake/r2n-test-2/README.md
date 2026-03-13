# r2n-test-2

Real local Resolve turnover sample for `r2n test 2 / OMO PROMO FINAL`.

## Known Sample Facts

- Project name: `r2n test 2`
- Timeline name: `OMO PROMO FINAL`
- Editorial frame rate target: `23.976`
- Editorial start timecode target: `01:00:00:00`
- Metadata CSV sample rate target: `48000`
- Metadata CSV bit depth target: `16-bit`

## What This Sample Is Intended To Test

- broader real-sample XML vs FCPXML arbitration
- a second real lightweight importer path beyond `r2n-test-1`
- future guarded private-media checks for production-audio metadata and field-recorder evidence
- keeping large local media out of normal repo verification

## Fixture Tiers

### Tier 1: committed and shareable

These files are the lightweight working set for normal repo verification:

- `OMO PROMO DELIVER Media Metadata.csv`
- `OMO PROMO FINAL w markers.edl`
- `OMO PROMO FINAL.aaf`
- `OMO PROMO FINAL.drt`
- `OMO PROMO FINAL.edl`
- `OMO PROMO FINAL.fcpxml`
- `OMO PROMO FINAL.otio`
- `OMO PROMO FINAL.xml`
- `README.md`

Expectation scaffolding now lives in:

- `fixtures/expectations/r2n-test-2/inventory.json`
- `fixtures/expectations/r2n-test-2/expected-lightweight.json`
- `fixtures/expectations/r2n-test-2/expected-local-private.json`

### Tier 2: local private companions

These stay local by default and are excluded from normal repo verification:

- `OMO/` private source media tree
- `OMO PROMO FINAL.mp4`
- `OMO PROMO FINAL.otioz`

Tier 2 includes the real production-audio WAV files and source camera media that
would be used for a later guarded private-sample pass. Those files must not be
part of normal test, lint, or build runs.

## Guardrails

- normal importer and test runs stay on Tier 1 by default
- `r2n-test-2` private companions are registered explicitly in the guard layer
- the importer now skips the `OMO/` private media tree during normal traversal
- any direct large-media reads still require both
  `CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE=1` and
  `CONFORM_BRIDGE_ALLOW_LARGE_MEDIA=1`
- scoped private verification can additionally set
  `CONFORM_BRIDGE_PRIVATE_SAMPLE_TARGET=r2n-test-2`
  so dual-opt-in runs stay on this sample only

## Current Status

- `r2n-test-2` is installed as a guarded sample fixture
- lightweight expectations are now committed for Tier 1 evaluation
- local-private expectations are now committed for the guarded private-media pass
- the private interview WAV rolls preserve stronger BWF/iXML metadata than `r2n-test-1`
- the guarded private pass still does not prove a confident camera-to-recorder relink because usable source TC still comes from editorial CSV rather than explicit WAV timecode

