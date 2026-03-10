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

## Current Repo Handling For This Sample

- `fcpxml/xml` are structured timeline sources, with the richer structured
  source kept primary inside the current `fcpxml/xml -> aaf -> edl ->
  metadata-only` precedence rule.
- `aaf`, `edl`, metadata CSV, marker data, and `manifest.json` remain
  enrichment and reconciliation inputs.
- `otio`, `otioz`, and `drt` are preserved as auxiliary reference artifacts
  only. They are not canonical parsers in the current repo state.
- WAV files are inspected directly for format, BWF/LIST, and iXML metadata.
  Editorial CSV timing still remains necessary when the WAV container does not
  expose a trustworthy explicit source timecode string on its own.

## Running Tests

Normal lightweight verification:

```powershell
npm test
```

Extended local sample verification, only when the private files are present:

```powershell
$env:CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE='1'
npm test
```

## Why The Raw Turnover Is Not Committed

- the private sample is several gigabytes
- the WAV and reference-video companions are not required for normal repo
  verification
- Tier 1 plus committed expectations keep the repo lightweight and shareable
  while still preserving stronger local regression coverage when Tier 2 is
  available
