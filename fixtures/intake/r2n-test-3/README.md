# r2n-test-3

Source: Blackmagic Design DaVinci Resolve 20 Beginner's Guide

Lesson: `Lesson 02`

Training timeline: `OMO PROMO CATCHUP 08.drt`

## Purpose

- official editorial baseline from Blackmagic training material
- importer truthfulness
- XML vs FCPXML arbitration
- marker and metadata preservation
- delivery planning regression stability

## Known Sample Facts

- timeline name observed in structured sources: `OMO PROMO CATCHUP 08 (Resolve)`
- editorial frame rate target: `23.976`
- editorial start timecode target: `01:00:00:00`
- metadata CSV sample rate target: `48000`
- metadata CSV audio bit depth target: `32-bit`

## Fixture Tiers

### Tier 1: committed and shareable

These files form the lightweight editorial baseline for normal repo verification:

- `OMO PROMO CATCHUP 08 CMX3600 EDL.edl`
- `OMO PROMO CATCHUP 08.aaf`
- `OMO PROMO CATCHUP 08.drt`
- `OMO PROMO CATCHUP 08.fcpxml`
- `OMO PROMO CATCHUP 08.otio`
- `OMO PROMO CATCHUP 08.xml`
- `test3 Media Metadata.csv`
- `README.md`

`marker edl if present` remains part of Tier 1. For this sample, the committed
EDL is currently `OMO PROMO CATCHUP 08 CMX3600 EDL.edl`.

### Tier 2: local/private companions

These stay out of normal lightweight verification:

- `OMO PROMO CATCHUP 08.mp4`
- `OMO PROMO CATCHUP 08.otioz`

If separate source-media folders are added locally later, they should remain
Tier 2 as well.

## Current Status

- this sample is editorial baseline only, not field-recorder proof
- no private-media pass is required for this sample activation
- OTIO and DRT remain auxiliary reference artifacts unless explicit parser support already exists
- normal repo verification must treat the large `mp4` and `otioz` companions as opt-in only
