## Glue42 Core v1.2.0 (2020-10-12)

#### :rocket: New Feature
* `web`
  * [#141](https://github.com/Glue42/core/pull/141) Implemented intents API ([@ggeorgievx](https://github.com/ggeorgievx))
* `workspaces-api`, `workspaces-app`
  * [#143](https://github.com/Glue42/core/pull/143) Implemented workspaces events ([@flashd2n](https://github.com/flashd2n)) ([@SvetozarMateev](https://github.com/SvetozarMateev))
  * [#140](https://github.com/Glue42/core/pull/140) Implemented workspace contexts ([@flashd2n](https://github.com/flashd2n)) ([@SvetozarMateev](https://github.com/SvetozarMateev))
* `fdc3`
  * [#116](https://github.com/Glue42/core/pull/116) Added an implementation of the FDC3 Standard - the @glue42/fdc3 package ([@ggeorgievx](https://github.com/ggeorgievx))

#### :bug: Bug Fix
* `core`, `web`
  * [#124](https://github.com/Glue42/core/pull/124) Fixed vulnerabilities found in numerous dependencies ([@flashd2n](https://github.com/flashd2n))
* `web`
  * [#135](https://github.com/Glue42/core/pull/135) Fixed the application start resolve condition ([@ggeorgievx](https://github.com/ggeorgievx))
  * [#137](https://github.com/Glue42/core/pull/137) Fixed a bug where the channel's data is undefined instead of an empty object ([@ggeorgievx](https://github.com/ggeorgievx))
* `fdc3`
  * [#133](https://github.com/Glue42/core/pull/133) Fixed a bug where `getOrCreateChannel()` was not returning system channels ([@ggeorgievx](https://github.com/ggeorgievx))
* `workspaces-app`
  * [#129](https://github.com/Glue42/core/pull/129) Fixed a bug where remote apps cannot open in workspaces ([@flashd2n](https://github.com/flashd2n))
* `golden-layout`, `workspaces-api`, `workspaces-app`
  * [#122](https://github.com/Glue42/core/pull/122) Multiple fixes and improvements in workspaces and golden-layout ([@SvetozarMateev](https://github.com/SvetozarMateev))

#### :nail_care: Enhancement
* `fdc3`, `ng`, `react-hooks`, `web`
  * [#144](https://github.com/Glue42/core/pull/144) Added optional icon and caption properties to the Application interface ([@ggeorgievx](https://github.com/ggeorgievx))
  * [#130](https://github.com/Glue42/core/pull/130) Added a way for @glue42/fdc3 to accept the application's name ([@ggeorgievx](https://github.com/ggeorgievx))
* `core`, `web`
  * [#138](https://github.com/Glue42/core/pull/138) Added input validation to the @glue42/core's Contexts API ([@ggeorgievx](https://github.com/ggeorgievx))
* `web`
  * [#132](https://github.com/Glue42/core/pull/132) Publishing to a channel now utilizes the new `setPaths` contexts functionality for correct context merging ([@ggeorgievx](https://github.com/ggeorgievx))
* `golden-layout`, `workspaces-app`
  * [#120](https://github.com/Glue42/core/pull/120) Improved the workspaces tabs behavior ([@SvetozarMateev](https://github.com/SvetozarMateev))

#### :memo: Documentation
* `web`
  * [#142](https://github.com/Glue42/core/pull/142) Added Intents docs ([@arjunah](https://github.com/arjunah))
* Other
  * [#121](https://github.com/Glue42/core/pull/121) Edited FDC3 docs and JS Tutorial Workspaces chapter ([@arjunah](https://github.com/arjunah))
  * [#123](https://github.com/Glue42/core/pull/123) Added the Start of Day demo application ([@flashd2n](https://github.com/flashd2n))

#### :hammer: Underlying Tools
* [#128](https://github.com/Glue42/core/pull/128) Extended the end-to-end testing environment with support application manipulation. ([@flashd2n](https://github.com/flashd2n))
* [#139](https://github.com/Glue42/core/pull/139) Moved interop tests from Enterprise to Core ([@GrigorPenev](https://github.com/GrigorPenev))
* [#119](https://github.com/Glue42/core/pull/119) Moved and adapted the @glue42/web Channels API tests to e2e ([@ggeorgievx](https://github.com/ggeorgievx))

#### Committers: 5
- Georgi Georgiev ([@ggeorgievx](https://github.com/ggeorgievx))
- Hristo Ivanov ([@arjunah](https://github.com/arjunah))
- Kalin Kostov ([@flashd2n](https://github.com/flashd2n))
- Svetozar Mateev ([@SvetozarMateev](https://github.com/SvetozarMateev))
- Grigor Penev [@GrigorPenev](https://github.com/GrigorPenev)


## Glue42 Core v1.1.0 (2020-07-31)

#### :rocket: New Feature
* `web`, `workspaces-api`, `workspaces-app`
  * [#118](https://github.com/Glue42/core/pull/118) Implemented workspaces.  ([@flashd2n](https://github.com/flashd2n)) ([@SvetozarMateev](https://github.com/SvetozarMateev))
* `cli-core`
  * [#110](https://github.com/Glue42/core/pull/110) Extend the CLI with workspaces functionalities. The CLI can now set up a dev environment with workspaces, build and serve all workspaces assets and allows the developers to define and inject css files into the workspace frame. ([@flashd2n](https://github.com/flashd2n))
  * [#57](https://github.com/Glue42/core/pull/57) Added `version` command to the CLI, which returns the currently installed version of the package ([@flashd2n](https://github.com/flashd2n))
* `golden-layout`
  * [#106](https://github.com/Glue42/core/pull/106) Added Golden layout package. This is the underlying UI controller of the Workspaces App. ([@SvetozarMateev](https://github.com/SvetozarMateev))
* `web`
  * [#95](https://github.com/Glue42/core/pull/95) Implemented the AppManager API. ([@ggeorgievx](https://github.com/ggeorgievx))
* `web`
  * [#82](https://github.com/Glue42/core/pull/82) Implemented the Channels API. ([@ggeorgievx](https://github.com/ggeorgievx))
* `ng`
  * [#67](https://github.com/Glue42/core/pull/67) Implemented @glue42/ng - a simple, lightweight Angular wrapper compatible with Glue42 Core and Glue42 Enterprise ([@flashd2n](https://github.com/flashd2n))

#### :bug: Bug Fix
* `web`
  * [#100](https://github.com/Glue42/core/pull/100) Fixed an issue which caused GlueWeb() to crash if no appManager value was provided ([@ggeorgievx](https://github.com/ggeorgievx))
* `core`
  * [#64](https://github.com/Glue42/core/pull/64) Bugfix/issue 62 ([@kirilpopov](https://github.com/kirilpopov))
* `cli-core`
  * [#54](https://github.com/Glue42/core/pull/54) Fixed a bug where the node process hangs on MacOS 🐛 ([@ggeorgievx](https://github.com/ggeorgievx))
  * [#52](https://github.com/Glue42/core/pull/52) Fixed an issue where the CLI `build` will produce a .js config file, instead of .json ([@flashd2n](https://github.com/flashd2n))

#### :nail_care: Enhancement
* `web`
  * [#86](https://github.com/Glue42/core/pull/86) Made the Channels API compatible with Enterprise ([@ggeorgievx](https://github.com/ggeorgievx))
* `react-hooks`
  * [#47](https://github.com/Glue42/core/pull/47) Added jest typings ([@3lmo](https://github.com/3lmo))

#### :memo: Documentation
* CodeSandBox Examples
  * [#70](https://github.com/Glue42/core/pull/70) [#73](https://github.com/Glue42/core/pull/73) [#79](https://github.com/Glue42/core/pull/79) [#81](https://github.com/Glue42/core/pull/81) Implemented live examples ([@sguzunov](https://github.com/sguzunov))
  * [#85](https://github.com/Glue42/core/pull/85) [#88](https://github.com/Glue42/core/pull/88) [#89](https://github.com/Glue42/core/pull/89) Added various Channel Selector Widget UIs ([@ggeorgievx](https://github.com/ggeorgievx))
  * [#91](https://github.com/Glue42/core/pull/91) The Channels live-examples can now be controlled using the G4E channel selector widget UI ✨ ([@ggeorgievx](https://github.com/ggeorgievx))
* `web`
  * [#87](https://github.com/Glue42/core/pull/87) Added Channels API Documentation ([@ggeorgievx](https://github.com/ggeorgievx))
* `react-hooks`
  * [#114](https://github.com/Glue42/core/pull/114) Added React tutorial text and snippets fixes ([@yankostadinov](https://github.com/yankostadinov))
  * [#84](https://github.com/Glue42/core/pull/84) [#76](https://github.com/Glue42/core/pull/76) Extended ReactJS documentation and tutorial with channels ([@GrigorPenev](https://github.com/GrigorPenev))
* `cli-core`, `core`, `ng`, `react-hooks`, `web`, `worker-web`
  * [#74](https://github.com/Glue42/core/pull/74) [#96](https://github.com/Glue42/core/pull/96) [#98](https://github.com/Glue42/core/pull/98) [#105](https://github.com/Glue42/core/pull/105)   Performed full Glue42 Core documentation edit ([@arjunah](https://github.com/arjunah))
* `ng`
  * [#75](https://github.com/Glue42/core/pull/75) [#92](https://github.com/Glue42/core/pull/92) Created a tutorial for the @glue42/ng library ([@flashd2n](https://github.com/flashd2n))
* `react-hooks`, `web`, `worker-web`
  * [#46](https://github.com/Glue42/core/pull/46) [#49](https://github.com/Glue42/core/pull/49) [#53](https://github.com/Glue42/core/pull/53) [#58](https://github.com/Glue42/core/pull/58) Fixed various documentation errors and improved overall quality ([@ggeorgievx](https://github.com/ggeorgievx))

#### :hammer: Underlying Tools
* [#102](https://github.com/Glue42/core/pull/102) [#104](https://github.com/Glue42/core/pull/104)[#113](https://github.com/Glue42/core/pull/113) Created Glue42 Core E2E testing environment, complete with custom process controllers. This E2E runs on latest CLI, Web, Workspaces API, Workspaces APP, Core, Worker and Gateway packages. ([@GrigorPenev](https://github.com/GrigorPenev))

#### Committers: 10
- Georgi Georgiev ([@ggeorgievx](https://github.com/ggeorgievx))
- Hristo Ivanov ([@arjunah](https://github.com/arjunah))
- Kalin Kostov ([@flashd2n](https://github.com/flashd2n))
- Kiril Popov ([@kirilpopov](https://github.com/kirilpopov))
- Stoyan Uzunov ([@sguzunov](https://github.com/sguzunov))
- Svetozar Mateev ([@SvetozarMateev](https://github.com/SvetozarMateev))
- Yan Kostadinov ([@yankostadinov](https://github.com/yankostadinov))
- Emil Petkov [@3lmo](https://github.com/3lmo)
- Grigor Penev [@GrigorPenev](https://github.com/GrigorPenev)

## Glue42 Core v1.0.0 (2020-04-06)

#### :rocket: New Feature
* `react-hooks`
  * [#10](https://github.com/Glue42/core/pull/10) Created the **@glue42/react-hooks** library. This package provides custom React hooks for the Glue42 JavaScript libraries ([@3lmo](https://github.com/3lmo))
* `web`
  * [#31](https://github.com/Glue42/core/pull/31) Created the **@glue42/web** package, which exposes an API for all Glue42 Clients to utilize the interop, window and contexts capabilities.  ([@kirilpopov](https://github.com/kirilpopov))
* `core`
  * [#27](https://github.com/Glue42/core/pull/27) Transferred the existing code-base for the **@glue42/core** package from the internal stash system to github. This package processes the Glue42 Client connection to the gateway and exposes interop functionality. It is the foundation of **@glue42/web**. ([@kirilpopov](https://github.com/kirilpopov))
* `cli-core`
  * [#25](https://github.com/Glue42/core/pull/25) Completed the **@glue42/cli-core** package. This development tool makes setting up and working on Glue42 Core project easy and painless. ([@flashd2n](https://github.com/flashd2n))
* `worker-web`
  * [#17](https://github.com/Glue42/core/pull/17) Created the **@glue42/worker-web** package, which exposes a central connection point, which acts as a bridge between Glue42 Clients and the gateway. ([@flashd2n](https://github.com/flashd2n))

#### :memo: Documentation
* [#28](https://github.com/Glue42/core/pull/28) Created the Vanilla JS tutorial - text guide, project start code and full solution. ([@flashd2n](https://github.com/flashd2n))
* [#16](https://github.com/Glue42/core/pull/16) Created a React tutorial for Glue42 Core, which showcases the use of the **@glue42/react-hooks** library. ([@3lmo](https://github.com/3lmo))
* [#36](https://github.com/Glue42/core/pull/36) Added guide for running a Glue42 Core application in Glue42 Enterprise ([@kirilpopov](https://github.com/kirilpopov))
* [#32](https://github.com/Glue42/core/pull/32) Created the API reference documentation for **@glue42/web** ([@flashd2n](https://github.com/flashd2n))
* [#34](https://github.com/Glue42/core/pull/34)[#37](https://github.com/Glue42/core/pull/37)[#43](https://github.com/Glue42/core/pull/43) Created the texts for the initial version of the Glue42 Core documentation ([@flashd2n](https://github.com/flashd2n), [@ValkaHonda](https://github.com/ValkaHonda))

#### :hammer: Underlying Tools
* [#14](https://github.com/Glue42/core/pull/14) Created a rest server, which serves mock data to all Glue42 Core tutorials ([@3lmo](https://github.com/3lmo))

#### Committers: 4
- Kiril Popov ([@kirilpopov](https://github.com/kirilpopov))
- Kalin Kostov ([@flashd2n](https://github.com/flashd2n))
- Emil Petkov ([@3lmo](https://github.com/3lmo))
- Valentin Aleksandrov ([@ValkaHonda](https://github.com/ValkaHonda))