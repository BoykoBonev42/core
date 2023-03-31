## Overview

All [Web Client](../../../developers/core-concepts/web-client/overview/index.html) apps (including the [Main app](../../../developers/core-concepts/web-platform/overview/index.html), which in a way is also a Web Client) use the Glue42 functionalities provided by the Glue42 APIs by sending messages to the [`@glue42/web-platform`](https://www.npmjs.com/package/@glue42/web-platform) library in the Main app. These control messages contain specific information about the requested Glue42 operations which the library processes, and executes the respective commands in the respective Glue42 API domains. Therefore, by using Plugins it's possible to intercept such an operation request on a lower level in order to decorate the default functionality, cancel it, or replace it with your custom functionality.

For a full example, see the [Interception Example](#interception_example) section and the source code of the Main app in the [Glue42 Core+ Seed Project](https://github.com/Glue42/core-plus-seed).

## Registering an Interception Request

To register an interception request, you must use the `interception` property of the `platform` object provided as a third argument to your Plugin implementation. The `platform` object has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `interception` | `object` | An object that can be used for registering interception requests. |
| `system` | `object` | An object that can be used for sending control messages to the different Glue42 domains in order to execute various Glue42 operations. See [Manipulating Default Operations](#manipulating_default_operations). |
| `logger` | `object` | A Glue42 Logger API that can be used for logging. |
| `platformApi` | `object` | An object that currently contains only version strings for the [**Glue42 Core**](https://glue42.com/core/) and [**Glue42 Core+**](https://glue42.com/core-plus/) platforms. |
| `control` | `(args: BaseControlMessage) => Promise<any>` | Deprecated. Use the `sendControl()` method of the `system` object instead. |

The `interception` object has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `register` | `(request: InterceptorRegistrationRequest) => Promise<void>` | Function for registering an interception request. |

The `register()` method accepts as an argument an object describing the interception request. This object has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `callInterceptor` | `(config: ControlMessage) => Promise<any>` | A function for handling the intercepted Glue42 operation. |
| `interceptions` | `object[]` | An array of objects each containing `domain` and `operation` properties that define for which Glue42 API domain and for which Glue42 operation the interception handler will be invoked. |

Registering an interception request in an already defined Plugin:

```javascript
// Handler for the intercepted Glue42 operation.
const myInterceptionHandler = async (controlMessage) => {
    // The default Glue42 operation will be prevented
    // and your implementation here will be executed instead.
    const message = `Received control message for domain: ${controlMessage.domain}, `
        + `operation: ${controlMessage.operation}, `
        + `by caller with ID: ${controlMessage.callerId}, `
        + `of type: ${controlMessage.callerType}`;

    console.log(message);
};

// Glue42 Plugin implementation.
const myPluginStartFunction = async (glue, config, platform) => {
    // Defining an interception request.
    const interceptionRequest = {
        callInterceptor: myInterceptionHandler
        // The handler will be executed every time a Web Client tries to raise a notification.
        interceptions: [
            { domain: "notifications", operation: "raiseNotification" }
        ]
    };

    // Registering an interception request.
    await platform.interception.register(interceptionRequest);
};
```

The control message object received as an argument by the interception handler has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `domain` | `string` | The Glue42 API domain in which the operation has been intercepted. See [Domains & Operations](../domains-operations/index.html). |
| `operation` | `string` | The Glue42 operation that has been intercepted. See [Domains & Operations](../domains-operations/index.html). |
| `data` | `object` | Data for the execution of the Glue42 command. |
| `settings` | `object` | Optional settings for executing a Glue42 operation. See [Manipulating Default Operations](#manipulating_default_operations). |
| `callerType` | `"plugin" \| "client" ` | Type of the caller - either a [Web Client](../../../developers/core-concepts/web-client/overview/index.html), or a Plugin implementation. |
| `callerId` | `string` | ID of the caller. Can be used for tracking purposes. |
| `commandId` | `string` | ID of the command. Can be used for tracking purposes. |

## Manipulating Default Operations

Intercepting a control message allows you to decorate the default behavior of the respective operation, replace the operation with your own implementation, or entirely prevent its execution.

To replace the default operation, provide your own implementation within the interception handler. To prevent the execution of the default operation, simply return from the handler.

In order to decorate the default operation, you must use the `system` property of the `platform` object to invoke the default operation behavior before or after your custom logic has been executed in the interception handler.

The `system` object has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `sendControl` | `(args: BaseControlMessage) => Promise<any>` | Function for sending control messages to the Glue42 API domains for executing specific Glue42 operations. |

The base control message that you must pass as an argument to the `sendControl()` method has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `domain` | `string` | **Required.** The Glue42 API domain in which the operation has been intercepted. See [Domains & Operations](../domains-operations/index.html). |
| `operation` | `string` | **Required.** The Glue42 operation that has been intercepted. See [Domains & Operations](../domains-operations/index.html). |
| `data` | `object` | Data for the execution of the Glue42 command. |
| `settings` | `object` | Optional settings for executing a Glue42 operation. |

When you invoke a Glue42 operation after you have decorated it, you must set the `skipInterception` property of the optional `settings` object to `true` in order to avoid an infinite loop of invoking and intercepting the same operation. If you decide to invoke a different Glue42 operation than the intercepted one, it isn't necessary to set the `skipInterception` flag, unless you have registered an interception handler for that operation too and want to skip it.

Decorating a default Glue42 operation:

```javascript
const myInterceptionHandler = async (controlMessage, platform) => {
    // This is the custom code that will be executed before the default Glue42 operation.
    const message = `Received control message for domain: ${controlMessage.domain}, `
        + `operation: ${controlMessage.operation}, `
        + `by caller with ID: ${controlMessage.callerId}, `
        + `of type: ${controlMessage.callerType}`;

    console.log(message);

    // Invoking the default Glue42 operation by passing the necessary data
    // and setting the `skipInterception` flag to `true` to avoid an infinite loop.
    await platform.system.sendControl({ ...controlMessage, settings: { skipInterception: true } });
};

const myPluginStartFunction = async (glue, config, platform) => {
    const interceptionRequest = {
        callInterceptor: (controlMessage) => myInterceptionHandler(controlMessage, platform),
        interceptions: [
            { domain: "notifications", operation: "raiseNotification" }
        ]
    };

    await platform.interception.register(interceptionRequest);
};
```

## Interception Example

The following example demonstrates how to intercept a request for [raising a notification](../../notifications/notifications-api/index.html#raising_notifications) in order to decorate the default functionality:

```javascript
import GlueWebPlatform from "@glue42/web-platform";

// Handler for the intercepted Glue42 operation.
const myInterceptionHandler = async (controlMessage, platform) => {
    // This is the custom code that will be executed before the default Glue42 operation.
    const message = `Received control message for domain: ${controlMessage.domain}, `
        + `operation: ${controlMessage.operation}, `
        + `by caller with ID: ${controlMessage.callerId}, `
        + `of type: ${controlMessage.callerType}`;

    console.log(message);

    // Invoking the default Glue42 operation by passing the necessary data
    // and setting the `skipInterception` flag to `true` to avoid an infinite loop.
    await platform.system.sendControl({ ...controlMessage, settings: { skipInterception: true } });
};

// Glue42 Plugin implementation.
const myPluginStartFunction = async (glue, config, platform) => {
    // Defining an interception request.
    const interceptionRequest = {
        // Pass the `platform` object as an argument to the interception handler.
        // The handler will be executed every time a Web Client tries to raise a notification.
        callInterceptor: (controlMessage) => myInterceptionHandler(controlMessage, platform),
        interceptions: [
            { domain: "notifications", operation: "raiseNotification" }
        ]
    };

    // Registering an interception request.
    await platform.interception.register(interceptionRequest);
};

// Plugin definition.
const myNotificationsPlugin = {
    name: "notifications-interceptor",
    start: myPluginStartFunction,
    version: "1.0.0",
    config: {},
    critical: true
};

// Configuration for the Web Platform library where all Plugins must be defined.
const config = {
    plugins: {
        definitions: [myNotificationsPlugin]
    }
};

const { glue } = await GlueWebPlatform(config);
```