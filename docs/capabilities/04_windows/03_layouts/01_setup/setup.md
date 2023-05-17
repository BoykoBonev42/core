## Overview

End users in large enterprises often have multi-monitor setups on which they arrange the necessary apps in the most convenient way for executing daily tasks. The [**Glue42 Core+**](https://glue42.com/core-plus/) Layouts feature allows them to save and later restore the exact arrangement and context of their environment - windows, apps, [Workspaces](../../workspaces/overview/index.html), and their bounds and context. Users can save multiple apps and Workspaces in different Layouts, each corresponding to a specific task or workflow. Restoring the saved Layout happens with a single click and saves time and effort for finding, launching and arranging the desired apps.

The Layouts library has the following capabilities:

- importing, exporting, removing and getting Layouts;
- saving and restoring Layouts (exclusive to [**Glue42 Core+**](https://glue42.com/core-plus/));
- events related to adding, removing, changing or saving Layouts;
- requesting browser [permission for the Multi-Screen Window Placement API](#requirements__limitations-multiscreen_window_placement_permission);

The [**Glue42 Core+**](https://glue42.com/core-plus/) Layouts library supports different types of Layouts:

- **Global**

This type of Layout can contain floating windows, apps and [Workspaces](../../workspaces/overview/index.html). A Global Layout describes the bounds and context of all components participating in it.

*Note that the [Main app](../../../../developers/core-plus-platform/index.html) isn't saved in a Global Layout, as it's assumed that the Main app is the entry point of a [**Glue42 Core+**](https://glue42.com/core-plus/) project from where all Global Layouts are to be handled.*

- **Workspace**

The Layout of a [Workspace](../../workspaces/overview/index.html#workspaces_concepts-workspace) instance describes the arrangement of the Workspace elements, its bounds and the context of the apps participating in it.

## Enabling Layouts

*Note that this feature is available only under a paid license for [**Glue42 Core+**](https://glue42.com/core-plus/). For information on purchasing the [**Glue42 Core+**](https://glue42.com/core-plus/) platform  or requesting a trial license, [contact us](https://glue42.com/contacts/) at `info@glue42.com`. For more details on how to enable the [**Glue42 Core+**](https://glue42.com/core-plus/) platform, see the [Developers > Glue42 Core+ Platform](../../../../developers/core-plus-platform/index.html) section.*

Most of the [Layouts API](../../../../reference/core/latest/layouts/index.html) is available as part of the standard free [**Glue42 Core**](https://glue42.com/core/) APIs - users are able to import, export and listen for Layout events. However, saving and restoring Global Layouts is exclusive to [**Glue42 Core+**](https://glue42.com/core-plus/).

The Global Layouts functionality is available by default when you activate the [`@glue42/core-plus`](https://www.npmjs.com/package/@glue42/core-plus) package in your [Main app](../../../../developers/core-plus-platform/index.html). Use the `globalLayouts` property of the configuration object for the [`@glue42/core-plus`](https://www.npmjs.com/package/@glue42/core-plus) library to enable or disable Global Layouts:

```javascript
import Glue42CorePlus from "@glue42/core-plus";
import GlueWorkspaces from "@glue42/workspaces-api";

const config = {
    licenseKey: "my-license-key",
    glue: { libraries: [GlueWorkspaces] },
    workspaces: { src: "http://localhost:3000" },
    // Global Layouts configuration.
    globalLayouts: { enabled: true }
};

const { glue } = await Glue42CorePlus(config);
```

The `globalLayouts` object has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | If `true` (default), saving and restoring Global Layouts will be enabled. |

Enabling the [Workspaces API](https://www.npmjs.com/package/@glue42/workspaces-api) isn't strictly required in order to use Global Layouts, but it's highly recommended, because you can never be completely sure what type of Layout your system will need to restore. If the Global Layout you want to restore describes one or more components which are [Workspace Layouts](../../workspaces/overview/index.html#workspaces_concepts-workspace_layout), then a missing [Workspaces configuration](../../workspaces/enabling-workspaces/index.html) will result in errors.

## Compatibility with Glue42 Enterprise

Global Layouts in [**Glue42 Core+**](https://glue42.com/core-plus/) and in [**Glue42 Enterprise**](https://glue42.com/enterprise) are optimally, but not entirely compatible. When using the same Layouts in [**Glue42 Core+**](https://glue42.com/core-plus/) and in [**Glue42 Enterprise**](https://glue42.com/enterprise), you have to consider the following:

- All Layouts saved in [**Glue42 Core+**](https://glue42.com/core-plus/) can be imported and restored in [**Glue42 Enterprise**](https://glue42.com/enterprise), provided that the apps described in the Layout are also part of [**Glue42 Enterprise**](https://glue42.com/enterprise).

- All Layouts saved in [**Glue42 Enterprise**](https://glue42.com/enterprise) can be imported and will be restored as accurately as possible in [**Glue42 Core+**](https://glue42.com/core-plus/). This is due to the fact that [**Glue42 Enterprise**](https://glue42.com/enterprise) has advanced window management capabilities like support for different [window types](https://docs.glue42.com/glue42-concepts/windows/window-management/overview/index.html#window_modes), [advanced window tabs](https://docs.glue42.com/glue42-concepts/windows/window-management/overview/index.html#window_modes-tab_windows), native apps and much more, which can't be translated to a web Layout, because most of these features aren't available in the standard browsers, or in the case of window tabs, the browser tabbing significantly restricts and complicates the Glue42 [Window Management](../../window-management/index.html) capabilities. If a [**Glue42 Enterprise**](https://glue42.com/enterprise) Layout contains tabbed windows, in a [**Glue42 Core+**](https://glue42.com/core-plus/) Layout they will be restored as separate browser windows with the same bounds on the screen. If a [**Glue42 Enterprise**](https://glue42.com/enterprise) Layout contains a native app participating in a [Workspace](../../workspaces/overview/index.html#workspaces_concepts-workspace), in a [**Glue42 Core+**](https://glue42.com/core-plus/) Layout the Workspace will be restored with an empty component containing a "+" button in it from which the user can add a new app.

- When a [**Glue42 Enterprise**](https://glue42.com/enterprise) Layout is imported, restored and saved again in [**Glue42 Core+**](https://glue42.com/core-plus/), only a soft update is performed on the original components of the Layout. This means that only the bounds and the context of the original components are updated. This preserves all properties specific to [**Glue42 Enterprise**](https://glue42.com/enterprise).

- To ensure optimal control over how and what is saved and restored in a Layout, it's recommended to use the `metadata` property of a [`Layout`](../../../../reference/core/latest/layouts/index.html#Layout) object to indicate the target environment for the Layout. This will allow you to import and restore only the Layouts for the environment in which your app is currently running.

## Requirements & Limitations

### Browser Requirements

Global Layouts require that the browser supports the [Multi-Screen Window Placement API](https://www.w3.org/TR/window-placement/), which was introduced in Chrome 100 and in Edge 100. If this API isn't available, Global Layouts won't be able to initialize, resulting in an error.

### Multi-Screen Window Placement Permission

The [Multi-Screen Window Placement API](https://www.w3.org/TR/window-placement/) of the browser, required for using Global Layouts, in turn requires an explicit permission by the user. Requesting this permission must be done carefully and must be planned well, because should the user deny the permission, then there is no programmatic way to ask them again or revert their decision. That's why the Global Layouts library offers methods containing all necessary tools for the developer to ask the user for the Multi-Screen Window Placement permission at the right moment and in a well-designed way. For more details and examples, see the [Layouts API > Requesting Multi-Screen Window Placement Permission](../layouts-api/index.html#requesting_multiscreen_window_placement_permission) and [Layouts API > Checking the Global Layouts State](../layouts-api/index.html#checking_the_global_layouts_state) sections.

*Note that if requesting this permission isn't handled with the provided methods, the Global Layouts library will automatically request it the first time a Layout is saved or restored, but this default behavior isn't recommended, as it's not ideal for the user experience.*

### Outdated Glue42 Libraries

Projects containing [Web Clients](../../../../developers/core-concepts/web-client/overview/index.html) with [Glue42 Web](https://www.npmjs.com/package/@glue42/web) library version older than 2.7.0 will be able to use and participate in Global Layouts, but the Web Clients won't be able to pass context to be saved with the [`onSaveRequested()`](../../../../reference/core/latest/layouts/index.html#API-onSaveRequested) method, because this functionality isn't available in the older library versions.

[Workspaces Apps](../../workspaces/workspaces-app/index.html) using a [`@glue42/workspaces-ui-react`](https://www.npmjs.com/package/@glue42/workspaces-ui-react) library version older that 1.10.0 won't be able to participate in Global Layouts.

### Non-Glue42 Windows and Apps

Not all of your windows and apps will use one of the Glue42 libraries and be Glue42 enabled. In such a situation, [**Glue42 Core+**](https://glue42.com/core-plus/) has limited options - programmatically moving, resizing and getting the current position of such windows isn't possible. In this case, all windows and apps that aren't Glue42 enabled will be saved in a Global Layout, but they will be restored with their initial bounds, no matter how the user has moved or resized them after loading the Layout.

Non-Glue42 windows and apps participating in a [Workspace](../../workspaces/overview/index.html#workspaces_concepts-workspace) will be saved and restored just like any other Glue42 enabled window, because the [Workspaces App](../../workspaces/workspaces-app/index.html) controls the bounds of the components in which the windows are placed.

### Window State

Current browsers don't allow for programmatic getting or changing the state of the window (minimized, maximized, normal). As a result, all components in a saved Global Layout in [**Glue42 Core+**](https://glue42.com/core-plus/) will be set to window state `"normal"`. Windows that are manually maximized by the user will be saved and restored to fit the entire window, but won't be maximized. Windows that are minimized by the user will be saved and restored in a normal state.