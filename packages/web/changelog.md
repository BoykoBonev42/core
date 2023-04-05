2.19.0
feat: now recursively searches a gw in all parents and openers
fix: iframes now have no window.my
2.18.1
fix: improved the cleanup of the libs on platform shutdown
2.18.0
feat: added support for Platform shutdown
2.17.1
chore: bump due to dependencies update
2.17.0
feat: added Search API support
2.16.0
feat: extended the Notifications API to support a custom notifications panel
2.15.0
feat: added support for Themes API
2.14.2
chore: bump due to dependencies update
2.14.1
chore: bump due to dependencies update
2.14.0
feat: updated all dependencies to the latest major versions
2.13.0
feat: added handlers prop to IntentRequest
feat: added methodResponseTimeoutMs in the intents config passed to GlueWeb factory function
2.12.0
feat: adds support for layoutComponentId for windows and app instances
2.11.3
fix: refactored the intents resolver spawn bounds function to fix an error fired when a minified platform is used and minified again by webpack 
2.11.2
fix: requesting multi display window placement from a platform which is a workspace frame now works correctly
2.11.1
fix: rename RegisterRequest to AddIntentListenerRequest in intents typings 
2.11.0
feat: added focusing events
feat: added register intents method and deprecated addIntentListener
2.10.3
chore: bump due to dependencies update
2.10.2
chore: updated rollup build to use a clean dist dir
2.10.1
fix: reworked the resolver API typings to be more simplistic
fix: intents raise now works correctly when the raising app is in a workspace
2.10.0
feat: added support for intents resolver
2.9.0
feat: added events dispatcher
fix: channel subscribe now replays current channel data
2.8.4
fix: can not import up to 1000 layouts in a simple bulk import
2.8.3
chore: bump due to dependencies update
2.8.2
chore: bump due to dependencies update
2.8.1
chore: bump due to dependencies update
2.8.0
feat: added support for adding channels runtime
2.7.3
chore: bump due to dependencies update
2.7.2
chore: bump due to dependencies update in relation to the new workspace reorder locks
2.7.1
chore: updated comments in the typings for improved reference documentation
2.7.0
feat: enabled layouts API messages
2.6.12
chore: bump due to dependencies update
2.6.11
fix: the bridge does not use the cloned protocol response anymore
2.6.10
chore: bump due to dependencies update
2.6.9
chore: updated @glue42/desktop@5.14.0
fix: Fix race condition in add intent listener method
2.6.8
chore: bump due to dependencies update
2.6.7
feat: the channels api now saves the fdc3 context type
2.6.6
chore: bump due to dependencies update
2.6.5
chore: bump due to dependencies update
2.6.4
feat: updated the @glue42/desktop to 5.12.0
2.6.2
fix: fixes the breaking change introduced in 2.6.0 which caused incompatibility between 1.12.X platform and web clients prior to 2.6.0
2.6.1
chore: resolved dependency vulnerabilities
2.6.0
feat: web clients can now understand instruction from the platform to modify their connection transports
2.5.7
chore: bump due to dependencies update
2.5.6
chore: updated the decoders to pass isMaximized in window layout items
2.5.5
chore: bump due to dependencies update
2.5.4
chore: bump due to dependencies update
2.5.3
chore: bump due to dependencies update
2.5.2
chore: bump due to dependencies update
2.5.1
chore: bump due to dependencies update
2.5.0
feat: added support for GDX (Glue42 Developer Extension)
2.4.3
fix: added support for bulk app definitions import
2.4.2
chore: bump due to dependencies update
2.4.1
chore: bump due to dependencies update
2.4.0
chore: updated to the latest core
2.3.3
chore: bump due to dependencies update
2.3.2
chore: bump due to dependencies update
2.3.1
feat: added getPermission method to the api
2.3.0
chore: bump due to dependencies update inline with 3.12 Enterprise release
2.2.5
feat: added an option to focus the platform when a notification receives a default click
2.2.4
chore: bump due to dependencies update
2.2.3
docs: improved the d.ts for better reference documentation
2.2.2
chore: bump due to dependencies update
2.2.1
chore: Resolved dependency vulnerabilities
chore: updated @glue42/desktop dependency
fix: changed requestPermission to optional due to compatibility issues with enterprise
2.2.0
feat: added support for advanced notifications
2.1.8
feat: windows lib can now handle bounds request when the window is a frame
2.1.7
chore: bump due to dependencies update
2.1.6
chore: Resolved dependency vulnerabilities
