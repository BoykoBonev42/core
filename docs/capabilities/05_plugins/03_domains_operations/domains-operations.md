## Overview

This section describes the Glue42 API domain and operation IDs, and the signature of the `data` object each operation expects in order to be executed. Use this reference information to set the `domain`, `operation` and `data` properties of the base control message object correctly when invoking Glue42 operations in your interception handlers.

*You can find the signatures of all available Glue42 operations also in the `controller.ts` files of the Glue42 API domain directories in the [source code](https://github.com/Glue42/core/tree/master/packages/web-platform/src/libs) of the [`@glue42/web-platform`](https://www.npmjs.com/package/@glue42/web-platform) library.*

An example invocation of a Glue42 operation:

```javascript
// Settings for starting an instance of an app with a specified name.
const controlMessage = {
    domain: "appManager",
    operation: "applicationStart",
    data: {
        name: "My App Name"
    }
};

// The `platform` object has already been passed as an argument to the Plugin implementation.
await platform.system.sendControl(controlMessage);
```

All Glue42 domains have an operation called `"operationCheck"` that can be used to verify whether the provided Glue42 operation is supported.

The `data` object for this operation has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `operation` | `string` | **Required.** Name of the Glue42 operation to verify. |

The following example demonstrates how to verify whether an operation named `"openWindow"` exists:

```javascript
const controlMessage = {
    domain: "windows",
    operation: "operationCheck",
    data: {
        operation: "openWindow"
    }
};

// Checking whether the specified Glue42 operation is supported in the specified domain.
await platform.system.sendControl(controlMessage);
```

## App Management

To send a control message to the [App Management](../../application-management/index.html) domain, set the `domain` property to `"appManager"`.

The following Glue42 operations are available for this domain:

### "appHello"

Retrieves all available Glue42 apps connected to the [**Glue42 Core**](https://glue42.com/core/) environment.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | Optional ID of a Glue42 Window. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `apps` | `object[]` | Array of objects describing the Glue42 apps. |

### "applicationStart"

Starts a Glue42 app.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required.** Name of the app to start. |
| `id` | `string` | ID for the app instance. |
| `context` | `object` | Context for the started app. |
| `top` | `number` | Distance in pixels from the top edge of the screen for the app window. |
| `left` | `number` | Distance in pixels from the left edge of the screen for the app window. |
| `width` | `number` | Width in pixels for the app window. |
| `height` | `number` | Height in pixels for the app window. |
| `relativeTo` | `string` | The ID of a Glue42 Window relatively to which the new app window will be positioned. |
| `relativeDirection` | `"top"` \| `"left"` \| `"right"` \| `"bottom"` | Direction relative to the Glue42 Window specified in `realtiveTo` in which to position the new app window. |
| `forceChromeTab` | `boolean` | If `true`, will force the Chrome tab to open the app window with the bounds specified either in the app definition or in the app start options. |
| `layoutComponentId` | `string` | ID used for managing the new app window in Layouts. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ID of the started Glue42 app. |
| `applicationName` | `string` | The name of the started Glue42 app. |

### "clear"

Clears all in-memory app definitions at runtime.

A `data` object for this operation isn't required.

### "export"

Exports all in-memory app definitions at runtime.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `definitions` | [`Definition[]`](../../../reference/core/latest/appmanager/index.html#Definition) | Array of app definition objects. |

### "import"

Imports app definitions at runtime.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `definitions` | `object[]` | **Required.** An array of Glue42 [`Definition`](../../../reference/core/latest/appmanager/index.html#Definition) or FDC3 app definition objects to import. |
| `mode` | `"replace"` \| `"merge"` | **Required.** Mode for importing the app definitions. Use `"replace"` to replace all existing in-memory definitions with the provided ones. Use `"merge"` to merge the existing app definitions with the provided ones, replacing the app definitions with the same name. |

### "instanceStop"

Stops a Glue42 app instance.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | **Required.** ID of the app instance to stop. |

### "registerWorkspaceApp"

Registers an app instance as a Workspace window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required.** Name of the window to register in the Workspace. |
| `windowId` | `string` | **Required.** ID of the window to register in the Workspace. |
| `frameId` | `string` | **Required.** ID of the Workspaces App in which to register the window. |
| `appName` | `string` | App name of the window if it has been defined as a Glue42 app within the Glue42 environment. |
| `context` | `object` | Starting context for the window. |
| `title` | `string` | Title for the window. |

### "registerRemoteApps"

Registers app definitions fetched from a remote source.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `definitions` | `object[]` | **Required.** An array of Glue42 [`Definition`](../../../reference/core/latest/appmanager/index.html#Definition) or FDC3 app definition objects to register. |

### "remove"

Removes an app definition at runtime.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required.** Name of the app to remove. |

### "unregisterWorkspaceApp"

Unregisters an app instance from a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | **Required.** ID of the window to unregister from the Workspace. |

## Intents

To send a control message to the [Intents](../../intents/index.html) domain, set the `domain` property to `"intents"`.

The following Glue42 operations are available for this domain:

### "getIntents"

Retrieves all registered Intents.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `intents` | [`Intent[]`](../../../reference/core/latest/intents/index.html#Intent) | Array of objects describing the Intents. |

### "findIntent"

Retrieves Intent objects by a provided [`IntentFilter`](../../../reference/core/latest/intents/index.html#IntentFilter) object.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `filter` | [`IntentFilter`](../../../reference/core/latest/intents/index.html#IntentFilter) | Object for finding an Intent. If not provided, all available Intents will be returned. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `intents` | [`Intent[]`](../../../reference/core/latest/intents/index.html#Intent) | Array of Intent objects matching the search criteria. |

### "raise"

Raises an Intent. Extends the `"raiseIntent"` command by handling the Intent request considering the configuration for the Intents Resolver app.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `intentRequest` | [`IntentRequest`](../../../reference/core/latest/intents/index.html#IntentRequest) | Object describing the request for raising an Intent. |
| `resolverConfig` | `object` | Object with `enabled`, `appName` and `waitResponseTimeout` properties describing the configuration for the Intents Resolver app. |

Returns an [`IntentResult`](../../../reference/core/latest/intents/index.html#IntentResult) object.

### "raiseIntent"

Raises an Intent.

The `data` object for this operation is required and is an [`IntentRequest`](../../../reference/core/latest/intents/index.html#IntentRequest) object.

Returns an [`IntentResult`](../../../reference/core/latest/intents/index.html#IntentResult) object.

## Channels

To send a control message to the [Channels](../../data-sharing-between-apps/channels/index.html) domain, set the `domain` property to `"channels"`.

The following Glue42 operations are available for this domain:

### "addChannel"

Creates a new Glue42 Channel.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required.** Name for the new Channel. |
| `meta` | `object` | **Required.** Meta data for the new Channel. The meta data object contains a required `color` property that specifies the Channel color as an HTML color name or a hex value. |
| `data` | `object` | Data object that will be used as Channel context. |

## Window Management

To send a control message to the [Window Management](../../windows/window-management/index.html) domain, set the `domain` property to `"windows"`.

The following Glue42 operations are available for this domain:

### "close"

Closes a Glue42 Window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | **Required.** ID of the Glue42 Window to close. |

### "focus"

Focuses a Glue42 Window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | **Required.** ID of the Glue42 Window to focus. |

### "focusChange"

This operation informs the Glue42 environment that the focus of a Glue42 Window has changed.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | **Required.** ID of the Glue42 Window whose focus has changed. |
| `hasFocus` | `boolean` | **Required.** Whether the specified Glue42 Window has gotten or lost focus. |

### "getBounds"

Retrieves the bounds of a Glue42 Window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | **Required.** ID of the Glue42 Window whose bounds to retrieve. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | ID of the Glue42 Window. |
| `bounds` | [`Bounds`](../../../reference/core/latest/windows/index.html#Bounds) | Object describing the window bounds in pixels. |

### "getTitle"

Retrieves the title of a Glue42 Window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | **Required.** ID of the Glue42 Window whose title to retrieve. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | ID of the Glue42 Window. |
| `title` | `string` | Title of the Glue42 Window. |

### "getUrl"

Retrieves the URL of a Glue42 Window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | **Required.** ID of the Glue42 Window whose URL to retrieve. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | ID of the Glue42 Window. |
| `url` | `string` | The URL of the Glue42 Window. |

### "moveResize"

Changes the bounds (position and/or size) of a Glue42 Window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | **Required.** ID of the Glue42 Window whose bounds to change. |
| `top` | `number` | Distance in pixels from the top edge of the screen for the window. |
| `left` | `number` | Distance in pixels from the left edge of the screen for the window. |
| `width` | `number` | Width in pixels for the window. |
| `height` | `number` | Height in pixels for the window. |
| `relative` | `boolean` | If `true`, the new window location (`top` and `left`) will be set relatively to the current window position. |

### "openWindow"

Opens a new Glue42 Window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required.** Unique name for the Glue42 Window to open. |
| `url` | `string` | **Required.** URL to load in the new Glue42 Window. |
| `options` | [`Settings`](../../../reference/core/latest/windows/index.html#Settings) | Object with settings for the new Glue42 Window. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | ID of the Glue42 Window. |
| `name` | `string` | Name of the Glue42 Window. |

### "registerWorkspaceWindow"

Registers a Glue42 Window as a Workspace window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required.** Name of the window to register in the Workspace. |
| `windowId` | `string` | **Required.** ID of the window to register in the Workspace. |
| `frameId` | `string` | **Required.** ID of the Workspaces App in which to register the window. |
| `appName` | `string` | App name of the window if it has been defined as a Glue42 app within the Glue42 environment. |
| `context` | `object` | Starting context for the window. |
| `title` | `string` | Title for the window. |

### "setTitle"

Sets the title of a Glue42 Window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | **Required.** ID of the Glue42 Window whose title to set. |
| `title` | `string` | **Required.** Title for the Glue42 Window. |

### "unregisterWorkspaceWindow"

Unregisters a Glue42 Window from a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | **Required.** ID of the window to unregister from the Workspace. |

### "windowHello"

Retrieves all Glue42 Windows.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | Optional ID of a Glue42 Window. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windows` | `object[]` | Array of objects each with `windowId` and `name` properties describing the Glue42 Windows. |
| `isWorkspaceFrame` | `boolean` | Specifies whether the windows in the returned collection are Workspaces App instances. |

## Workspaces

To send a control message to the [Workspaces](../../windows/workspaces/overview/index.html) domain, set the `domain` property to `"workspaces"`.

The following Glue42 operations are available for this domain:

### "addContainer"

Adds a [`Box`](../../../reference/core/latest/workspaces/index.html#Box) element to a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `definition` | [`BoxDefinition`](../../../reference/core/latest/workspaces/index.html#BoxDefinition) | **Required.** Object describing the element to add to the Workspace. |
| `parentId` | `string` | **Required.** ID of the Workspace element in which to add the new element. |
| `parentType` | `"row"` \| `"column"` \| `"group"` \| `"workspace"` | **Required.** Type of the Workspace element in which to add the new element. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | ID of the added [`Box`](../../../reference/core/latest/workspaces/index.html#Box) element. |

### "addWindow"

Adds a [`WorkspaceWindow`](../../../reference/core/latest/workspaces/index.html#WorkspaceWindow) to a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `definition` | [`WorkspaceWindowDefinition`](../../../reference/core/latest/workspaces/index.html#WorkspaceWindowDefinition) | **Required.** Object describing the window to add to the Workspace. |
| `parentId` | `string` | **Required.** ID of the Workspace element in which to add the window. |
| `parentType` | `"row"` \| `"column"` \| `"group"` \| `"workspace"` | **Required.** Type of the Workspace element in which to add the window. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | ID of the added [`WorkspaceWindow`](../../../reference/core/latest/workspaces/index.html#WorkspaceWindow). |

### "bundleItem"

Bundles a Workspace element into a [`Row`](../../../reference/core/latest/workspaces/index.html#Row) or a [`Column`](../../../reference/core/latest/workspaces/index.html#Column).

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"row"` \| `"column"` | **Required.** Specifies whether to bundle the Workspace element into a [`Row`](../../../reference/core/latest/workspaces/index.html#Row) or a [`Column`](../../../reference/core/latest/workspaces/index.html#Column). |
| `itemId` | `string` | **Required.** ID of the Workspace element to bundle. |

### "bundleWorkspace"

Bundles an entire Workspace into a [`Row`](../../../reference/core/latest/workspaces/index.html#Row) or a [`Column`](../../../reference/core/latest/workspaces/index.html#Column).

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"row"` \| `"column"` | **Required.** Specifies whether to bundle the Workspace into a [`Row`](../../../reference/core/latest/workspaces/index.html#Row) or a [`Column`](../../../reference/core/latest/workspaces/index.html#Column). |
| `workspaceId` | `string` | **Required.** ID of the Workspace to bundle. |

### "checkStarted"

Checks whether the Workspaces controller has started.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `started` | `boolean` | Specifies whether the Workspaces controller has been initialized. |

### "closeItem"

Closes a Workspaces item - a Workspace, a Workspace element or the entire Workspaces App.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the Workspaces item to close. |

### "createFrame"

Creates an empty Workspaces [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) (a new instance of a Workpsaces App).

The `data` object for this operation is required and is an [`EmptyFrameDefinition`](../../../reference/core/latest/workspaces/index.html#EmptyFrameDefinition) object.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ID of the created [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) instance. |
| `isInitialized` | `boolean` | Specifies whether the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) has been initialized. |
| `initializationContext` | `object` | Object with a `context` property holding initial context passed to the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame), if any. |

### "createWorkspace"

Creates a new [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace).

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `children` | [`BoxDefinition[]`](../../../reference/core/latest/workspaces/index.html#BoxDefinition) \| [`WorkspaceWindowDefinition[]`](../../../reference/core/latest/workspaces/index.html#WorkspaceWindowDefinition) | **Required.** Array of objects describing the elements of the new Workspace. Pass an empty array to create an empty Workspace. |
| `config` | [`WorkspaceConfig`](../../../reference/core/latest/workspaces/index.html#WorkspaceConfig) | Object with settings for the new Workspace. |
| `context` | `object` | Object with context data that will be used for all windows in the Workspace. |
| `frame` | [`FrameTargetingOptions`](../../../reference/core/latest/workspaces/index.html#FrameTargetingOptions) | Object describing the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) in which to create the new Workspace. |
| `saveConfig` | [`WorkspaceCreateConfig`](../../../reference/core/latest/workspaces/index.html#WorkspaceCreateConfig) | Object with options for saving the new Workspace as a Layout. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ID of the created [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |
| `config` | `object` | Object describing the settings and properties of the new [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |
| `children` | `object[]` | Array of objects describing the elements of the new [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |
| `frameSummary` | `object` | Object describing the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) in which the Workspace was created. |
| `context` | `object` | The context passed to the new [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |

### "deleteLayout"

Deletes a Workspace Layout.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required.** Name of the Workspace Layout to delete. |

### "ejectWindow"

Ejects a window from a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the window to eject from the Workspace. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | ID of the window ejected from the Workspace. |

### "exportAllLayouts"

Exports all Workspace Layouts.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `layouts` | [`WorkspaceLayout[]`](../../../reference/core/latest/workspaces/index.html#WorkspaceLayout) | Array of objects describing the exported Workspace Layouts. |

### "focusItem"

Focuses a Workspaces App, a Workspace or a Workspace element.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the Workspaces item to focus. |

### "forceLoadWindow"

Forces a Workspace window to load its content.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the window to force to load. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | ID of the window that was forced to load. |

### "focusChange"

This operation informs the Glue42 environment that the focus of a Workspaces App has changed.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowId` | `string` | **Required.** ID of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) whose focus has changed. |
| `hasFocus` | `boolean` | **Required.** Whether the specified Workspaces App has gotten or lost focus. |

### "getAllFramesSummaries"

Retrieves the summary descriptions of all available [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) objects.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `summaries` | `object[]` | Array of objects each with `id`, `isInitialized` and `initializationContext` properties describing the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) objects. |

### "getAllLayoutsSummaries"

Retrieves the summary descriptions of all available Workspace Layouts.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `summaries` | `object[]` | Array of objects each with a `name` property describing the Workspace Layouts. |

### "getAllWorkspacesSummaries"

Retrieves the summary descriptions of all available Workspaces.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `summaries` | `object[]` | Array of objects each with `id` and `config` properties describing the Workspaces. |

### "getFrameBounds"

Retrieves the bounds of a [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame).

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) whose bounds to retrieve. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `bounds` | [`Bounds`](../../../reference/core/latest/windows/index.html#Bounds) | Object describing the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) bounds in pixels. |

### "getFrameSnapshot"

Retrieves a snapshot of a [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame).

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) whose snapshot to retrieve. |
| `excludeIds` | `boolean` | If `true`, the IDs of the various elements of the Workspaces won't be included in the snapshot. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ID of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame). |
| `config` | `object` | Object with `minWidth`, `maxWidth`, `minHeight` and `maxHeight` properties describing the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) constraints. |
| `workspaces` | `object[]` | Array of objects each with `id`, `children`, `config`, `frameSummary` and `context` properties describing the Workspaces in the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame). |

### "getFrameSummary"

Retrieves the summary description of a [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame).

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) whose summary to retrieve. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ID of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) instance. |
| `isInitialized` | `boolean` | Specifies whether the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) has been initialized. |
| `initializationContext` | `object` | Object with a `context` property that holds the initial context passed to the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame), if any. |

### "getPlatformFrameId"

Retrieves the ID of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) object that belongs to the Web Platform app (i.e., when a Workspaces App is also a [Main app](../../../developers/core-concepts/web-platform/overview/index.html)).

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ID of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) instance. |

### "getWorkspaceIcon"

Retrieves the icon of a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `workspaceId` | `string` | **Required.** ID of the [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace) whose icon to retrieve. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `icon` | `string` | Workspace icon in Base64 format. |

### "getWorkspacesConfig"

Retrieves the configuration for the Workspaces App as specified in the [Main app](../../../developers/core-concepts/web-platform/overview/index.html).

A `data` object for this operation isn't required.

Returns an object describing the [Workspaces App configuration](../../windows/workspaces/enabling-workspaces/index.html#main_app-hibernation).

### "getWorkspaceSnapshot"

Retrieves a snapshot of a [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace).

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace) whose snapshot to retrieve. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ID of the [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |
| `config` | `object` | Object describing the settings and properties of the [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |
| `children` | `object[]` | Array of objects describing the elements of the [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |
| `frameSummary` | `object` | Object describing the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) to which the Workspace belongs. |
| `context` | `object` | The context passed to the [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |

### "getWorkspaceWindowFrameBounds"

Retrieves the bounds of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) that contains a specified Workspace window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the Workspace window for which to retrieve the bounds of its [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame). |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `bounds` | [`Bounds`](../../../reference/core/latest/windows/index.html#Bounds) | Object describing the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) bounds in pixels. |

### "getWorkspaceWindowsOnLayoutSaveContext"

Retrieves the context of the windows in a Workspace when a Layout save has been requested.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `layoutName` | `string` | **Required.** Name of the Workspace Layout to which the windows belong. |
| `layoutType` | `"Global"` \| `"Workspace"` | **Required.** Type of the Workspace Layout to which the windows belong. Must be set to `"Workspace"`. |
| `windowIds` | `string[]` | **Required.** IDs of the windows whose context to retrieve. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowsOnSaveData` | `object[]` | Array of objects each with `windowId` and `windowContext` properties holding the ID and context of a Workspace window. |

### "hibernateWorkspace"

Hibernates a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `workspaceId` | `string` | **Required.** ID of the [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace) to hibernate. |

### "importLayout"

Imports a Workspace Layout.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `layout` | [`WorkspaceLayout`](../../../reference/core/latest/workspaces/index.html#WorkspaceLayout) | **Required.** Object to import. |
| `mode` | `"replace"` \| `"merge"` | **Required.** Mode for importing the Workspace Layout. Use `"replace"` to replace all existing Workspace Layouts with the imported one. Use `"merge"` to add the imported Workspace Layout to the existing ones or replace an existing Workspace Layout with the same name. |

### "initFrame"

Initializes an empty Workspaces [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame).

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `frameId` | `string` | **Required.** ID of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) to initialize. |
| `workspaces` | [`WorkspaceDefinition[]`](../../../reference/core/latest/workspaces/index.html#WorkspaceDefinition) \| [`RestoreWorkspaceDefinition[]`](../../../reference/core/latest/workspaces/index.html#RestoreWorkspaceDefinition) | **Required.** Array of objects with which to initialize the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame). Pass an empty array to initialize the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) without any Workspaces in it. |

### "isWindowInWorkspace"

Checks whether a window is in a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the window for which to check whether it's in a Workspace. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `inWorkspace` | `boolean` | Specifies whether the window is in a Workspace. |

### "lockContainer"

Locks a [`Box`](../../../reference/core/latest/workspaces/index.html#Box) element of a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the [`Box`](../../../reference/core/latest/workspaces/index.html#Box) element to lock. |
| `type` | `"row"` \| `"column"` \| `"group"` | **Required.** Type of the [`Box`](../../../reference/core/latest/workspaces/index.html#Box) element to lock. |
| `config` | [`RowLockConfig`](../../../reference/core/latest/workspaces/index.html#RowLockConfig) \| [`ColumnLockConfig`](../../../reference/core/latest/workspaces/index.html#ColumnLockConfig) \| [`GroupLockConfig`](../../../reference/core/latest/workspaces/index.html#GroupLockConfig) | Object with lock settings for the [`Box`](../../../reference/core/latest/workspaces/index.html#Box) element. To unlock all currently locked features, pass an empty object. |

### "lockWindow"

Locks a Workspace window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windowPlacementId` | `string` | **Required.** ID of the [`WorkspaceWindow`](../../../reference/core/latest/workspaces/index.html#WorkspaceWindow) to lock. |
| `config` | [`WorkspaceWindowLockConfig`](../../../reference/core/latest/workspaces/index.html#WorkspaceWindowLockConfig) | Object with lock settings for the [`WorkspaceWindow`](../../../reference/core/latest/workspaces/index.html#WorkspaceWindow). To unlock all currently locked features, pass an empty object. |

### "lockWorkspace"

Locks a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `workspaceId` | `string` | **Required.** ID of the [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace) to lock. |
| `config` | [`WorkspaceLockConfig`](../../../reference/core/latest/workspaces/index.html#WorkspaceLockConfig) | Object with lock settings for the [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). To unlock all currently locked features, pass an empty object. |

### "maximizeItem"

Maximizes a Workspace element.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the Workspace element to maximize. |

### "moveFrame"

Moves a [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) to an absolute or relative location on the screen. This operation can't be executed when the specified [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) is also a [Main app](../../../developers/core-concepts/web-platform/overview/index.html).

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) to move. |
| `top` | `number` | Distance in pixels from the top edge of the screen for the new location of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame). |
| `left` | `number` | Distance in pixels from the left edge of the screen for the new location of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame). |
| `relative` | `boolean` | If `true`, the new window location (`top` and `left`) will be set relatively to the current [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) position. |

### "moveWindowTo"

Moves a Workspace window to a specified containing element - another Workspace or a Workspace element.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the [`WorkspaceWindow`](../../../reference/core/latest/workspaces/index.html#WorkspaceWindow) to move. |
| `containerId` | `string` | **Required.** ID of the containing element to which to move the [`WorkspaceWindow`](../../../reference/core/latest/workspaces/index.html#WorkspaceWindow). |

### "openWorkspace"

Opens an already existing Workspace Layout.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required.** Name of the Workspace Layout. |
| `restoreOptions` | [`RestoreWorkspaceConfig`](../../../reference/core/latest/workspaces/index.html#RestoreWorkspaceConfig) | Options for restoring the Workspace Layout. If a Workspaces App instance isn't specified, the Workspace will be opened in the last created [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame). |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ID of the opened [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |
| `config` | `object` | Object describing the settings and properties of the opened [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |
| `children` | `object[]` | Array of objects describing the elements of the opened [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |
| `frameSummary` | `object` | Object describing the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame) in which the Workspace was opened. |
| `context` | `object` | The context passed to the opened [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace). |

### "pinWorkspace"

Pins a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `workspaceId` | `string` | **Required.** ID of the Workspace to pin. |
| `icon` | `string` | **Required.** Icon in Base64 format for the pinned Workspace. |

### "resizeItem"

Resizes a Workspace element or a [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame). [`Column`](../../../reference/core/latest/workspaces/index.html#Column) elements can be resized only in width. [`Row`](../../../reference/core/latest/workspaces/index.html#Row) elements can be resized only in height.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the element to resize. |
| `width` | `number` | Width in pixels for the element. |
| `height` | `number` | Height in pixels for the element. |
| `relative` | `boolean` | Taken into account only when resizing a [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame). If `true`, the specified `width` and `height` values will be added or subtracted from the current width and height of the [`Frame`](../../../reference/core/latest/workspaces/index.html#Frame). |

### "restoreItem"

Restores a previously maximized Workspace element.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the Workspace element to restore. |

### "resumeWorkspace"

Resumes a hibernated Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `workspaceId` | `string` | **Required.** ID of the [`Workspace`](../../../reference/core/latest/workspaces/index.html#Workspace) to resume. |

### "saveLayout"

Saves a Workspace Layout.

The `data` object for this operation is required and is a [`WorkspaceLayoutSaveConfig`](../../../reference/core/latest/workspaces/index.html#WorkspaceLayoutSaveConfig) object.

Returns a [`WorkspaceLayout`](../../../reference/core/latest/workspaces/index.html#WorkspaceLayout) object.

### "setItemTitle"

Sets the title of a Workspace or a Workspace window.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the Workspace or the Workspace window whose title to set. |
| `title` | `string` | **Required.** Title for the Workspace or the Workspace window. |

### "setMaximizationBoundary"

Sets a [`Column`](../../../reference/core/latest/workspaces/index.html#Column) or a [`Row`](../../../reference/core/latest/workspaces/index.html#Row) element as a maximization boundary for its child Workspace elements.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | **Required.** ID of the [`Column`](../../../reference/core/latest/workspaces/index.html#Column) or the [`Row`](../../../reference/core/latest/workspaces/index.html#Row) element which to set as a maximization boundary. |
| `enabled` | `boolean` | **Required.** If `true`, will set the element as a maximization boundary. |

### "setWorkspaceIcon"

Sets an icon for a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `workspaceId` | `string` | **Required.** ID of the Workspace whose icon to set. |
| `icon` | `string` | Icon in Base64 format for the Workspace. |

### "unpinWorkspace"

Unpins a Workspace.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `workspaceId` | `string` | **Required.** ID of the Workspace to pin. |

## Layouts

To send a control message to the [Layouts](../../windows/layouts/setup/index.html) domain, set the `domain` property to `"layouts"`.

The following Glue42 operations are available for this domain:

### "checkGlobalActivated"

Checks whether Global Layouts are available.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `isAvailable` | `boolean` | Specifies whether Global Layouts are available. |

### "export"

Exports Layouts by type.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `type` | [`LayoutType`](../../../reference/core/latest/layouts/index.html#LayoutType) | **Required.** Type of the Layouts to export. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `layouts` | [`Layout[]`](../../../reference/core/latest/layouts/index.html#Layout) | Array of objects describing the exported Layouts. |

### "get"

Retrieves a Layout.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required.** Name of the Layout to retrieve. |
| `type` | [`LayoutType`](../../../reference/core/latest/layouts/index.html#LayoutType) | **Required.** Type of the Layout to retrieve. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `layout` | [`Layout`](../../../reference/core/latest/layouts/index.html#Layout) | Object describing the retrieved Layout. |

### "getAll"

Retrieves all Layout summaries by Layout type.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `type` | [`LayoutType`](../../../reference/core/latest/layouts/index.html#LayoutType) | **Required.** Type of the Layouts whose summaries to retrieve. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `summaries` | [`LayoutSummary[]`](../../../reference/core/latest/layouts/index.html#LayoutSummary) | Array of objects describing the Layout summaries. |

### "getGlobalPermissionState"

Retrieves the [permission state for the Multi-Screen Window Placement browser functionality](../../windows/layouts/layouts-api/index.html#requesting_multiscreen_window_placement_permission), required for Global Layouts to work properly.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `state` | `"prompt"` \| `"granted"` \| `"denied"` | State of the permission for the Multi-Screen Window Placement browser functionality. |

### "getRawWindowsLayoutData"

Retrieves raw window data when a Layout save is requested.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `layoutType` | `"Global"` \| `"Workspace"` | **Required.** Type of the Layout for which a save operation has been requested. |
| `layoutName` | `string` | **Required.** Name of the Layout for which a save operation has been requested. |
| `context` | `object` | Context to be saved for the Layout windows. |
| `instances` | `string[]` | Array of IDs of windows to be saved in the Layout. |
| `ignoreInstances` | `string[]` | Array of IDs of windows to be ignored when saving the Layout. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `windows` | `object[]` | Array of objects describing the windows to be saved in the Layout. |

### "import"

Imports Layouts.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `layouts` | [`Layout[]`](../../../reference/core/latest/layouts/index.html#Layout) | **Required.** Array of objects describing the Layouts to import. |
| `mode` | `"replace"` \| `"merge"` | **Required.** Mode for importing the Layouts. Use `"replace"` to replace all existing Layouts with the provided ones. Use `"merge"` to merge the existing Layouts with the provided ones, replacing the Layouts with the same name. |

### "remove"

Removes a Layout.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required.** Name of the Layout to remove. |
| `type` | [`LayoutType`](../../../reference/core/latest/layouts/index.html#LayoutType) | **Required.** Type of the Layout to remove. |

### "requestGlobalPermission"

Shows a browser prompt that requests permission from the user for the [Multi-Screen Window Placement browser functionality](../../windows/layouts/layouts-api/index.html#requesting_multiscreen_window_placement_permission), required for Global Layouts to work properly.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `isAvailable` | `boolean` | If `true`, the user has granted permission. |

### "restore"

Restores a Global Layout.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `layout` | [`RestoreOptions`](../../../reference/core/latest/layouts/index.html#RestoreOptions) | **Required.** Object with options for the Layout to restore. |

### "save"

Saves a Global Layout.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `layout` | [`NewLayoutOptions`](../../../reference/core/latest/layouts/index.html#NewLayoutOptions) | **Required.** Object with options for the Layout to save. |

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `layout` | [`Layout`](../../../reference/core/latest/layouts/index.html#Layout) | Object describing the saved Layout. |

## Notifications

To send a control message to the [Notifications](../../notifications/setup/index.html) domain, set the `domain` property to `"notifications"`.

The following Glue42 operations are available for this domain:

### "clear"

Removes a notification by ID.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | **Required.** ID of the notification to remove. |

### "clearAll"

Removes all known notifications.

A `data` object for this operation isn't required.

### "click"

Clicks a notification or a notification action programmatically.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | **Required.** ID of the notification to click. |
| `action` | `string` | Name of the notification action to click. |

### "getPermission"

Retrieves the notification permission state.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `permission` | `"granted"` \| `"denied"` \| `"default"` | State of the permission for sending web notifications to the desktop. |

### "list"

Retrieves all known notifications.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `notifications` | [`NotificationData[]`](../../../reference/core/latest/notifications/index.html#NotificationData) | Array of objects describing the notifications. |

### "raiseNotification"

Raises a notification.

The `data` object for this operation is required and has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `settings` | [`RaiseOptions`](../../../reference/core/latest/notifications/index.html#RaiseOptions) | **Required.** Object with options for the notification to raise. |
| `id` | `string` | **Required.** Notification ID. |

### "requestPermission"

Shows a browser prompt that requests permission from the user for sending web notifications to the desktop.

A `data` object for this operation isn't required.

Returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `permissionGranted` | `boolean` | If `true`, the user has granted permission. |