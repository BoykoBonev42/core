3.2.1
fix: expecting of iframes to always have glue window
3.2.0
feat: added support for targeting intent handlers with no appD
3.1.1.
bugfix: findIntent filters handlers by contextType
bugfix: findIntentsByContext filter handlers by contextType
bugfix: raiseIntent opens Intents Resolver UI
bugfix: addIntentListener uses glue.intents.register if present
bugfix: open resolves when the opened app launches and adds a context listener for the passed contextType
bugfix: getAppMetadata returns correct properties
bugfix: getOrCreateChannel throws if user channel is passed
bugfix: joinUserChannel throws if trying to join an  app channel
bugfix: addContextListener handler is not invoked if another app broadcasts non fdc3 data
bugfix: addContextListener adds a pending listener when invoked while not joined on a channel
bugfix: channel's addContextListener does not replay when there's an existent fdc3 data on the app channel
3.1.0
feat: updated all dependencies to the latest major versions
3.0.1
chore: updated rollup build to use a clean dist dir
3.0.0
feat: implements FDC3 2.0 standard
feat: no longer bundles the Glue42 libs
2.5.24
chore: bump due to dependencies update
2.5.23
chore: bump due to dependencies update
2.5.22
chore: bump due to dependencies update
2.5.21
chore: bump due to dependencies update
2.5.20
chore: bump due to dependencies update
2.5.19
chore: bump due to dependencies update
2.5.18
chore: bump due to dependencies update
2.5.17
fix: fix wait for autoinjected glue factory init
2.5.16
chore: bump due to dependencies update
2.5.15
fix: data wrapping when broadcasting a context
2.5.14
chore: bump due to dependencies update
2.5.13
chore: bump due to dependencies update
2.5.12
chore: bump due to dependencies update
2.5.11
chore: bump due to dependencies update
2.5.10
chore: bump due to dependencies update
2.5.9:
chore: updated @glue42/desktop@5.14.0
fix: leaving app channel should unsubscribe all listeners
2.5.8
chore: bump due to dependencies update
2.5.7
fix: the implementation know remembers past context types
2.5.6
chore: bump due to dependencies update
2.5.5
chore: bump due to dependencies update
2.5.4
feat: updated the @glue42/desktop to 5.12.0
2.5.3
feat: added the option for multiple context listeners before joining a channel
fix: added additional check to detect when running in Enterprise by expecting the user agent
2.5.2
chore: bump due to dependencies update
2.5.1
chore: bump due to dependencies update
2.5.0
chore: bump due to dependencies update
2.4.8
chore: bump due to dependencies update
2.4.7
chore: bump due to dependencies update
2.4.6
chore: bump due to dependencies update
2.4.5
chore: bump due to dependencies update
2.4.4
chore: bump due to dependencies update
2.4.3
chore: bump due to dependencies update
2.4.2
chore: bump due to dependencies update
2.4.1
feat: Enable fdc3 initialization in Electron container without @glue42/electron
2.4.0
feat: added support for GDX (Glue42 Developer Extension)
2.3.5
chore: bump due to dependencies update
2.3.4
chore: bump due to dependencies update
2.3.3
fix: improved glue42electron check
2.3.2
fix: Improved electron checks & added glue42EnterpriseConfig global variable
2.3.1
chore: bump due to dependencies update
2.3.0
feat: updated to the latest core
2.2.15
feat: add support for glue42/electron when running in Electron with contextIsolation: true
2.2.14
feat: add support for glue42/electron when running in Electron with contextIsolation: true
2.2.13
chore: bump due to dependencies update
2.2.12
chore: bump due to dependencies update
2.2.11
chore: bump due to dependencies update
2.2.10
chore: bump due to dependencies update
2.2.9
chore: resolved dependency vulnerabilities
2.2.8
chore: bump due to dependencies update
2.2.7
chore: bump due to dependencies update
2.2.6
fix: Fix an issue with the validation of raiseIntent()
2.2.5
chore: updated @glue42/desktop dependency
2.2.4
chore: bump due to dependencies update
2.2.3
chore: bump due to dependencies update
2.2.2
chore: bump due to dependencies update
2.2.1
chore: bump due to dependencies update
2.2.0
feat: Updated @glue42/fdc3 to the FDC3 v1.2 spec
