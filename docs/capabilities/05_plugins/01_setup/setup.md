## Overview

When designing a multi app project, sometimes you may need to execute initial system logic - initialize data providers, register methods, or even modify the behavior of the [`@glue42/web-platform`](https://www.npmjs.com/package/@glue42/web-platform) library (see [Interception](../interception/index.html)). In a desktop app this is usually handled by auto starting hidden apps. In a web project, however, it isn't possible to create a hidden browser window to execute this logic. The solution to this problem is to use the Glue42 Plugins.

## Usage

A "Plugin" in the context of [**Glue42 Core**](https://glue42.com/core/) is a user-defined function that will be executed upon startup of the [Main app](../../../developers/core-concepts/web-platform/overview/index.html). You can also specify whether the initialization of the [`@glue42/web-platform`](https://www.npmjs.com/package/@glue42/web-platform) library must wait for the Plugin to be executed. The Plugin receives a fully initialized `glue` object as a first argument, which allows you to perform Glue42 operations before the Main app or any of the [Web Client](../../../developers/core-concepts/web-client/overview/index.html) apps has been initialized. As a second argument, the Plugin receives a user-defined configuration object, and as a third - a `platform` object that can be used for finer system control (see [Interception](../interception/index.html)).

Use the `plugins` property of the configuration object when initializing the Glue42 [`@glue42/web-platform`](https://www.npmjs.com/package/@glue42/web-platform) library in the [Main app](../../../developers/core-concepts/web-platform/overview/index.html) to define Plugins:

```javascript
import GlueWebPlatform from "@glue42/web-platform";

const myPlugin = async (glue, config) => {
    let meaning;

    if (config.glue === 42) {
        meaning = config.glue;
    } else {
        meaning = undefined;
    };

    await glue.interop.register("MyMethod", () => `Currently, the meaning of life is ${meaning}.`);
};

const config = {
    plugins: {
        // Plugin definitions.
        definitions: [
            {
                name: "my-plugin",
                config: { glue: 42 },
                start: myPlugin,
                critical: true
            }
        ]
    }
};

const { glue } = await GlueWebPlatform(config);
```

The Plugin definition object has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | **Required.** Name for the Plugin. |
| `start` | `(glue, config, platform) => Promise<void> \| void` | **Required.** Function that will receive as arguments a fully initialized `glue` object, the `config` object specified in the definition and a `platform` object (see [Interception](../interception/index.html)) that can be used for handling low-level system messages and logging. |
| `version` | `string` | Version of the Plugin. |
| `config` | `object` | Configuration that will be passed to the Plugin. |
| `critical` | `boolean` | If `true`, the [Web Platform](https://www.npmjs.com/package/@glue42/web-platform) library will wait for the Plugin to be executed before completing its initialization. |