## Layout Operations

The Layouts API is accessible through the [`glue.layouts`](../../../../reference/core/latest/layouts/index.html) object.

### All Layouts by Type

To get all Layouts by type, use the [`getAll()`](../../../../reference/core/latest/layouts/index.html#API-getAll) method and pass a [`LayoutType`](../../../../reference/core/latest/layouts/index.html#LayoutType). It returns a collection of [`LayoutSummary`](../../../../reference/core/latest/layouts/index.html#LayoutSummary) objects, which don't contain the extensive objects describing the actual [`Layout`](../../../../reference/core/latest/layouts/index.html#Layout) components:

```javascript
const allGlobalLayouts = await glue.layouts.getAll("Global");
```

### Specific Layout

To get a specific Layout, use the [`get()`](../../../../reference/core/latest/layouts/index.html#API-get) method and provide the name of the Layout and the [`LayoutType`](../../../../reference/core/latest/layouts/index.html#LayoutType) as arguments. It returns the requested [`Layout`](../../../../reference/core/latest/layouts/index.html#Layout) object or `undefined` if a Layout with the specified name and type doesn't exist:

```javascript
const name = "My Layout";
const type = "Global";

const myLayout = await glue.layouts.get(name, type);
```

### Save & Restore

*Note that if you haven't already handled programmatically the process of [requesting a permission from the user for the Multi-Screen Window Placement browser functionality](#requesting_multiscreen_window_placement_permission), the first time either the [`save()`](../../../../reference/core/latest/layouts/index.html#API-save) or the [`restore()`](../../../../reference/core/latest/layouts/index.html#API-restore) method is invoked, the Global Layouts library will automatically ask the user for permission. This default behavior isn't recommended, as it's not ideal for the user experience.*

To save a Layout, use the [`save()`](../../../../reference/core/latest/layouts/index.html#API-save) method and pass a [`NewLayoutOptions`](../../../../reference/core/latest/layouts/index.html#NewLayoutOptions) object with a required `name` property. Note that if a Layout with that name already exists, it will be replaced. This method returns the saved [`Layout`](../../../../reference/core/latest/layouts/index.html#Layout) object:

```javascript
const layoutConfig = {
    name: "My Layout"
};

const savedLayout = await glue.layouts.save(layoutConfig);
```

To restore a Layout, use the [`restore()`](../../../../reference/core/latest/layouts/index.html#API-restore) method and pass a [`RestoreOptions`](../../../../reference/core/latest/layouts/index.html#RestoreOptions) object specifying the name of the Layout (required) and other restore options:

```javascript
const restoreOptions = {
    name: "My Layout",
    // Specify whether to close all running apps before restoring the Layout. Defaults to `true`.
    // Note that the Main app is an exception and will never be closed when restoring a Layout.
    closeRunningInstance: false
};

await glue.layouts.restore(restoreOptions);
```

### Remove

To remove a Layout, use the [`remove()`](../../../../reference/core/latest/layouts/index.html#API-remove) method. You must pass the [`LayoutType`](../../../../reference/core/latest/layouts/index.html#LayoutType) and the name of the Layout as arguments:

```javascript
await glue.layouts.remove("Global", "My Layout");
```

### Export & Import

You can export all currently available [`Layout`](../../../../reference/core/latest/layouts/index.html#Layout) objects with the [`export()`](../../../../reference/core/latest/layouts/index.html#API-export) method. Exported Layouts can be stored to a database and then be used as restore points, or can be sent to another user and imported on their machine.

```javascript
const layouts = await glue.layouts.export();
```

To import exported Layouts, use the [`import()`](../../../../reference/core/latest/layouts/index.html#API-import) method. Pass the collection of [`Layout`](../../../../reference/core/latest/layouts/index.html#Layout) objects to import and specify an [`ImportMode`](../../../../reference/core/latest/layouts/index.html#ImportMode):

```javascript
const mode = "merge";

await glue.layouts.import(layouts, mode);
```

The [`ImportMode`](../../../../reference/core/latest/layouts/index.html#ImportMode) controls the import behavior. If set to `"replace"` (default), all existing Layouts will be removed. If set to `"merge"`, the Layouts will be imported and merged with the existing Layouts.

## Layout Events

The Layouts API allows your app to react to Layout events - adding, removing and updating a Layout. Use the returned unsubscribe function to stop receiving notifications about the respective event.

### Added

To subscribe for the event which fires when a Layout is added, use the [`onAdded()`](../../../../reference/core/latest/layouts/index.html#API-onAdded) method:

```javascript
glue.layouts.onAdded(console.log);
```

### Removed

To subscribe for the event which fires when a Layout is removed, use the [`onRemoved()`](../../../../reference/core/latest/layouts/index.html#API-onRemoved) method:

```javascript
glue.layouts.onRemoved(console.log);
```

### Changed

To subscribe for the event which fires when a Layout is changed, use the [`onChanged()`](../../../../reference/core/latest/layouts/index.html#API-onChanged) method:

```javascript
glue.layouts.onChanged(console.log);
```

## Save & Update Context

When a Layout is saved, apps can store context data in it. When the Layout is restored, the context data is also restored and returned to the apps. Context data can be saved in all Layout types.

*Note that saving large volumes of custom data as window context (e.g., thousands of lines of table data) can lead to significant delays when saving a Layout. A Layout usually contains several (in some cases - many) apps and/or Workspaces (which can also contain many apps) and if one or more of the apps saves large amounts of context data each time a Layout is saved, this will significantly slow down the saving process. The methods for saving custom context work best with smaller amounts of data. If your app needs to save large amounts of data, you have to think about how to design this process better - for instance, you may store IDs, indices, etc., as context data, save the actual data to a database and when you restore the Layout, fetch the data using the data IDs saved as window context.*

### Saving Context Data

To save context data, apps can subscribe for Layout save requests using the [`onSaveRequested()`](../../../../reference/core/latest/layouts/index.html#API-onSaveRequested) method. A Layout save request event is fired when the user attempts to save a Layout or close a window, Workspace, etc. The on `onSaveRequested()` method accepts a callback which will be invoked when a Layout save request is triggered. The callback will receive as an argument a [`SaveRequestContext`](../../../../reference/core/latest/layouts/index.html#SaveRequestContext) object containing the Layout name, type and context. Use it to determine the type of the Layout and instruct your app to react accordingly:

```javascript
const saveRequestHandler = (requestInfo) => {
    // Get the Layout type.
    const layoutType = requestInfo.layoutType;

    // Check the Layout type and return data.
    if (layoutType === "Global") {
        return { windowContext: { gridWidth: 42 } };

    } else {
        // Return if not interested in other Layout types.
        return;
    };
};

glue.layouts.onSaveRequested(saveRequestHandler);
```

The callback must return a [`SaveRequestResponse`](../../../../reference/core/latest/layouts/index.html#SaveRequestResponse) object that has a [`windowContext`](../../../../reference/core/latest/layouts/index.html#SaveRequestResponse-windowContext) property.

After the Layout has been restored, the saved context data will be available in the window context:

```javascript
// Extracting previously saved data from the window context.
const windowContext = await glue.windows.my().getContext();
const gridWidth = windowContext.gridWidth;
```

## Checking the Global Layouts State

To check whether the [Main app](../../../../developers/core-concepts/web-platform/overview/index.html) has loaded and initialized the Global Layouts library that enables [**Glue42 Core+**](https://glue42.com/core-plus/) to save and restore Layouts of type `"Global"`, use the [`getGlobalTypeState()`](../../../../reference/core/latest/layouts/index.html#API-getGlobalTypeState) method. It returns an object with an `activated` property holding a Boolean value:

```javascript
const state = await glue.layouts.getGlobalTypeState();

if (state.activated) {
    // Global Layouts are available.
} else {
    // Global Layouts aren't available.
};
```

## Requesting Multi-Screen Window Placement Permission

The Layouts API provides methods with which you can ask the user to allow the Multi-Screen Window Placement browser functionality, which is mandatory for the Global Layouts to work properly. This allows you to handle the permission request process at the right moment, in a well-designed manner.

To check whether the user has already granted or denied permission for the Multi-Screen Window Placement browser functionality, or this permission is yet to be requested, use the [`getMultiScreenPermissionState()`](../../../../reference/core/latest/layouts/index.html#API-getMultiScreenPermissionState) method and extract the value describing the current permission state from the `state` property of the returned object:

```javascript
const permission = await glue.layouts.getMultiScreenPermissionState();

switch (permission.state) {
    case "prompt":
        // Permission hasn't been requested yet.
        break;
    case "granted":
        // Permission has already been granted.
        break;
    case "denied":
        // Permission has already been denied.
        break;
    default:
        break;
};
```

To request a permission from the user for the Multi-Screen Window Placement browser functionality, use the [`requestMultiScreenPermission()`](../../../../reference/core/latest/layouts/index.html#API-requestMultiScreenPermission) method. It returns an object with a `permissionGranted` Boolean property:

```javascript
const result = await glue.layouts.requestMultiScreenPermission();

if (result.permissionGranted) {
    // The user has granted permission.
} else {
    // The user has denied permission.
};
```

*Note that `requestMultiScreenPermission()` should be called only by the [Main app](../../../../developers/core-concepts/web-platform/overview/index.html) in order to guarantee that the browser will indeed display the appropriate prompt. If any other [Web Client](../../../../developers/core-concepts/web-client/overview/index.html) invokes `requestMultiScreenPermission()`, then the corresponding Main app will try to request the permission, but will almost certainly fail to display the prompt, because of the transient activation requirement for displaying permission prompts employed by most major browsers.*

## Reference

For a complete list of the available Layouts API methods and properties, see the [Layouts API Reference Documentation](../../../../reference/core/latest/layouts/index.html).