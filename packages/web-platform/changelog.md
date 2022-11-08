1.17.1
chore: bump due to dependencies update
1.17.0
feat: added support for intents result type
1.16.1
fix: Fixes various types issues in web platform
1.16.0
feat: reworked the way the platform interacts with Glue42 Core+
feat: added a no-gateway bundle
1.15.1
fix: the platform now defaults to being a simple client when added to a Workspace
1.15.0
feat: added feature detection to the communication protocol
fix: the platform can handle up to 1000 layouts in one bulk import
1.14.3
chore: bump due to dependencies update
1.14.2
feat: added workspace lock events
1.14.1
feat: added dedicated corePlus config entry and extended the plugins capabilities with registration
1.14.0
feat: window ids now contain a g42 prefix
feat: plugins now have access to the platform API
feat: added support for adding channels runtime
feat: changed the decoders to support window.isSelected
1.13.3
feat: added setMaximizationBoundary
1.13.2
chore: updated the decoders with allowReorder, allowWindowReorder and allowWorkspaceTabReorder
feat: added frameBounds to the data provided to workspace and frame closed events
1.13.1
chore: bump due to dependencies update
1.13.0
feat: added interception and enabled the layouts messaging
chore: updated the decoders with allowWorkspaceTabExtract
1.12.12
feat: the platform now exposes it's version and disconnects gw clients when handling unregistration of workspaces apps and windows
1.12.11
chore: bump due to dependencies update
1.12.10
chore: bump due to dependencies update
1.12.9
chore: updated @glue42/desktop@5.14.0
1.12.8
feat: added support for onWindowMaximized and onWindowRestored
1.12.7
feat: added support for the maximizationBoundary flag in workspaces
1.12.6
chore: bump due to dependencies update
1.12.5
chore: bump due to dependencies update
1.12.4
feat: extended the workspace layout decoder to validate an application property
1.12.3
feat: added support for the new provider context in the authentication object of the preferred connection config
1.12.2
fix: fixes the breaking change introduced in 1.12.0 which caused incompatibility between 1.12.X platform and web clients prior to 2.6.0
1.12.1
chore: resolved dependency vulnerabilities
1.12.0
feat: the platform can now search for, connect to and instruct it's clients to also connect to an alternative gateway 
1.11.1
chore: bump due to dependencies update
1.11.0
chore: updated the workspaces typings with the latest features
1.10.1 
chore: updated the decoders to pass isMaximized in window layout items
1.10.0
feat: added support for focusing the platform on click via notifications with action buttons
1.9.5
feat: added positionIndex property as a config when opening workspaces
1.9.4
feat: added positionIndex property as a config when opening workspaces
1.9.3
feat: added support for the API frame initialization
1.9.2
feat: added support for workspace pinned tabs and workspace icons
1.9.1
chore: bump due to dependencies update
1.9.0
feat: added support for GDX (Glue42 Developer Extension)
1.8.3
fix: added support for bulk app definitions import
1.8.2
chore: bump due to dependencies update
1.8.1
chore: bump due to dependencies update
1.8.0
chore: updated to the latest core
1.7.3
chore: bump due to dependencies update
1.7.2
chore: bump due to dependencies update
1.7.1
feat: added support for getPermission
1.7.0
feat: added isSelected to the workspace object and dependencies update inline with 3.12 Enterprise release
1.6.6
feat: added an option to focus the platform when a notification receives a default click
1.6.5
feat: added allowSplitters to rows and columns and allowDropLeft, allowDropTop, allowDropRight, allowDropBottom, allowDropHeader to the groups
chore: Resolved dependency vulnerabilities
1.6.4
chore: bump due to dependencies update
1.6.3
chore: bump due to dependencies update
1.6.2
chore: updated @glue42/desktop dependency
1.6.1
fix: fixed broken backward compatibility due to expected constraints properties
fix: added missing optional properties in the workspaces config result
1.6.0
feat: added support for a Service Worker
feat: added support for advanced notifications
fix: fixed allowDropLeft, allowDropTop, allowDropRight, allowDropBottom in the workspaces config object by adding them to the decoders
1.5.0
feat: extended workspaces protocol and decoders for servicing frame bounds requests
feat: extended workspaces protocol and decoders for handling workspaces constraints
1.4.3
chore: bump due to dependencies update
1.4.2
chore: Resolved dependency vulnerabilities
