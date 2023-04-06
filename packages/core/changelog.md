5.10.1
chore: fixed linting errors
5.10.0
feat: reworked the web-platform transport to recursively search for a gw
5.9.0
feat: added experimental support for running the platform as a workspace frame inside an iframe
fix: updated ws to ^8.12.1, which fixes a regression in ws when bundling for the browser
5.8.0
feat: updated all dependencies to the latest major versions
5.7.10
chore: added missing changelog to the published bundle
5.7.9
chore: updated rollup build to use a clean dist dir
5.7.8
fix: iframes now have unique ids every time, even after top refresh
5.7.7
fix: Improved the message flushing when re-announcing the contexts
5.7.6
chore: refactored the logger level type and added improvements to make the instance and windowId of Web clients the same
5.7.5
fix: the manual unload in the web transport no longer sends a message to the parent window
5.7.4
fix: improved backwards compatibility in node instances registration
5.7.3
feat: allow node instances to be registered using RegisterInstance method
5.7.2
feat: added support for a provider context in the authentication object, passed along to the custom Enterprise authenticators
5.7.1
fix: improved the subscriptions restoration after reconnecting
chore: resolved dependency vulnerabilities
5.7.0
feat: add the possibility to switch the connection transport after the initial connection
5.6.3
fix: improve className reporting in LastBrowserEvent metric
5.6.2
fix: fixed a race between contexts get and subscribe
5.6.1
fix: fixed a race between contexts get and subscribe
5.6.0
feat: added support for GDX (Glue42 Developer Extension)
5.5.1
fix: feedback in core package is now listed correctly as a method
5.5.0
feat: add support for passing custom identity
5.4.14
feat: add support for glue42/electron in core
5.4.13
chore: minor changes to package.json
5.4.12
fix: isLocal should be coming from the resolved identity
5.4.11
chore: resolved dependency vulnerabilities
5.4.10
docs: improved the d.ts for better reference documentation
5.4.9
fix: Glue performance events backwards compat fix
5.4.8
chore: resolved dependency vulnerabilities
5.4.7
chore: resolved dependency vulnerabilities
5.4.6
chore: resolved dependency vulnerabilities
5.4.5
fix: resolved dependency vulnerabilities
5.4.4
fix: metrics - use applicationName for service
5.4.3
fix: web platform transport - now correctly handles the client id of and unloaded client
5.4.2
fix: interop - replace promise.finally to support old Angular apps
5.4.1
fix: metrics - default service to application name
fix: metrics - use toJSON method of performance entries
5.4.0
feat: expose method's flags in interop (G4E-3780)
feat: added interop.waitForMethod method that allows waiting for a method to appear
fix: return unsubscribe functions from legacy interop methods (method_added, method_removed, etc) (
5.3.0
feat: official release with support for web transport
5.2.8-beta.0
feat: added web platform transport and beta core release
5.2.7
fix: fixed an issue which will cause the reconnection attempts after disconnect to fail because of a wrong this and also provided the correct reconnect interval
5.2.6
perf: metrics - optimize memory usage (do not wait for response on metrics publish requests)
5.2.5
fix: config - exposed glue.config.application (legacy)
5.2.4
fix: contexts - clone context object when passing to subscribers
5.2.3
fix: contexts - missing delta in update callback
5.2.2
fix: metrics - perf metrics handle promise rejections
5.2.1
fix: contexts - related to GW context protocol v2 support G4E-3353
fix: logger - change default log level to warn
5.2.0
feat: contexts - GW context protocol v2 support G4E-3353
fix: contexts - get was returning empty object G4E-3074
fix: interop - add detailed information when the invocation is timed out G4E-3153
fix: interop - legacy support - add missing missing method_added G4E-3152
5.1.2
chore: bumped version after unified file endings for repo-wide npm audit script
5.1.1
fix: logger can try to invoke before interop is ready
5.1.0
feat: extra performance metrics
feat: respect log level coming from Enterprise configuration
fix: better timeout error message
fix: try to fool webpack when requiring ws module
fix: add legacy methods to glue.agm
chore: upgraded callback-registry to 2.6.0
5.0.7
fix: extra check for running in browser or node
5.0.6
fix: removed module invalid glue42core module export from d.ts
fix: proper error when trying to invoke with circular objects
5.0.5
fix: change metrics service to Glue42
5.0.4
fix: metrics identity was missing service, system, instance
5.0.3
fix: methodDefinition's getServers() listed as property, not method [link](https://github.com/Glue42/core/issues/62)
fix: MethodDefinition.getServers() doesn't return expected array [link](https://github.com/Glue42/core/issues/60)
5.0.2
feat: added in lerna release pipeline
5.0.1
fix: breaks if server returns null object ("server returns null result" test)
5.0.0
BREAKING CHANGE: removed support for Glue42 v2
