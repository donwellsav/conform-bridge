# Bundle Spec

## Purpose
A `SourceBundle` models the intake package an operator receives from picture editorial before Conform Bridge does any real parsing.

## Workflow Shape
Resolve exports in. Nuendo-ready bundle out.

## Expected Bundle Assets
A bundle may include:
- `AAF`
- `marker EDL`
- `marker CSV`
- `metadata CSV`
- `manifest.json`
- `README import instructions`
- `reference video`
- `field recorder matching report`

## Asset Status Values
- `present`: available in the package and ready for placeholder review.
- `missing`: expected for workflow completeness but not supplied.
- `placeholder`: intentionally represented without a real file for phase 1.

## Required Facts Surfaced In UI
- Timeline name
- Frame rate
- Start timecode
- Track count
- Clip count
- Marker count
- Handles expectation
- Reference video state
- Field recorder matching report state

## Naming Guidance
Mock assets should look like real turnover materials, for example:
- `SHOW_203_LOCK.aaf`
- `SHOW_203_MARKERS.edl`
- `SHOW_203_MARKERS.csv`
- `SHOW_203_METADATA.csv`
- `manifest.json`
- `README_NUENDO_IMPORT.txt`
- `SHOW_203_REF.mov`
- `SHOW_203_FIELD_RECORDER_REPORT.csv`

## Phase 1 Constraint
Bundles are display-only fixtures. No file system inspection, no parsing, and no write-back behavior should be implied by the scaffold.
