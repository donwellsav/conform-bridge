# r2n-test-1

Real local Resolve turnover sample for `r2n test 1 / Timeline 1`.

## Known Sample Facts

- Project name: `r2n test 1`
- Timeline name: `Timeline 1`
- Editorial frame rate target: `23.976`
- Editorial start timecode target: `01:00:00:00`
- Audio sample rate: `48000`
- Audio bit depth: `32-bit float`

## Fixture Tiers

### Tier 1: committed and shareable

These files stay in git and are enough for normal repo verification:

- `Timeline 1.fcpxml`
- `Timeline 1.xml`
- `Timeline 1.aaf`
- `Timeline 1 cmx3600.edl`
- `Timeline 1.edl`
- `r2n test 1 Media Metadata.csv`
- `Timeline 1.otio`
- `Timeline 1.drt`

Committed expected outputs live in:

- `fixtures/expectations/r2n-test-1/inventory.json`
- `fixtures/expectations/r2n-test-1/expected-lightweight.json`
- `fixtures/expectations/r2n-test-1/expected-local-private.json`

### Tier 2: local private sample companions

These stay local by default and are ignored by git:

- `Timeline 1.mp4`
- `Timeline 1.otioz`
- `F2-BT_002.WAV`
- `F2_002.WAV`
- `230407_002.WAV`

Tier 2 extends the sample with direct WAV/BWF/iXML metadata coverage and the
first real field-recorder candidate pass. Normal repo verification must not
depend on these files being present.

Normal local importer and verification flows now exclude Tier 2 from the
working set unless both private-sample opt-in flags are enabled explicitly.

## Current Repo Handling For This Sample

- `fcpxml/xml` are structured timeline sources, with the richer structured
  source kept primary inside the current `fcpxml/xml -> aaf -> edl ->
  metadata-only` precedence rule.
- For the current sample, `XML` wins over `FCPXML` because it preserves the
  expected `01:00:00:00` start timecode and richer track/clip coverage.
- `aaf`, `edl`, metadata CSV, marker data, and `manifest.json` remain
  enrichment and reconciliation inputs.
- `Timeline 1.aaf` is still treated truthfully as unsupported for direct
  authoritative parsing in the current repo state.
- `otio`, `otioz`, and `drt` are preserved as auxiliary reference artifacts
  only. They are not canonical parsers in the current repo state.
- WAV files are inspected directly for format, BWF/LIST, and iXML metadata.
  Editorial CSV timing still remains necessary when the WAV container does not
  expose a trustworthy explicit source timecode string on its own.
- Field-recorder results for this sample currently stay at plausible candidate
  or no-match. The repo does not promote them to confident relinks without
  stronger real evidence.

## Running Tests

Normal lightweight verification:

```powershell
npm test
```

Recommended local workflow:

1. targeted tests for the parser or importer area you changed
2. normal repo verification
3. private-sample regression only when the large companions are required

Extended local sample verification, only when the private files are present
and large-media access is explicitly enabled:

```powershell
$env:CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE='1'
$env:CONFORM_BRIDGE_ALLOW_LARGE_MEDIA='1'
npm test
```

Guardrails:

- normal verification must not copy Tier 2 files into temp working sets
- normal verification must not read multi-gigabyte WAV files directly
- direct large-media reads now require both
  `CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE=1` and
  `CONFORM_BRIDGE_ALLOW_LARGE_MEDIA=1`

## Why The Raw Turnover Is Not Committed

- the private sample is several gigabytes
- the WAV and reference-video companions are not required for normal repo
  verification
- Tier 1 plus committed expectations keep the repo lightweight and shareable
  while still preserving stronger local regression coverage when Tier 2 is
  available
