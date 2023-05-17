## Enabling Workspaces

Enabling Workspaces means providing a [Workspaces App](../workspaces-app/index.html) for your project, including the [Workspaces API](https://www.npmjs.com/package/@glue42/workspaces-api) library in your [Main app](../../../../developers/core-concepts/web-platform/overview/index.html) and [Web Client](../../../../developers/core-concepts/web-client/overview/index.html) apps and configuring the [Web Platform](https://www.npmjs.com/package/@glue42/web-platform) library in your Main app to support Workspaces.

## Main App

The [Main app](../../../../developers/core-concepts/web-platform/overview/index.html) is the place where you must specify the location of your Workspaces App and other settings for it ([Workspace hibernation](#main_app-hibernation), [app loading strategies](#main_app-loading_strategies), whether to [use the Main app as a Workspaces App](#main_app-using_the_main_app_as_a_workspaces_app) and more). Use the `workspaces` property of the configuration object when initializing the Glue42 [Web Platform](https://www.npmjs.com/package/@glue42/web-platform) library to do so:

```javascript
const config = {
    workspaces: {
        src: "https://my-workspaces-app.com"
    }
};
```

This points the Glue42 Web Platform where to look for the Workspaces App which handles all Workspaces logic. The `workspaces` key has the following properties of which only the `src` property is required:

| Property | Type | Description |
|----------|------|-------------|
| `src` | `string` | The location of the Workspaces App. |
| `hibernation` | `object` | Object with settings for [Workspace hibernation](#main_app-hibernation). Specify allowed number of active Workspaces and/or after what period of time to hibernate idle Workspaces. |
| `loadingStrategy` | `object` | Object with settings for [app loading strategies](#main_app-loading_strategies). Specify whether to load all apps at once, in batches at certain intervals or when the user activates them. |
| `isFrame` | `boolean` | Set to `true` if you are [using your Main app as a Workspaces App](#main_app-using_the_main_app_as_a_workspaces_app) as well. |
| `initAsEmpty` | `boolean` | If `true` and you are [using your Main app as a Workspaces App](#main_app-using_the_main_app_as_a_workspaces_app), the Main App will start as an [empty Frame](../workspaces-api/index.html#frame-empty_frame), which can be initialized programmatically at a later stage. |
| `frameCache` | `boolean` | This property is meant to be used only if you are [using your Main app as a Workspaces App](#main_app-using_the_main_app_as_a_workspaces_app). If `true`, will preserve the state of the Workspaces App on refresh. On restart, however, the app will be loaded in its initial state. |

The [Web Platform](../../../../developers/core-concepts/web-platform/overview/index.html) app is also a [Web Client](../../../../developers/core-concepts/web-client/overview/index.html), so you must provide the [Workspaces API](https://www.npmjs.com/package/@glue42/workspaces-api) library too:

```javascript
const config = {
    workspaces: {
        src: "https://my-workspaces-app.com"
    },
    glue: {
        libraries: [GlueWorkspaces]
    }
};
```

Finally, you must configure the `layouts` property to ensure that the Workspace Layouts will function properly:

```javascript
import GlueWebPlatform from "@glue42/web-platform";
import GlueWorkspaces from "@glue42/workspaces-api";

// Provide the location of your Workspaces App,
// the Workspaces API library and configure the Layouts library.
const config = {
    workspaces: {
        src: "https://my-workspaces-app.com"
    },
    glue: {
        libraries: [GlueWorkspaces]
    },
    layouts: {
        mode: "session",
        // Layout definition objects of type `"Workspace"`.
        local: [ {...}, {...}]
    }
};

// By default, the `GlueWebPlatform()` and `GlueWorkspaces()`
// factory functions are attached to the global `window` object.
const { glue } = await GlueWebPlatform(config);
```

The `mode` property of the `layouts` object accepts two values - `"session"` or `"idb"`. Use the `"idb"` setting if you want the Workspace Layouts to be persisted using the `IndexedDB` API of the browser. This option is useful for testing and PoC purposes, because it simulates persisting and manipulating Workspace Layouts on a server. The `"session"` setting means that the Workspace Layouts will be handled using the browser session storage. Once the browser session is over (e.g., the user closes the Main app window), all user-created Layouts will be lost. If the Main app is only refreshed, however, the Workspace Layouts will still be available.

The `local` property expects an array of [`Layout`](../../../../reference/core/latest/layouts/index.html#Layout) objects of type `"Workspace"`. On startup, these predefined Layouts will be imported and merged with the already existing Workspace Layouts and the Layouts with the same names will be replaced. This ensures that the user-created Layouts won't be removed when in `"idb"` mode.

The following example demonstrates a simple [`Layout`](../../../../reference/core/latest/layouts/index.html#Layout) object defining a Workspace Layout:

```javascript
const layout = {
    name: "My Workspace",
    type: "Workspace",
    components: [
        {
            type: "Workspace",
            state: {
                children: [
                    {
                        type: "row",
                        children: [
                            {
                                type: "group",
                                children: [
                                    {
                                        type: "window",
                                        config: {
                                            appName: "clientlist"
                                        }
                                    }
                                ],
                                config: {}
                            },
                            {
                                type: "group",
                                children: [
                                    {
                                        type: "window",
                                        config: {
                                            appName: "clientportfolio"
                                        }
                                    }
                                ],
                                config: {}
                            }
                        ],
                        config: {}
                    }
                ],
                config: {},
                context: {}
            }
        }
    ]
};
```

### Using the Main App as a Workspaces App

If you want to use your [Workspaces App](../workspaces-app/index.html) as a [Main app](../../../../developers/core-concepts/web-platform/overview/index.html) as well, you must set the `isFrame` property of the `workspaces` object to `true` when configuring the [Web Platform](https://www.npmjs.com/package/@glue42/web-platform) library:

```javascript
import GlueWebPlatform from "@glue42/web-platform";

const config = {
    workspaces: {
        src: "https://my-workspaces-app.com",
        isFrame: true,
        frameCache: true
    },
    glue: {...},
    layouts: {...}
};

const { glue } = await GlueWebPlatform(config);
```

Use the `frameCache` property to set the refresh behavior of the Main app when using it as a Workspaces App. If `true`, when the user refreshes the Main app, its current state will be preserved. If `false`, the Main app will be refreshed to its default state - e.g., an empty Workspace or a custom landing page for loading and creating Workspaces, depending on your specific implementation. The `frameCache` property doesn't affect restarting the Main app - if the user restarts the Main app, it will always load in its default state.

*Note that the `frameCache` property can be used only when the `isFrame` property is set to `true`.*

### Context

Use the `config` property of the Workspace Layout object to pass context to the Workspace:

```javascript
const layout = {
    name: "My Workspace",
    type: "Workspace",
    components: [
        {
            type: "Workspace",
            state: {
                children: [],
                config: {},
                context: { glue: 42 }
            }
        }
    ]
};
```

*For more details on how to use Workspace context programmatically, see the [Workspace Context](../javascript/index.html#workspace_context) section.*

### Tab Header

Hiding the Workspace tab header prevents the user from manipulating the Workspace through the UI and allows for the Workspace to be controlled entirely through API calls. For instance, a Workspace may be tied programmatically to certain logic designed to manage its state without any user interaction.

Use the `config` property of the Workspace Layout object to hide and show the Workspace tab header:

```javascript
const layout = {
    name: "My Workspace",
    type: "Workspace",
    components: [
        {
            type: "Workspace",
            state: {
                children: [],
                config: {
                    noTabHeader: true
                },
                context: {}
            }
        }
    ]
};
```

*For more details on how to pass configuration when creating and restoring Workspaces, see the [Workspace > Creating Workspaces](../workspaces-api/index.html#workspace-creating_workspaces) and [Workspace > Restoring Workspaces](../workspaces-api/index.html#workspace-restoring_workspaces) sections.*

### Pinning & Unpinning

[Pinned Workspaces](../workspaces-api/index.html#workspace-pinning__unpinning_workspaces) tabs are placed before the regular Workspace tabs and are represented only by their icon - they don't have a title, nor "Close" or "Save Workspace" buttons, so that they can't be closed and their initial Layout can't be overwritten by the end user.

Use the `config` property of the Workspace Layout object to pin or unpin a Workspace and provide an icon to be used when pinned:

```javascript
const layout = {
    name: "My Workspace",
    type: "Workspace",
    components: [
        {
            type: "Workspace",
            state: {
                children: [],
                config: {
                    icon: "base64-icon",
                    isPinned: true
                },
                context: {}
            }
        }
    ]
};
```

*For more details on pinning and unpinning Workspaces programmatically, see the [Workspace > Pinning & Unpinning Workspaces](../workspaces-api/index.html#workspace-pinning__unpinning_workspaces) section.*

### Lock Settings

#### Usage

Using the "Lock Settings" section of the menu available on each Workspace tab, you can manually suspend various Workspace functionalities or hide different Workspace buttons in order to prevent the Workspace from being modified. The following demonstrates how to hide the Workspace tab "Close" button and all "Eject" buttons of the Workspace windows:

![Locking UI](../../../../images/workspaces/lock-settings-ui.gif)

When one or more features of a Workspace have been locked, a "Lock" icon appears on the Workspace tab.

The following table describes all available Workspace lock settings:

| Setting | Description |
|---------|-------------|
| Lock All | Locks all Workspace functionalities preventing the user from modifying the Workspace or the windows participating in it.  |
| Disable Drop Bottom | Will prevent the user from dropping windows in the bottommost area of the Workspace. |
| Disable Drop Left | Will prevent the user from dropping windows in the leftmost area of the Workspace. |
| Disable Drop Right | Will prevent the user from dropping windows in the rightmost area of the Workspace. |
| Disable Drop Top | Will prevent the user from dropping windows in the topmost area of the Workspace. |
| Disable Extract | Will prevent the user from extracting and rearranging windows inside the Workspace. |
| Disable Splitters | Will prevent the splitters from being draggable, so the Workspace elements can't be resized. |
| Disable Window Reorder | Will prevent the user from reordering windows in the Workspace. |
| Disable Workspace Tab Reorder | Will prevent the user from reordering the Workspace tab in the Workspaces App. |
| Hide Add Window | Will hide all "Add Window" buttons (the "+" buttons) in the headers of window groups. |
| Hide Close | Will hide the "Close" button on the Workspace tab. |
| Hide Eject | Will hide all "Eject" buttons in the headers of window groups. |
| Hide Save | Will hide the "Save Workspace" button on the Workspace tab. |
| Hide Window Close | Will hide all "Close" buttons on the window tabs. |

#### Configuration

Use the `config` property of a Workspace Layout object to provide [lock settings](../workspaces-api/index.html#workspace-lock_settings) for the Workspace in order to prevent the user from modifying it. You can also specify lock settings for individual Workspace [Box Elements](../workspaces-api/index.html#workspace-finding_workspace_elements-box_elements) and Workspace windows by using the `config` property of the respective Box or Workspace window definition object.

The following example demonstrates how to disable dropping apps in the leftmost area of a Workspace, hide the Workspace tab "Close" button, and prevent the user from extracting Workspace windows from one of the Workspace [`Group`](../../../../reference/core/latest/workspaces/index.html#Group) elements:

```javascript
const layout = {
    name: "My Workspace",
    type: "Workspace",
    components: [
        {
            type: "Workspace",
            state: {
                children: [
                    {
                        type: "row",
                        children: [
                            {
                                type: "group",
                                children: [
                                    {
                                        type: "window",
                                        config: {
                                            appName: "clientlist"
                                        }
                                    }
                                ],
                                config: {
                                    allowExtract: false
                                }
                            },
                            {
                                type: "group",
                                children: [
                                    {
                                        type: "window",
                                        config: {
                                            appName: "clientportfolio"
                                        }
                                    }
                                ],
                                config: {}
                            }
                        ],
                        config: {}
                    }
                ],
                config: {
                    allowDropLeft: false,
                    showCloseButton: false
                },
                context: {}
            }
        }
    ]
};
```

*For more details on how to lock Workspaces programmatically and on all available lock settings for Workspaces and their elements, see the [Workspace > Lock Settings](../workspaces-api/index.html#workspace-lock_settings) section.*

### Including Apps in Workspaces

To control whether an app will be available in the Workspace "Add Application" menu (the dropdown that appears when you click the "+" button to add an app), use the `includeInWorkspaces` property of the `customProperties` top-level key in your [app definition](../../../application-management/index.html#app_definitions):

```javascript
import GlueWebPlatform from "@glue42/web-platform";

const config = {
    applications: {
        local: [
            {
                name: "my-app",
                title: "My App",
                type: "window",
                details: {
                    url: "https://my-domain.com/my-app"
                },
                customProperties: {
                    includeInWorkspaces: true
                }
            }
        ]
    },
    workspaces: {...},
    glue: {...},
    layouts: {...}
};

const { glue } = await GlueWebPlatform(config);
```

By default, the `includeInWorkspaces` property is set to `false`.

*For more details on app definitions, see the [App Management](../../../application-management/index.html#app_definitions) section.*

### Hibernation

Workspaces can be configured to use hibernation in order to free up system resources. Apps in hibernated Workspaces are closed and when the user activates the Workspace, they are loaded again in the same configuration. This allows for a more flexible system resource usage, as a single Workspace may contain many apps and the user may be working simultaneously with several Workspaces, not taking into account other apps that may already be heavily consuming system resources.

By default, hibernation is disabled. To enable and configure hibernating Workspaces, use the `hibernation` property of the `workspaces` key in the configuration object for the [Web Platform](https://www.npmjs.com/package/@glue42/web-platform) library. There are two rules available which you can set in order to define when a Workspace should be hibernated. The rules set limits in regard to the Workspace idle time and the maximum number of active Workspaces

The following example demonstrates how to allow only three active Workspaces at a time and how to hibernate all Workspaces that have been inactive for 1 minute:

```javascript
import GlueWebPlatform from "@glue42/web-platform";

const config = {
    workspaces: {
        src: "https://my-workspaces-app.com",
        hibernation: {
            maximumActiveWorkspaces: {
                threshold: 3
            },
            idleWorkspaces: {
                idleMSThreshold: 60000
            }
        }
    },
    glue: {...},
    layouts: {...}
};

const { glue } = await GlueWebPlatform(config);
```

The `hibernation` key has the following properties, all of which are optional:

| Property | Type | Description |
|----------|------|-------------|
| `maximumActiveWorkspaces` | `object` | Accepts an object with a `threshold` property which you can set to the number of allowed active Workspaces - e.g., if set to `3`, the last 3 used Workspaces will be active and all others will be hibernated. |
| `idleWorkspaces` | `object` | Accepts an object with an `idleMSThreshold` property which you can set to the number of milliseconds a Workspace can be idle before being hibernated. |

*For programmatic control of Workspace hibernation, see [Hibernation](../workspaces-api/index.html#workspace-hibernation) in the Workspaces API section.*

### Loading Strategies

Apps in Workspaces can be loaded using different strategies depending on whether everything should be loaded simultaneously from the very beginning, or the visible apps should be loaded first. If the visible apps are loaded first, you can specify whether the invisible ones (hidden behind another app as a tab) should load only when the user activates them, or should start loading in the background at set intervals.

The available loading strategies are `"direct"`, `"delayed"` and `"lazy"`. In `"direct"` mode, all apps are loaded on startup. In `"delayed"` mode, the visible apps are loaded first and then the invisible apps are loaded in batches at set intervals until all apps are eventually loaded. In `"lazy"` mode, the visible apps are loaded first and then invisible apps are loaded only on demand when the user activates them. This way some apps may never load if the user doesn't need them. Each strategy for loading apps in a Workspace has different advantages and disadvantages. It's important to take into consideration the actual user needs, as well as the available machine resources, before deciding on a specific strategy.

Advantages and disadvantages of the different loading strategies:

| Mode | Advantages | Disadvantages |
|------|------------|---------------|
| `"direct"` | The user gets everything up and running from the very beginning. | The CPU usage will spike when opening the Workspaces, because all apps start loading at the same time. May lead to poor user experience. High memory consumption - all apps are loaded and take up memory, even if they remain unused. |
| `"delayed"` | The loading time of visible apps is decreased due to reduced CPU load at startup, because invisible apps aren't loaded initially. | High memory consumption - delayed loading, but still all apps are loaded and take up memory, even if they remain unused. |
| `"lazy"` | The loading time of visible apps is decreased due to reduced CPU load on startup, because invisible apps aren't loaded initially. Some apps might not be loaded at all if the user doesn't need them. Eventually, this leads to reduced memory usage. | Apps which aren't loaded initially are loaded only when the user activates them. This may be inconvenient if loading the app takes too long. |

To configure the default loading strategy globally, use the `loadingStrategy` property of the `workspaces` key in the configuration object for the [Web Platform](https://www.npmjs.com/package/@glue42/web-platform) library. The following example demonstrates how to use `"delayed"` as a default strategy. The invisible apps will start loading in batches of 2 after an initial interval of 2 seconds and then every 3 seconds a new batch will start loading until all apps in the Workspace have been loaded:

```javascript
import GlueWebPlatform from "@glue42/web-platform";

const config = {
    workspaces: {
        src: "https://my-workspaces-app.com",
        loadingStrategy: {
            defaultStrategy: "delayed",
            delayed: {
                initialOffsetInterval: 2000,
                interval: 3000,
                batch: 2
            }
        }
    },
    glue: {...},
    layouts: {...}
};

const { glue } = await GlueWebPlatform(config);
```

The `loadingStrategy` key has the following properties, all of which are optional:

| Property | Type | Description |
|----------|------|-------------|
| `defaultStrategy` | `string` | Determines the default loading strategy. Can be `"direct"`, `"delayed"` or `"lazy"`. |
| `delayed` | `object` | Object with settings for the `"delayed"` strategy. |
| `showDelayedIndicator` | `boolean` | Whether to show a `Zzz` indicator on the tabs of the apps that haven't been loaded yet. Useful in development for testing purposes, but shouldn't be delivered to end users. |

The `delayed` object has the following properties, all of which are optional:

| Property | Type | Description |
|----------|------|-------------|
| `initialOffsetInterval` | `number` | Initial period in milliseconds after which to start loading apps in batches. Defaults to 1000. |
| `interval` | `number` | Interval in milliseconds at which to load the app batches. Defaults to 5000. |
| `batch` | `number` | Number of apps in a batch to be loaded at each interval. Defaults to 1. |

*For programmatic control of Workspace loading strategies, see [Loading Strategies](../workspaces-api/index.html#workspace-loading_strategies) in the Workspaces API section.*

### Using Glue42 APIs in the Frame

The [Workspaces App](../overview/index.html#workspaces_concepts-frame) is a fully-featured Glue42 client, so you can use all Glue42 APIs in it.

#### Getting the Frame Object

The [`getMyFrame()`](../../../../reference/core/latest/workspaces/index.html#API-getMyFrame) and [`glue.windows.my()`](../../../../reference/core/latest/windows/index.html#API-my) methods by design don't work when used in a Frame. To get the [`Frame`](../../../../reference/core/latest/workspaces/index.html#Frame) object, you must first use the `getFrameId()` function provided by the [`@glue42/workspaces-ui-react`](https://www.npmjs.com/package/@glue42/workspaces-ui-react) library which will return the ID of the current Frame. After that, to ensure that the window has been loaded as a Frame, you must use the Workspaces API [`waitForFrame()`](../../../../reference/core/latest/workspaces/index.html#API-waitForFrame) method.

The following example demonstrates how to correctly get the [`Frame`](../../../../reference/core/latest/workspaces/index.html#Frame) object:

```javascript
import React from "react";
import Workspaces, { getFrameId } from "@glue42/workspaces-ui-react";
import { useGlue } from "@glue42/react-hooks";

const App = () => {
	useGlue(async (glue) => {
        // Getting the ID of the current Frame.
        const frameID = getFrameId();
        // Waiting for the Frame to be loaded.
		const myFrame = await glue.workspaces.waitForFrame(frameID);

        // The Frame is now initialized and part of the API.
	}, []);

	return (
		<Workspaces />
	);
}

export default App;
```

It's recommended that all Glue42 and app logic be executed after the Frame has been loaded in order to avoid unexpected behaviors and memory leaks.

## Web Client Apps

To enable the [Workspaces API](../../../../reference/core/latest/workspaces/index.html) in your [Web Client](../../../../developers/core-concepts/web-client/overview/index.html) apps, install the [`@glue42/web`](https://www.npmjs.com/package/@glue42/web) and [`@glue42/workspaces-api`](https://www.npmjs.com/package/@glue42/workspaces-api) packages and initialize the [Glue42 Web](../../../../reference/core/latest/glue42%20web/index.html) library by passing the `GlueWorkspaces()` factory function in the configuration object. When `GlueWeb()` resolves, the Workspaces API will be accessible through the `workspaces` property of the returned object - e.g., `glue.workspaces`. See below examples of how to enable the Workspaces API in JavaScript, React and Angular apps.

### JavaScript

Install the necessary packages:

```cmd
npm install @glue42/web @glue42/workspaces-api
```

Initialize the Glue42 Web library enabling the Workspaces API:

```javascript
import GlueWeb from "@glue42/web";
import GlueWorkspaces from "@glue42/workspaces-api";

const config = {
    libraries: [GlueWorkspaces]
};

const glue = await GlueWeb(config);

// Now you can access the Workspaces API through `glue.workspaces`.
```

By default, the `GlueWeb()` and `GlueWorkspaces()` factory functions are attached to the global `window` object.

### React

Install the necessary packages:

```cmd
npm install @glue42/react-hooks @glue42/workspaces-api
```

Initialize Glue42 either by:

- using the `<GlueProvider />` component:

```javascript
import GlueWeb from "@glue42/web";
import GlueWorkspaces from "@glue42/workspaces-api";
import { GlueProvider } from "@glue42/react-hooks";

const settings = {
    web: {
        factory: GlueWeb,
        config: {
            libraries: [GlueWorkspaces]
        }
    }
};

ReactDOM.render(
    <GlueProvider fallback={<h2>Loading...</h2>} settings={settings}>
        <App />
    </GlueProvider>,
    document.getElementById("root")
);
```

-  or using the `useGlueInit()` hook:

```javascript
import GlueWeb from "@glue42/web";
import GlueWorkspaces from "@glue42/workspaces-api";
import { useGlueInit } from "@glue42/react-hooks";

const App = () => {
    const settings = {
        web: {
            factory: GlueWeb,
            config: {
                libraries: [GlueWorkspaces]
            }
        }
    };
    const glue = useGlueInit(settings);

    return glue ? <Main glue={glue} /> : <Loader />;
};

export default App;
```

### Angular

Install the necessary packages:

```cmd
npm install @glue42/ng @glue42/workspaces-api
```

Pass the `GlueWorkspaces()` factory function to `GlueWeb()` using the `config` object:

```javascript
import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";
import { Glue42Ng } from "@glue42/ng";
import GlueWeb from "@glue42/web";
import GlueWorkspaces from "@glue42/workspaces-api";

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        Glue42Ng.forRoot({ web: { factory: GlueWeb, config: { libraries: [GlueWorkspaces] } } })
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
```