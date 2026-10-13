# anti-lagger

A YarpenArt fork of [Potato Or Not](https://github.com/fantasycalendar/FoundryVTT-PotatoOrNot), originally by Wasp / Fantasy Computerworks. Licensed under GPL-3.0; see LICENSE.

Targets Foundry VTT 14 build 365. Each user chooses their own client graphics profile:

| Profile | Hardware | Maximum FPS | Performance mode |
| --- | --- | --- | --- |
| Lagger | Low-end | 10 | Low |
| Normal | Mid-range | 30 | Medium |
| Lagger not needed | High-end | 60 | Maximum |

Other graphics values are preserved from the original presets. Open Settings → Configure Settings → anti-lagger → Show Dialog. New users are prompted automatically unless the GM disables Prompt All New Users.

Install using `https://github.com/yarpenart/anti-lagger/releases/latest/download/module.json`. Disable Potato Or Not before enabling this fork. This is a separate module with its own saved preferences.

## Changes in 1.0.0

Renamed module and profiles, updated compatibility metadata, registered settings at init, awaited profile writes before completing the form, guarded removed/non-client settings, and removed access to the legacy settings sheet. Original images and license are retained.

Validation: automated mocked Foundry lifecycle and preset persistence tests. Actual Foundry 14.365 browser testing is still required.

## API

`window.AntiLagger.showDialog()`, `quality` (0–2), `getSetting`, `addSetting`, and `removeSetting`. The ready hook is `AntiLaggerReady`.
