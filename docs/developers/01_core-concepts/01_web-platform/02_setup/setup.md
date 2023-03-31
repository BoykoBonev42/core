## Overview

The purpose of the Main app is to handle complex and important operations, but its setup is extremely simple and easy.

## Initialization

Install the [`@glue42/web-platform`](https://www.npmjs.com/package/@glue42/web-platform) in your project:

```cmd
npm install @glue42/web-platform
```

Import the package in your Main app and initialize the Glue42 Web Platform library using the `GlueWebPlatform()` factory function:

```javascript
import GlueWebPlatform from "@glue42/web-platform";

// Use the `glue` property of the object returned
// by the factory function to access the Glue42 APIs.
const { glue } = await GlueWebPlatform();
```

The factory function will initialize and configure everything needed for a fully functioning [**Glue42 Core**](https://glue42.com/core/) project.

## Configuration

Optionally, specify configuration settings for other Glue42 libraries or [Plugins](../../../../capabilities/plugins/setup/index.html) initialized by the `GlueWebPlatform()` function:

```javascript
import GlueWebPlatform from "@glue42/web-platform";
import GlueWorkspaces from "@glue42/workspaces-api";

const config = {
    glue: {
        // Enabling the Workspaces API.
        libraries: [GlueWorkspaces]
    },
    workspaces: {
        // Specifying the location of the Workspaces App.
        src: "https://my-workspaces-app.com"
    }
};

const { glue } = await GlueWebPlatform(config);
```

Use this configuration object to set various important aspects of your [**Glue42 Core**](https://glue42.com/core/) project.

| Property | Description |
|----------|-------------|
| `windows` | Override various timeouts for the [Window Management](../../../../capabilities/windows/window-management/index.html) operations. |
| `applications` | Set a source for app definitions by passing an array of app definition objects to the `local` property of this object. |
| `layouts` | Set a source for Layout definitions by passing an array of Layout definition objects to the `local` property of this object. Set the mode of the Layouts library (`"idb"` or `"session"`) with the `mode` property. See the [Layouts](../../../../capabilities/windows/layouts/setup/index.html) section. |
| `channels` | Configure the Glue42 [Channels](../../../../capabilities/data-sharing-between-apps/channels/index.html) that will be available in your project. |
| `workspaces` | Set a location of your [Workspaces App](../../../../capabilities/windows/workspaces/workspaces-app/index.html#workspaces_concepts-frame) and other options for [Workspaces](../../../../capabilities/windows/workspaces/overview/index.html). |
| `plugins` | Provide your custom Glue42-specific logic, which will be included in the boot sequence of the Main app. See the [Plugins](../../../../capabilities/plugins/setup/index.html) section. |
| `connection` | Defines settings for connecting to a local [**Glue42 Enterprise**](https://glue42.com/enterprise/) instance. See the [Connecting to Glue42 Enterprise](../../../../capabilities/connectivity-to-enterprise/index.html) section. |
| `glue` | A [`Config`](../../../../reference/core/latest/glue42%20web/index.html#Config) object for the [Glue42 Web](https://www.npmjs.com/package/@glue42/web) library that will be used when registering the Main app as a Glue42 client in [**Glue42 Enterprise**](https://glue42.com/enterprise/). |
| `gluefactory` |The Glue42 [Web Platform](https://www.npmjs.com/package/@glue42/web-platform) library will always initialize the latest version of [Glue42 Web](https://www.npmjs.com/package/@glue42/web) internally, but you can override this by passing your own Glue42 factory function. This is especially helpful if you want your Main app to run with a specific [`@glue42/web`](https://www.npmjs.com/package/@glue42/web) package version and not the latest. |
| `gateway` | Override the logging levels and handlers of the Glue42 Gateway for advanced control and debugging. |
| `serviceWorker` | Provide the Service Worker registered by your Main app. A Service Worker is necessary only if you want to use [Notifications](../../../../capabilities/notifications/setup/index.html) with actions. |
| `clientOnly` | Set to `true` to initialize your Main app as a [Web Client](../../web-client/overview/index.html) app, skipping all [Web Platform](https://www.npmjs.com/package/@glue42/web-platform) related logic. Useful in certain cases during initialization when it isn't explicitly clear whether your app should be a Main app or a Web Client. In such cases it's possible to acquire Web Platform configuration or logic at runtime if your app should be a Main app. |
| `environment` | An object with custom data (excluding functions) that will be accessible through the `glue42core` object attached to the global `window` object of the Main app and all [Web Client](../../web-client/overview/index.html) apps connected to it. |

For detailed explanations and examples of each setting, see the corresponding entries in the [Capabilities](../../../../capabilities/application-management/index.html) and [Developers](../../../../developers/core-concepts/web-platform/overview/index.html) sections.