# r2n-test-4

Source: Blackmagic Design DaVinci Resolve 20 Fairlight Audio Guide

Lesson: `Channel Mapping and Linked Groups`

## Purpose

- official Fairlight multichannel baseline
- channel layout preservation
- linked-group behavior
- multichannel/interchange regression stability
- future audio-post translator baseline

## Known Sample Facts

- timeline name observed in structured sources: `Channel mapping and linked groups (Resolve)`
- editorial frame rate target: `24`
- editorial start timecode target: `01:00:00:00`
- lightweight metadata preserves at least one `8`-channel clip: `C4_02.mov`

## Fixture Tiers

### Tier 1: committed and shareable

- `Channel mapping and linked groups.fcpxml`
- `Channel mapping and linked groups.xml`
- `Channel mapping and linked groups.aaf`
- `Channel mapping and linked groups.edl`
- `Copy of Copy of project Media Metadata.csv`
- `Channel mapping and linked groups.otio`
- `Channel mapping and linked groups.drt`
- `README.md`

### Tier 2: local/private companions

- `DR17 Fairlight Intro Tutorial.dra/` project bundle with source-media tree
- `Channel mapping and linked groups.mp4`
- `Channel mapping and linked groups.otioz`

## Current Status

- this sample is a multichannel / linked-group baseline only, not a
  field-recorder proof sample
- lightweight acceptance currently relies on editorial/interchange files only
- the local Fairlight `.dra` bundle and large companions must stay out of
  normal repo verification
- no private-media pass is required for sample-4 activation or lightweight
  expectations
