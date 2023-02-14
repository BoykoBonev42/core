1.20.2
chore: bump due to dependencies update
1.20.1
feat: added bundleTo methods to the group
1.20.0
feat: updated all dependencies to the latest major versions
1.19.0
fix: layouts import in Enterprise now uses a new operation to import all layouts instead of one by one
feat: added isSelected to the workspace window typings and enabled the focused property for Core and Core+
feat: adds support for layoutComponentId
fix: closing a workspace now checks if this is the last workspace in a platform frame
1.18.2
chore: bump due to dependencies update
1.18.1
fix: layouts import in Enterprise price is now reverted back to operating on top of the bridge protocol
1.18.0
chore: updated the typings
1.17.3
chore: updated rollup build to use a clean dist dir
1.17.2
fix: dedicated the layouts import to the underlying glue, instead of transmitting a dedicated workspaces protocol message
1.17.1
feat: optimized the performance of glue.workspaces.getMyWorkspace()
chore: removed unnecessary console.log
1.17.0
feat: added workspace lock events
1.16.4
feat: added version property to the top-level API
1.16.3
feat: added workspace.show/hideLoadingAnimation and window.isSelected
feat: added frame.onFocusChanged event
1.16.2
feat: added the setMaximizationBoundary method
1.16.1
feat: added support for allowReorder, allowWindowReorder and allowWorkspaceTabReorder
feat: added frameBounds to the data provided to workspace and frame closed events
1.16.0
feat: added support for allowWorkspaceTabExtract
1.15.5
chore: moved the workspace application property
1.15.4
chore: bump due to dependencies update
1.15.3
chore: bump due to dependencies update
1.15.2
feat: added onWindowMaximized and onWindowRestored events
1.15.1
fix: improved the typings of the box definitions
1.15.0
feat: added support for maximization boundaries
1.14.0
feat: added support for shortcuts in Enterprise
1.13.0
feat: added support for application name when restoring a workspace in Enterprise
1.12.2
fix: fixes the breaking change introduced in 1.12.0 which caused incompatibility between 1.12.X platform and api clients prior to 1.12.0
1.12.1
chore: bump due to dependencies update
1.12.0
feat: added improvements for the connection transport switch functionality
1.11.1
chore: bump due to dependencies update
1.11.0
chore: updated the workspaces typings with the latest features
1.10.6
chore: updated the decoders to pass isMaximized in window layout items
1.10.5
chore: bump due to dependencies update
1.10.4
feat: added positionIndex property as a config when opening workspaces
feat: added a WorkspacePinOptions interface for better extensibility 
1.10.3
feat: added createFrame, frame.init, frame.isInitialized and frame.onInitializationRequested
1.10.2
feat: added isSelected support
feat: pinned tabs support and workspace icons
1.10.1
feat: saveLayout() now can also save meta data
1.10.0
feat: added support for GDX (Glue42 Developer Extension)
1.9.1
chore: bump due to dependencies update
1.9.0
feat: added waitForFrame method and updated to the latest core
1.8.2
chore: bump due to dependencies update
1.8.1
chore: added noTabHeader to the workspace restore options
1.8.0
feat: updated all typings to be inline with Enterprise 3.12
feat: added isSelected to the workspace object
feat: implemented the maximization of containers
1.7.5
feat: added allowSplitters to rows and columns and allowDropLeft, allowDropTop, allowDropRight, allowDropBottom, allowDropHeader to the groups
fix: started firing open and close workspace events when the last workspace in a frame acting like a platform has been closed
chore: Resolved dependency vulnerabilities
1.7.4
feat: added getWorkspaceById method and made internal performance optimizations
1.7.3
chore: bump due to dependencies update
1.7.2
chore: bump due to dependencies update
1.7.1
fix: fixed allowDropLeft, allowDropTop, allowDropRight, allowDropBottom in the workspaces config object by adding them to the decoders
1.7.0
feat: added getBounds for workspaces frames
feat: added support for workspaces constraints
feat: added support for workspaces elements sizes
1.6.2
fix: improved compatibility with GD 3.11 by allowing for an optional isSelected workspaceConfig in the protocol
1.6.1
chore: Resolved dependency vulnerabilities
