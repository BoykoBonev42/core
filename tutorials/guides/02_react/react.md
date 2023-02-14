## Overview

This tutorial is designed to walk you through every aspect of [**Glue42 Core**](https://glue42.com/core/) - setting up a project, initializing a [Main app](../../developers/core-concepts/web-platform/overview/index.html), multiple [Web Client](../../developers/core-concepts/web-client/overview/index.html) apps and extending your apps with [Shared Contexts](../../capabilities/data-sharing-between-apps/shared-contexts/index.html), [Interop](../../capabilities/data-sharing-between-apps/interop/index.html), [Window Management](../../capabilities/windows/window-management/index.html), [Channels](../../capabilities/data-sharing-between-apps/channels/index.html), [App Management](../../capabilities/application-management/index.html), [Workspaces](../../capabilities/windows/workspaces/overview/index.html) and more Glue42 [capabilities](../../capabilities/application-management/index.html).

This guide uses React and its goal is to allow you to put the basic concepts of [**Glue42 Core**](https://glue42.com/core/) to practice in a React app using the [`@glue42/react-hooks`](https://www.npmjs.com/package/@glue42/react-hooks) library. It is strongly recommended to go through the [JavaScript](../javascript/index.html) tutorial first in order to get a better understanding of [**Glue42 Core**](https://glue42.com/core/) without the added complexity of a web framework.

## Introduction

You are a part of the IT department of a big multi-national bank and you have been tasked to lead the creation of a project which will be used by the Asset Management department of the bank. The project will consist of three apps bootstrapped with [Create React App](https://github.com/facebook/create-react-app):

- **Clients** - displays a full list of clients and details about them;
- **Stocks** - displays a full list of stocks with prices. When the user clicks on a stock, details about the selected stock should be displayed;
- **Stock Details** - displays details for a selected stock after the user clicks on a stock in the **Stocks** app;

All apps are being developed by different teams within the organizations and therefore are being hosted at different origins.

As an end result, the users want to be able to run the apps as Progressive Web Apps in separate windows in order to take advantage of their multi-monitor setups. Also, they want the apps, even though in separate windows, to be able to communicate with each other. For example, when a client is selected in the **Clients** app, the **Stocks** app should display only the stocks of the selected client.

## Prerequisites

This tutorial assumes that you are familiar with the [React Framework](https://reactjs.org), [React Hooks](https://reactjs.org/docs/hooks-intro.html), [Create React App](https://reactjs.org/docs/create-a-new-react-app.html) and the concepts of JavaScript and asynchronous programming.

It is also recommended to have the [Web Platform](../../developers/core-concepts/web-platform/overview/index.html), [Web Client](../../developers/core-concepts/web-client/overview/index.html) and [Glue42 Web](../../reference/core/latest/glue42%20web/index.html) documentation available for reference.

Each main chapter demonstrates a different Glue42 capability whose documentation you can find in the [Capabilities](../../capabilities/application-management/index.html) section of the documentation.

## Tutorial Structure

The tutorial code is located in the [**Glue42 Core**](https://glue42.com/core/) [GitHub repo](https://github.com/Glue42/core). There you will find a `/tutorials` directory with the following structure:

```cmd
/tutorials
    /angular
        /solution
        /start
    /guides
        /01_javascript
        /02_react
        /03_angular
    /javascript
        /solution
        /start
    /react
        /solution
        /start
    /rest-server
```

| Directory | Description |
|-----------|-------------|
| `/guides` | Contains the text files of the tutorials. |
| `/javascript`, `/react` and `/angular` | Contain the starting files for the tutorials and also a full solution for each of them. |
| `/rest-server` | A simple server used in the tutorials to serve the necessary JSON data. |

[**Glue42 Core**](https://glue42.com/core/) is an open-source project, so all feedback and contributions, both to the code base and the tutorials, are welcome.

## 1. Initial Setup

Clone the [**Glue42 Core**](https://glue42.com/core/) [GitHub repo](https://github.com/Glue42/core) to get the tutorial files.

### 1.1. Start Files

Next, go to the `/tutorials/react/start` directory which contains the starting files for the project. The tutorial examples assume that you will be working in the `/start` directory, but you can also move the files and work from another directory.

The `/start` directory contains the following:

| Directory | Description |
|-----------|-------------|
| `/clients` | This is the **Clients** app bootstrapped with CRA. |
| `/stocks` | This is the **Stocks**  bootstrapped with CRA. |
| `/stock-details` | This is the **Stock Details** app  bootstrapped with CRA. |
| `/portfolio-downloader` | This is the **Portfolio Downloader** app  bootstrapped with CRA, which will be used in the [Intents](#10_intents) chapter.  |
| `/workspace` | This is a **Workspaces App**, which will be used in the [Workspaces](#9_workspaces) chapter. |


The **Clients**, **Stocks**, **Stock Details** and **Portfolio Downloader** apps contain the following resources:

| Directory | Description |
|-----------|-------------|
| `/public` | Contains all static assets for each app necessary for the app to be a standalone PWA: an `index.html` file, a `manifest.json` file, a `sw.js` (Service Worker) and icons. |
| `/src` | Contains the main entry point for each app - the `index.js` file, all React components for each app, a `glue.js` file (methods for interaction with the Glue42 framework), CSS files and a `serviceWorker.js` file which registers the Service Worker for the app. |
| `.env` | Environment variables for CRA. |

The **Clients** app also contains a `/plugins` directory with Glue42 [Plugins](../../capabilities/plugins/index.html) that will be used in the [Plugins](#8_plugins) chapter.

Go to the directory of each app (including the Workspaces App), open a command prompt and run:

```cmd
npm install
npm start
```

This will install the necessary dependencies and launch the apps on different ports:

| URL | App |
|-----|-----|
| `http://localhost:3000/` | **Clients** |
| `http://localhost:3001/` | **Stocks** |
| `http://localhost:3002/` | **Stock Details** |
| `http://localhost:9300/` | **Workspaces App** |
| `http://localhost:9400/` | **Portfolio Downloader** |

### 1.2. Solution Files

Before you continue, take a look at the solution files. You are free to use the solution as you like - you can check after each section to see how it solves the problem, or you can use it as a reference point in case you get stuck.

Go to the `/rest-server` directory and start the REST Server (as described in the [REST Server](#1_initial_setup-13_rest_server) chapter).

Go to the `/react/solution/clients`, `/react/solution/client-details`, `/react/solution/stocks`, `/react/solution/stock-details` and `/react/solution/workspace` directories and run the following command to install the necessary dependencies:

```cmd
npm install
```

Go to the `/react/solution` directory, open a command prompt and run the following commands to install the necessary dependencies and start all apps:

```cmd
npm install
npm run start
```

You can now access the entry point of the project (the **Clients** app) at `localhost:3000/clients`.

### 1.3. REST Server

Before starting with the project, go to the `/rest-server` directory and start the REST server that will host the necessary data for the apps:

```cmd
npm install
npm start
```

This will launch the server at port 8080.

### 1.4. React Project Setup

This tutorial starts with three initial apps. As the user requirements change, however, your [**Glue42 Core**](https://glue42.com/core/) project will expand with more apps. Here you will learn how to create a new React app and set it up correctly in order to enable it to work with [**Glue42 Core**](https://glue42.com/core/). When you have to create and set up new apps later on in the tutorial, you can refer back to this chapter and follow the steps below to ensure that your app has been configured properly:

1. Go to the directory where you want your new app to be created, open a command prompt and run the following command replacing `my-app` with the name of your app:

```cmd
npx create-react-app my-app
```

2. Install the following dependencies in the root directory of your app:

```cmd
npm install --save @glue42/react-hooks bootstrap@4.4.1
```

3. Edit the `package.json` file of your app:

- add a `homepage` property replacing `my-app` with the name of your app:

```json
"homepage": "/my-app/"
```

4. Create a `.env` file in the root directory of your app with the following settings:

```cmd
SKIP_PREFLIGHT_CHECK=true
PORT=3003
```

*Note that the `PORT` value must be different for each app in the project. The three initial apps already occupy ports 3000, 3001 and 3002.*

5. Start your app by running the following command from its root directory:

```cmd
npm start
```

6. Create or edit the code for the new app by following the specific instructions in the respective chapters.

## 2. Project Setup

### 2.1. Main App

Every [**Glue42 Core**](https://glue42.com/core/) project must have a single central app called [Main app](../../developers/core-concepts/web-platform/overview/index.html) or Web Platform app. In a real-life scenario this would be an app used for discovering and listing available apps, Workspaces, handling notifications and much more. However, your goal now is to learn about all these aspects with as little complexity as possible. That's why the **Clients** app will serve as your Main app. The users will open the **Clients** app and from there they will be able to click on a client and see their stocks and so on.

Setting up a Main app is as simple as calling a function. First, install and reference the [@glue42/web-platform](https://www.npmjs.com/package/@glue42/web-platform) script in the **Clients** app and then initialize the library. The Web Platform library handles the entire Glue42 environment, which is necessary for the [Web Client](../../developers/core-concepts/web-client/overview/index.html) apps to be able to connect to the Main app and to each other.

Go to the **Clients** app and install the [@glue42/react-hooks](https://www.npmjs.com/package/@glue42/react-hooks) library:

```cmd
npm install --save @glue42/react-hooks
```

Next, install the [@glue42/web-platform](https://www.npmjs.com/package/@glue42/web-platform) library:

```cmd
npm install --save @glue42/web-platform
```

Go to the `index.js` file of the **Clients** app, import the `GlueWebPlatform()` factory function with the following configuration:

```javascript
import { GlueProvider } from "@glue42/react-hooks";
import GlueWebPlatform from "@glue42/web-platform";

const settings  = {
    webPlatform: {
        factory: GlueWebPlatform
    }
};

ReactDOM.render(
    <GlueProvider settings={settings}>
        <Clients />
    </GlueProvider>,
    document.getElementById("root")
);
```

To use the Glue42 APIs in the `<Clients />` component, import the `GlueContext` object and the `useGlue()` hook from the Glue42 React Hooks library. Pass the `GlueContext` to the `useContext()` React hook and use the returned object to access the Glue42 APIs:

```javascript
import { useContext } from "react";
import { GlueContext, useGlue } from "@glue42/react-hooks";

function Clients() {
    const glue = useContext(GlueContext);
};
```

To allow the component to show whether Glue42 is available, uncomment the commented out `<div>` element in the `return` statement:

```javascript
return (
    <div className="container-fluid">
        <div className="row">
            <div className="col-md-2">
                {!glue && (
                <span id="glueSpan" className="badge badge-warning">
                    Glue42 is unavailable
                </span>
                )}
                {glue && (
                <span id="glueSpan" className="badge badge-success">
                    Glue42 is available
                </span>
                )}
            </div>
            ...
        </div>
        ...
    </div>
);
```

You will see a small green label at the top left corner of the **Clients** app with the text "Glue42 is available".

The **Clients** app is now setup as the [Main app](../../developers/core-concepts/web-platform/overview/index.html) of your [**Glue42 Core**](https://glue42.com/core/) project.

Next, initialize the rest of the apps to connect them to Glue42 as [Web Clients](../../developers/core-concepts/web-client/overview/index.html).

### 2.2. Web Clients

Now that you have a fully functional [Main app](../../developers/core-concepts/web-platform/overview/index.html), you must [initialize](../../developers/core-concepts/web-client/react/index.html) the [Glue42 Web](../../reference/core/latest/glue42%20web/index.html) library in the rest of the apps. This will allow them to connect to the **Clients** app and communicate with each other.

Go to the **Stocks** and **Stock Details** apps and install the [@glue42/react-hooks](https://www.npmjs.com/package/@glue42/react-hooks) library:

```cmd
npm install --save @glue42/react-hooks
```

Go to the `index.js` files of the **Stocks** and **Stock Details** apps and add the following to make the [Glue42 Web](../../reference/core/latest/glue42%20web/index.html) library available in the `<Stocks />` and `<StockDetails />` components respectively:

```javascript
// In `index.js` of the Stocks app.

import GlueWeb from "@glue42/web";
import { GlueProvider } from "@glue42/react-hooks";

const settings = {
    web: {
        factory: GlueWeb
    }
};

// Replace `Stocks` with the `StockDetails` component for the Stock Details app.
ReactDOM.render(
    <GlueProvider settings={settings}>
        <Stocks />
    </GlueProvider>,
    document.getElementById("root")
);
```

To use the Glue42 APIs in the `<Stocks />` and `<StockDetails />` components, import the `GlueContext` object and the `useGlue()` hook from the Glue42 React Hooks library. Pass the `GlueContext` to the `useContext()` React hook and use the returned object to access the Glue42 APIs:

```javascript
// In `Stocks.jsx` of the Stocks app.

import { useContext } from "react";
import { GlueContext, useGlue } from "@glue42/react-hooks";

function Stocks() {
    const glue = useContext(GlueContext);
};
```

To allow the components to show whether Glue42 is available, uncomment the commented out `<div>` element in their `return` statements:

```javascript
return (
    <div className="container-fluid">
        <div className="row">
            <div className="col-md-2">
                {!glue && (
                <span id="glueSpan" className="badge badge-warning">
                    Glue42 is unavailable
                </span>
                )}
                {glue && (
                <span id="glueSpan" className="badge badge-success">
                    Glue42 is available
                </span>
                )}
            </div>
            ...
        </div>
        ...
    </div>
);
```

*Note that the **Stocks** and **Stock Details** apps won't render correctly. This is because they can't currently connect to the Glue42 environment provided by the [Main app](../../developers/core-concepts/web-platform/overview/index.html) and therefore can't discover the Main app or each other. To be able to initialize the [Glue42 Web](../../reference/core/latest/glue42%20web/index.html) library, all [Web Client](../../developers/core-concepts/web-client/overview/index.html) apps must be started through the [Main app](../../developers/core-concepts/web-platform/overview/index.html) or by another [Web Client](../../developers/core-concepts/web-client/overview/index.html) app already connected to the Glue42 environment. Currently, the only way to open these apps is through the URL in the address bar of the browser. The next chapter will teach you how to open the **Stocks** app from the **Clients** app which will solve this problem.*

## 3. Window Management

The goal of this chapter is to stat building the user flow of the entire project. The end users will open the **Clients** app and will be able to open the **Stocks** app from the "Stocks" button in it. Clicking on a stock in the **Stocks** app will open the **Stock Details** app.

Currently, the only way for the user to open the **Stocks** app is to manually enter its URL in the address bar. This, however, prevents the app from connecting to the Glue42 environment. Also, the users want the **Stock Details** app to open in a new window with specific dimensions and position. To achieve all this, you will use the [Window Management API](../../reference/core/latest/windows/index.html).

*See also the [Capabilities > Windows > Window Management](../../capabilities/windows/window-management/index.html) documentation.*

### 3.1. Opening Windows at Runtime

Instruct the **Clients** app to open the **Stocks** app in a new window when the user clicks on the "Stocks" button. Go to the `glue.js` file of the **Clients** app and define a function that will open the **Stocks** app in a new window. Use the [`open()`](../../reference/core/latest/windows/index.html#API-open) method to open the **Stocks** app in a new window. The `windowID` variable ensures that the name of each new **Stocks** instance will be unique:

```javascript
let windowID = 0;

export const openStocks = (glue) => () => {
    // The `name` and `url` parameters are required. The window name must be unique.
    const name = `Stocks-${++windowID}`;
    const URL = "http://localhost:3001/";

    glue.windows.open(name, URL).catch(console.error);
};
```

Import this function in the `<Clients />` component, pass it to the `useGlue()` hook and set it as the `onClick` handler of the "Stocks" button in the `return` statement:

```javascript
import { openStocks } from "./glue";

function Clients() {
    ...
    const onClickStocks = useGlue(openStocks);
    ...
    return (
        <div className="container-fluid">
            <div className="row">
                ...
                <div className="col-md-8">
                    <h1 className="text-center">Clients</h1>
                </div>
                <div className="col-md-2 py-2">
                    <button className="btn btn-primary" onClick={onClickStocks}>Stocks</button>
                </div>
            </div>
            ...
        </div>
    );
};
```

Clicking on the "Stocks" button will now open the **Stocks** app.

To complete the user flow, instruct the **Stocks** app to open a new window each time a the user clicks on a stock. Remember that each Glue42 Window must have a unique name. To avoid errors resulting from attempting to open Glue42 Windows with conflicting names, check whether the clicked stock has already been opened in a new window.

Go to the `glue.js` file of the **Stocks** app and define a callback that will open the **Stock Details** app in a new window. Use the [`list()`](../../reference/core/latest/windows/index.html#API-list) method to get a collection of all Glue42 Windows and check whether the clicked stock is already open in a window. It's safe to search by `name`, because all Glue42 Window instances must have a unique `name` property:

```javascript
export const openStockDetails = (glue) => (stock) => {
    const name = `StockDetails-${stock.RIC}`;
    const URL = "http://localhost:3002/";

    // Check whether the clicked stock has already been opened in a new window.
    const stockWindowExists = glue.windows.list().find(w => w.name === name);

    if (!stockWindowExists) {
        glue.windows.open(name, URL).catch(console.error);
    };
};
```

Import this callback in the `<Stocks />` component, pass it to the `useGlue()` hook and set it as the `onClick` handler of each table row element in the `return` statement:

```javascript
import { openStockDetails } from "./glue";

function Stocks() {
    ...
    const showStockDetails = useGlue(openStockDetails);
    ...
    return (
        ...
        {portfolio.map(({ RIC, Description, Bid, Ask, ...rest }) => (
            <tr
                key={RIC}
                onClick={() => showStockDetails({ RIC, Description, Bid, Ask, ...rest })}
            >
                <td>{RIC}</td>
                <td>{Description}</td>
                <td className="text-right">{Bid}</td>
                <td className="text-right">{Ask}</td>
            </tr>
        ))}
        ...
    );
};
```

*Note that you must allow popups in the browser and/or remove any popup blockers to allow the **Stock Details** window to open.*

### 3.2. Window Settings

To position the new **Stock Details** window, extend the logic in the [`open()`](../../reference/core/latest/windows/index.html#API-open) method by passing an optional [`Settings`](../../reference/core/latest/windows/index.html#Settings) object containing specific values for the window size (`width` and `height`) and position (`top` and `left`):

```javascript
export const openStockDetails = (glue) => (stock) => {
    const name = `StockDetails-${stock.RIC}`;
    const URL = "http://localhost:3002/";
    // Optional configuration object for the newly opened window.
    const config = {
        left: 100,
        top: 100,
        width: 550,
        height: 550
    };

    const stockWindowExists = glue.windows.list().find(w => w.name === name);

    if (!stockWindowExists) {
        glue.windows.open(name, URL, config).catch(console.error);
    };
};
```

### 3.3. Window Context

To allow the **Stock Details** app to display information about the selected stock, set the stock selected in the **Stocks** app as a context to the newly opened **Stock Details** window. The **Stock Details** window will then access its context and extract the necessary stock information.

```javascript
export const openStockDetails = (glue) => (stock) => {
    const name = `StockDetails-${stock.RIC}`;
    const URL = "http://localhost:3002/";
    const config = {
        left: 100,
        top: 100,
        width: 550,
        height: 550,
        // Set the `stock` object as a context for the new window.
        context: { stock }
    };

    const stockWindowExists = glue.windows.list().find(w => w.name === name);

    if (!stockWindowExists) {
        glue.windows.open(name, URL, config).catch(console.error);
    };
};
```

Next, go to the `glue.js` file of the **Stock Details** app and define a function that will get the window context. Get a reference to the current window using the [`my()`](../../reference/core/latest/windows/index.html#API-my) method and get its context with the [`getContext()`](../../reference/core/latest/windows/index.html#WebWindow-getContext) method of the Glue42 Window object:

```javascript
export const getMyWindowContext = (setWindowContext) => async (glue) => {
    const myWindow = glue.windows.my();
    const context = await myWindow.getContext();

    setWindowContext(context);
};
```

Go to the `<StockDetails />` component, define a state variable that will hold the window context and pass the `getMyWindowContext()` function to the `useGlue()` hook:

```javascript
import { useState } from "react";
import { getMyWindowContext } from "./glue";

function StockDetails() {
    const [windowContext, setWindowContext] = useState({});

    // Get the window context.
    useGlue(getMyWindowContext(setWindowContext));

    // Extract the selected stock from the window context.
    const {
        stock: { RIC, BPOD, Bloomberg, Description, Exchange, Venues, Bid, Ask } = {}
    } = windowContext || {};
};
```

Now, when you click on a stock in the **Stocks** app, the **Stock Details** app will open in a new window displaying information about the selected stock.

## 4. Interop

Now, you will use the [Interop API](../../reference/core/latest/interop/index.html) to pass the portfolio of the selected client to the **Stocks** app and show only the stocks present in their portfolio.

*See also the [Capabilities > Data Sharing Between Apps > Interop](../../capabilities/data-sharing-between-apps/interop/index.html) documentation.*

### 4.1. Registering Interop Methods and Creating Streams

When a user clicks on a client, the **Stocks** app should show only the stocks owned by this client. You can achieve this by registering an Interop method in the **Stocks** app which, when invoked, will receive the portfolio of the selected client and re-render the stocks table. Also, the **Stocks** app will create an Interop stream to which it will push the new stock prices. Subscribers to the stream will get notified when new prices have been generated.

Go to the `glue.js` file of the **Stocks** app and define a callback for registering an Interop method. Use the [`register()`](../../reference/core/latest/interop/index.html#API-register) method to register an Interop method. Pass a method name and a callback for handling method invocations to `register()`:

```javascript
import { SET_CLIENT_METHOD } from "./constants";

export const registerSetClientMethod = (setClient) => (glue) => {
    // Register an Interop method by providing a name and a handler.
    glue.interop.register(SET_CLIENT_METHOD, setClient);
};
```

Import the callback in the `<Stocks />` component, define a state variable that will hold the selected client, and pass the callback to the `useGlue()` hook:

```javascript
import { registerSetClientMethod } from "./glue";

function Stocks() {
    ...
    const [{ clientId, clientName }, setClient] = useState({});
    useGlue(registerSetClientMethod(setClient));
    ...
};
```

Modify the `fetchPortfolio()` function in the existing `useEffect()` hook to fetch the selected client portfolio. Pass `clientId` as a `useEffect()` dependency, so that `fetchPortfolio()` will be called whenever a new client is selected and the component is re-rendered:

```javascript
useEffect(() => {
    const fetchPortfolio = async () => {
        try {
            const url = `http://localhost:8080${clientId ? `/api/portfolio/${clientId}` : "/api/portfolio"}`;
            const response = await fetch(url, REQUEST_OPTIONS);
            const portfolio = await response.json();
            setPortfolio(portfolio);
        } catch (error) {
            console.error(error);
        };
    };
    fetchPortfolio();
}, [clientId]);
```

Finally, add an element to show the client name and ID above the stocks table in the `return` statement of the `<Stocks />` component.

```javascript
return (
    ...
        {clientId && (
            <h2 className="p-3">
                Client {clientName} - {clientId}
            </h2>
        )}
    ...
);
```

Streams can be described as special Interop methods. Go to the `glue.js` file of the **Stocks** app and define a callback for creating an Interop stream. Use the [`createStream()`](../../reference/core/latest/interop/index.html#API-createStream) method to create an Interop stream. Pass a name for the stream to `createStream()`. Call the predefined `publishInstrumentPrice()` callback and pass the created stream to it:

```javascript
import { SET_PRICES_STREAM } from "./constants";

export const createInstrumentStream = async (glue) => {
    const stream = await glue.interop.createStream(SET_PRICES_STREAM);
    publishInstrumentPrice(stream);
};
```

Push the generated prices to the stream in the `publishInstrumentPrice()` callback:

```javascript
export const publishInstrumentPrice = (stream) => {
    setInterval(() => {
        const stocks = {
            ...
        };

        // Push the stock prices to the stream.
        stream.push(stocks);
    }, 1500);
};
```

Import the `createInstrumentStream()` callback in the `<Stocks />` component and pass it to the `useGlue()` hook:

```javascript
import { createInstrumentStream } from "./glue";

function Stocks() {
    ...
    useGlue(createInstrumentStream);
    ...
};
```

Next, you will find and invoke the registered method from the **Clients** app.

### 4.2. Method Discovery

Go to the `glue.js` file of the **Clients** app and define a callback for discovering and invoking the Interop method. Use the [`methods()`](../../reference/core/latest/interop/index.html#API-methods) method to check for a registered Interop method with the specified name:

```javascript
import { SET_CLIENT_METHOD } from "./constants";

export const setClientPortfolioInterop = (glue) => ({ clientId, clientName }) => {
    // Check whether the method exists.
    const isMethodRegistered = glue.interop
        .methods()
        .some(({ name }) => name === SET_CLIENT_METHOD.name);
};
```

### 4.3. Method Invocation

Next, invoke the Interop method if it has been registered.

Use the [`invoke()`](../../reference/core/latest/interop/index.html#API-invoke) method and pass the name of the Interop method as a first argument and an object containing the client ID and the client name as a second:

```javascript
import { SET_CLIENT_METHOD } from "./constants";

export const setClientPortfolioInterop = (glue) => ({ clientId, clientName }) => {
    // Check whether the method exists.
    const isMethodRegistered = glue.interop
        .methods()
        .some(({ name }) => name === SET_CLIENT_METHOD.name);
    if (isMethodRegistered) {
        // Invoke an Interop method by name and provide arguments for the invocation.
        glue.interop.invoke(SET_CLIENT_METHOD.name, { clientId, clientName });
    };
};
```

Import the callback in the `<Clients />` component and pass it to the `useGlue()` hook to define a handler function for the `onClick` property of each table row in the **Clients** app:

```javascript
import { setClientPortfolioInterop } from "./glue";

function Clients() {
    ...
    const onClickClients = useGlue(setClientPortfolioInterop);
    ...
};
```

In the `return` statement, attach the `onClick` handler to each client row:

```javascript
return (
    ...
        <tbody>
            {clients.map(({ name, pId, gId, accountManager, portfolio, ...rest }) => (
                <tr
                    key={pId}
                    onClick={() => {
                        onClickClients({ clientId: gId, clientName: name });
                    }}
                >
                    <td>{name}</td>
                    <td>{pId}</td>
                    <td>{gId}</td>
                    <td>{accountManager}</td>
                </tr>
            ))}
        </tbody>
    ...
);
```

Now, when you click on a client in the **Clients** app, the **Stocks** app will display only the stocks that are in the portfolio of the selected client.

### 4.4. Stream Subscription

Use the [Interop API](../../reference/core/latest/interop/index.html) to subscribe the **Stocks** and **Stock Details** apps to the previously created Interop stream.

Go to the `glue.js` files of the **Stocks** and **Stock Details** apps and define a callback for creating a stream subscription. This callback will receive as parameters a handler function responsible for updating the stock prices in the respective component, and either an array of stocks or a single stock depending on whether the callback has been invoked by the **Stocks** or the **Stock Details** app:

```javascript
import { SET_PRICES_STREAM } from "./constants";

export const subscribeForInstrumentStream = (handler) => async (glue, stock) => {
    if (stock) {
        // Create a stream subscription.
        const subscription = await glue.interop.subscribe(SET_PRICES_STREAM);
        const handleUpdates = ({ data: stocks }) => {
            if (stocks[stock]) {
                handler(stocks[stock]);
            } else if (Array.isArray(stock)) {
                handler(stocks);
            };
        };
        // Specify a handler for new data.
        subscription.onData(handleUpdates);
        // Specify a handler if the subscription fails.
        subscription.onFailed(console.log);

        return subscription;
    };
};
```

Go to the `<Stocks />` component and create a stream subscription. The stream used in the tutorial publishes all possible stock prices and it isn't necessary to close and renew the subscription when a new client has been selected. However, to simulate a real project scenario, pass the `portfolio` as a dependency of the `useGlue()` hook to trigger a new subscription every time the `portfolio` has been updated:

```javascript
import { subscribeForInstrumentStream } from "./glue";

function Stocks() {
    ...
    // The prices will be updated when new data is received from the stream.
    const [prices, setPrices] = useState({});
    // Create a stream subscription that will be renewed every time the `portfolio` changes.
    const subscription = useGlue(
        (glue, portfolio) => {
            if (portfolio.length > 0) {
                return subscribeForInstrumentStream(setPrices)(glue, portfolio);
            }
        },
        [portfolio]
    );

    useEffect(() => {
        const fetchPortfolio = async () => {
            try {
                // Close the existing subscription when a new client has been selected.
                subscription &&
                typeof subscription.close === "function" &&
                subscription.close();

                const url = `http://localhost:8080/api/portfolio/${clientId ? clientId : ""}`;
                const response = await fetch(url, REQUEST_OPTIONS);
                const portfolio = await response.json();
                setPortfolio(portfolio);
            } catch (error) {
                console.error(error);
            };
        };
        fetchPortfolio();
    }, [clientId]);
    ...
};
```

Update the code for displaying the `Ask` and `Bid` prices by taking their values from the `prices` variable that is updated when new data is received from the stream:

```javascript
return (
    ...
        <tbody>
            {portfolio.map(({ RIC, Description, Bid, Ask, ...rest }) => (
                <tr
                    onClick={() => showStockDetails({ RIC, Description, Bid, Ask, ...rest })}
                    key={RIC}
                >
                    <td>{RIC}</td>
                    <td>{Description}</td>
                    <td className="text-right">
                        {prices[RIC] ? prices[RIC].Bid : Bid}
                    </td>
                    <td className="text-right">
                        {prices[RIC] ? prices[RIC].Ask : Ask}
                    </td>
                </tr>
            ))}
        </tbody>
    ...
);
```

Finally, go to the `<StockDetails />` component, extract the `Bid` and the `Ask` from the state, and create a stream subscription by passing the `setPrices` method as a handler for the new stream data and the `RIC` to target the stock for which to get the prices.

```javascript
import { subscribeForInstrumentStream } from "./glue";

function StockDetails() {
    ...
    const {
        stock: { RIC, BPOD, Bloomberg, Description, Exchange, Venues } = {}
    } = windowContext || {};

    const [{ Bid, Ask }, setPrices] = useState({ Bid: windowContext.Bid, Ask: windowContext.Ask});

    useGlue(subscribeForInstrumentStream(setPrices), [RIC]);
    ...
};
```

*Note that each new instance of the **Stocks** app will create a new stream instance. In real-life scenarios, this should be handled differently - e.g., by a system app acting as a designated data provider. For more details, see [Plugins](../../capabilities/plugins/index.html).*

## 5. Shared Contexts

The next request of the users is to be able to see in the **Stock Details** app whether the selected client has the selected stock in their portfolio. This time you will use the [Shared Contexts API](../../reference/core/latest/shared%20contexts/index.html) to connect the **Clients**, **Stocks** and **Stock Details** apps through shared context objects.

*See also the [Capabilities > Data Sharing Between Apps > Shared Contexts](../../capabilities/data-sharing-between-apps/shared-contexts/index.html) documentation.*

### 5.1. Updating a Context

Go to the `glue.js` file of the **Clients** and **Stocks** apps and define a function for updating the shared context object. Use the [`update()`](../../reference/core/latest/shared%20contexts/index.html#API-update) method to create and set a shared context object by providing a name and value - it will hold the selected client object. Other apps will be able to subscribe for updates to this context and be notified when its value changes:

```javascript
import { SHARED_CONTEXT_NAME } from "./constants";

export const setClientPortfolioSharedContext = (glue) => (
    {
        clientId = "",
        clientName = "",
        portfolio = ""
    }
) => {
    glue.contexts.update(SHARED_CONTEXT_NAME, {
        clientId,
        clientName,
        portfolio
    });
};
```

Go to the **Clients** app and replace the `setClientPortfolioInterop()` handler for selecting a client with the `setClientPortfolioSharedContext()` one. Pass the `portfolio` object to `onClickSharedContext()` when calling it:

```javascript
import { setClientPortfolioSharedContext } from "./glue";

function Clients() {
    ...
    // const onClickClients = useGlue(setClientPortfolioInterop);
    const onClickSharedContext = useGlue(setClientPortfolioSharedContext);
    ...

    return (
        ...
            {clients.map(({ name, pId, gId, accountManager, portfolio, ...rest }) => (
                <tr
                    key={pId}
                    onClick={() => {
                        onClickSharedContext({ clientId: gId, clientName: name, portfolio })
                    }}
                >
                ...
            ))}
        ...
    );
};
```

Go to the **Stocks** app and define a handler for updating the shared context with the `useGlue()` hook. Also, add a "Show All" button in the `return` statement of the component that will invoke the handler on button click. When the user clicks on the "Show All" button, the **Stocks** will clear the data in the shared context in order to display information about all available stocks:

```javascript
import { setClientPortfolioSharedContext } from "./glue";

function Stocks() {
    ...
    const updateClientContext = useGlue(setClientPortfolioSharedContext);
    ...
    return (
        <div className="container-fluid">
            <div className="row">
                ...
                <div className="col-md-8">
                    <h1 className="text-center">Stocks</h1>
                </div>
                <div className="col-md-2 py-2">
                    <button
                        type="button"
                        className="mb-3 btn btn-primary"
                        onClick={() => updateClientContext({})}
                    >
                        Show All
                    </button>
                </div>
            </div>
            ...
        </div>
    );
};
```

### 5.2. Subscribing for Context Updates

Subscribe the **Stocks** and **Stock Details** apps for updates to the same context object in order to update them accordingly when the user selects a new client.

Go to the `glue.js` files of the **Stocks** and **Stock Details** apps and define a function for subscribing to the context. Use the [`subscribe()`](../../reference/core/latest/shared%20contexts/index.html#API-subscribe) method and pass the shared context name and a handler for the context updates as arguments:

```javascript
import { SHARED_CONTEXT_NAME } from "./constants";

export const subscribeForSharedContext = (handler) => (glue) => {
    // Subscribing for the shared context.
    glue.contexts.subscribe(SHARED_CONTEXT_NAME, handler);
};
```

Go to the `<Stocks />` component and replace the `registerSetClientMethod()` handler with the `subscribeForSharedContext()` one:

```javascript
import { subscribeForSharedContext } from "./glue";

function Stocks() {
    ...
    useGlue(subscribeForSharedContext(setClient));
    ...
};
```

Go to the `<StockDetails />` component and subscribe for updates to the shared context. Add an element in the `return` statement that will be displayed conditionally depending on whether the client has the selected stock in their portfolio. Add the client information (`clientId`, `clientName`, `portfolio`) to the component state to be able to display data about the currently selected client and use the `portfolio` to determine whether the client has the selected stock in their portfolio:

```javascript
import { subscribeForSharedContext } from "./glue";

function StockDetails() {
    ...
    const [{ clientId, clientName, portfolio }, setClient] = useState({});
    ...
    useGlue(subscribeForSharedContext(setClient));

    return (
        <div className="container-fluid">
            <div className="row">
                ...
                {clientId && (
                    <>
                        <h2 className="p-3">
                            Client {clientName} - {clientId}
                        </h2>
                        {RIC && portfolio.length && !portfolio.includes(RIC) && (
                            <h4 className="p-3">
                                The client doesn't have this stock in their portfolio.
                            </h4>
                        )}
                    </>
                )}
            </div>
            ...
        </div>
    );
};
```

Now, the **Stock Details** app will show whether the client selected from the **Clients** app has the the displayed stock in their portfolio.

## 6. Channels

The latest requirement from the users is to be able to work with multiple clients at a time by having multiple instances of the **Stocks** app show the portfolios of different clients. Currently, no matter how many instances of the **Stocks** app are running, they are all listening for updates to the same context and therefore all show information about the same selected client. Here you will use the [Channels API](../../reference/core/latest/channels/index.html) to allow each instance of the **Stocks** app to subscribe for updates to the context of a different Channel. The different Channels are color-coded and the user will be able to select a Channel from a Channel Selector UI. The **Clients** app will update the context of the currently selected Channel when the user clicks on a client.

*See also the [Capabilities > Data Sharing Between Apps > Channels](../../capabilities/data-sharing-between-apps/channels/index.html) documentation.*

### 6.1. Channels Configuration

The [Main app](../../developers/core-concepts/web-platform/overview/index.html) (the **Clients** app in this project) handles the configuration of the Glue42 environment. The `GlueWebPlatform()` factory function accepts an optional configuration object that allows you to enable, disable and configure various Glue42 features. Here, you will use it to define the available Glue42 Channels.

Go to the `index.js` file of the **Clients** app, define a configuration object and pass it to `GlueWebPlatform()`:

```javascript
// Defining Glue42 Channels.
const channels = {
    definitions: [
        {
            name: "Red",
            meta: {
                color: "red"
            }
        },
        {
            name: "Green",
            meta: {
                color: "green"
            }
        },
        {
            name: "Blue",
            meta: {
                color: "#66ABFF"
            }
        },
        {
            name: "Pink",
            meta: {
                color: "#F328BB"
            }
        },
        {
            name: "Yellow",
            meta: {
                color: "#FFE733"
            }
        },
        {
            name: "Dark Yellow",
            meta: {
                color: "#b09b00"
            }
        },
        {
            name: "Orange",
            meta: {
                color: "#fa5a28"
            }
        },
        {
            name: "Purple",
            meta: {
                color: "#c873ff"
            }
        },
        {
            name: "Lime",
            meta: {
                color: "#8af59e"
            }
        },
        {
            name: "Cyan",
            meta: {
                color: "#80f3ff"
            }
        }
    ]
};

// Define the configuration object and pass it to the factory function.
const config = { channels };

const settings  = {
    webPlatform: {
        factory: GlueWebPlatform,
        config
    }
};

ReactDOM.render(
    <GlueProvider settings={settings}>
        <Clients />
    </GlueProvider>,
    document.getElementById("root")
);
```

When the **Clients** app starts, the defined Channels will be initialized and ready for interaction.

### 6.2. Channel Selector Widget

The users have to be able to navigate through the Channels for which they will need some sort of user interface. You can create your own Channel selector widget by using the Channels API, but for the purpose of the tutorial, the widget is provided. To add it to the **Clients** and **Stocks** apps, follow these steps:

1. Import the Channel Selector widget in the `<Clients />` and `<Stocks />` components:

```javascript
import ChannelSelectorWidget from "./ChannelSelectorWidget";
```

2. To use the new component, you have to pass two props to it:
- `channelNamesAndColors` - the names and colors of all available Channels;
- `onChannelSelected` - handler that will be called when the Channel changes;

Go to the `glue.js` files of the **Clients** and **Stocks** apps and define the following callbacks:

```javascript
// This will be used to signify that the app isn't connected to any Channel.
import { NO_CHANNEL_VALUE } from "./constants";

// Returns all names and color codes of the avaialbale Channels.
export const getChannelNamesAndColors = async (glue) => {
    // Getting a list of all Channel contexts.
    const channelContexts = await glue.channels.list();

    // Extracting only the names and colors of the Channels.
    const channelNamesAndColors = channelContexts.map((channelContext) => {
        const channelInfo = {
            name: channelContext.name,
            color: channelContext.meta.color
        };

        return channelInfo;
    });

    return channelNamesAndColors;
};

// This function will join the app to a Channel.
export const joinChannel = (glue) => ({ value: channelName }) => {
    // Leave the current Channel when the user selects "No Channel".
    if (channelName === NO_CHANNEL_VALUE) {
        if (glue.channels.my()) {
            glue.channels.leave().catch(console.error);
        };
    } else {
        // Join the Channel selected by the user.
        glue.channels.join(channelName).catch(console.error);
    };
};
```

3. Setup the `ChannelSelectorWidget` in both apps.

Go to the **Clients** app to set up the Channels functionalities. Import the `NO_CHANNEL_VALUE` constant that will be used for leaving the current Channel:

```javascript
import { NO_CHANNEL_VALUE } from "./constants";
import {
    getChannelNamesAndColors,
    joinChannel
} from "./glue";

function Clients() {
    ...
    const channelNamesAndColors = useGlue(getChannelNamesAndColors);
    const onChannelSelected = useGlue(joinChannel);
    ...
};
```

Create the `<ChannelWidgetSelector />` component in the `return` statement. Pass `channelNamesAndColors` and `onChannelSelected` as props to it:

```javascript
return (
    <div className="container-fluid">
        <div className="row">
            ...
            <div className="col-md-8">
                <h1 className="text-center">Clients</h1>
            </div>
            <div className="col-md-2 py-2">
                    <button className="btn btn-primary">Stocks</button>
            </div>
            <div className="px-3 py-1">
                <ChannelSelectorWidget
                    channelNamesAndColors={channelNamesAndColors}
                    onChannelSelected={onChannelSelected}
                />
            </div>
            ...
        </div>
        ...
    </div>
);
```

4. Go to the **Stocks** app to set up the Channels functionalities. Define a `setDefaultClient()` callback for handling the default state where no client has been selected and a `channelWidgetState` variable that will be used to trigger state change in the `<ChannelWidgetSelector />` component:

```javascript
import {
    getChannelNamesAndColors,
    joinChannel
} from "./glue";

function Stocks() {
    ...
    const channelNamesAndColors = useGlue(getChannelNamesAndColors);
    const onChannelSelected = useGlue(joinChannel);
    const setDefaultClient = () => setClient({ clientId: "", clientName: "" });
    const [channelWidgetState, setChannelWidgetState] = useState(false);
    ...
};
```

Create the `<ChannelWidgetSelector />` component in the `return` statement. Pass `channelNamesAndColors` and `onChannelSelected` as props to it. Use the `onDefaultChannelSelected` property to clear the selected client and leave the current Channel when the user selects "No channel":

```javascript
return (
    <div className="container-fluid">
        <div className="row">
            ...
            <div className="col-md-8">
                <h1 className="text-center">Stocks</h1>
            </div>
            ...
            <div className="px-3 py-1">
                <ChannelSelectorWidget
                    channelNamesAndColors={channelNamesAndColors}
                    onChannelSelected={onChannelSelected}
                    onDefaultChannelSelected={setDefaultClient}
                />
            </div>
        </div>
        ...
    </div>
);
```

To leave the current Channel, re-render the Channel selector and clear the selected client when the user clicks the "Show All" button, modify its `onClick` handler:

```javascript
onClick={() => {
    setChannelWidgetState(!channelWidgetState);
    setDefaultClient();
}}
```

Pass the `channelWidgetState` state variable to the `key` property of the `ChannelSelectorWidget` component to trigger state change:

```javascript
function Stocks() {
    ...
    return (
        <div className="container-fluid">
            <div className="row">
                ...
                <button
                    type="button"
                    className="mb-3 btn btn-primary"
                    onClick={() => {
                        setChannelWidgetState(!channelWidgetState);
                        setDefaultClient();
                    }}
                >
                    Show All
                </button>
                ...
                <div className="col-md-2 align-self-center">
                    <ChannelSelectorWidget
                        key={channelWidgetState}
                        channelNamesAndColors={channelNamesAndColors}
                        onChannelSelected={onChannelSelected}
                        onDefaultChannelSelected={setDefaultClient}
                    />
                </div>
            </div>
            ...
        </div>
    );
};
```

### 6.3. Publishing and Subscribing

Next, you need to enable the **Clients** app to publish updates to the current Channel context and the **Stocks** app to subscribe for these updates.

Go to the `glue.js` file of the **Clients** app and define a function that will publish updates to the current Channel. Use the [`publish()`](../../reference/core/latest/channels/index.html#API-publish) method and pass the selected client as an argument to update the Channel context when a new client is selected. Note that `publish()` will throw an error if the app tries to publish data but isn't on a Channel. Use the [`my()`](../../reference/core/latest/channels/index.html#API-my) method to check for the current Channel:

```javascript
export const setClientPortfolioChannels = (glue) => (
    {
        clientId = "",
        clientName = ""
    }
) => {
    if (glue.channels.my()) {
        glue.channels.publish({ clientId, clientName }).catch(console.error);
    };
};
```

Go to the `<Clients />` component and use this function to update the current Channel. Don't remove the `onClickSharedContext()` handler from the client rows. The **Stock Details** app still uses the shared context to get the client information so you need to use both handlers:

```javascript
import { setClientPortfolioChannels } from "./glue";

function Clients() {
    ...
    const onClickSharedContext = useGlue(setClientPortfolioSharedContext);
    const onClickChannel = useGlue(setClientPortfolioChannels);
    ...

    return (
        ...
        <tr
            key={pId}
            onClick={() => {
                    // Use both handlers.
                    onClickSharedContext({ clientId: gId, clientName: name, portfolio });
                    onClickChannel({ clientId: gId, clientName: name });
                }
            }
        >
        ...
    );
};
```

Go to the `glue.js` file of the **Stocks** app and define a function that will subscribe for Channel updates:

```javascript
export const subscribeForChannels = (handler) => (glue) => {
    // Subscribing for updates to the current Channel.
    glue.channels.subscribe(handler);
};
```

Go to the `<Stocks />` component and comment out or delete the code that uses the Shared Contexts API to listen for updates to the shared context. Instead, subscribe for Channel updates:

```javascript
import { subscribeForChannels } from "./glue";

function Stocks() {
    ...
    // useGlue(subscribeForSharedContext(setClient));
    useGlue(subscribeForChannels(setClient));
    ...
};
```

Now when the **Clients** and the **Stocks** apps are on the same Channel, the **Stocks** app will be updated with the portfolio of the selected client.

## 7. App Management

Up until now, you had to use the Window Management API to open new windows when the user clicks on the "Stocks" button in the **Clients** app or on a stock in the **Stocks** app. This works fine for small projects, but doesn't scale well for larger ones, because this way each app must know all details (URL, start position, initial context, etc.) of every app it starts. In this chapter, you will replace the Window Management API with the [App Management API](../../reference/core/latest/appmanager/index.html) which will allow you to predefine all available apps when initializing the [Main app](../../developers/core-concepts/web-platform/overview/index.html). The **Clients** app will be decoupled from the **Stocks** app and the **Stocks** app will be decoupled from **Stock Details** - you will need only the names of the apps to be able to start them.

*See also the [Capabilities > App Management](../../capabilities/application-management/index.html) documentation.*

### 7.1. App Configuration

To take advantage of the [App Management API](../../reference/core/latest/appmanager/index.html), define configurations for your apps. Go to the **Clients** app and define an `applications` property in the configuration object passed to `GlueWebPlatform()` containing all required definitions:

```javascript
// Define app configurations.
const applications = {
    local: [
        {
            name: "Clients",
            type: "window",
            details: {
                url: "http://localhost:3000/clients"
            }
        },
        {
            name: "Stocks",
            type: "window",
            details: {
                url: "http://localhost:3001/stocks",
                left: 0,
                top: 0,
                width: 860,
                height: 600
            }
        },
        {
            name: "Stock Details",
            type: "window",
            details: {
                url: "http://localhost:3002/details",
                left: 100,
                top: 100,
                width: 400,
                height: 400
            }
        },
        {
            name: "Client Details",
            type: "window",
            details: {
                url: "http://localhost:3003/client-details"
            }
        }
    ]
};

const config = { channels, applications };

const settings  = {
    webPlatform: {
        factory: GlueWebPlatform,
        config
    }
};

ReactDOM.render(
    <GlueProvider settings={settings}>
        <Clients />
    </GlueProvider>,
    document.getElementById("root")
);
```

The `name` and `url` properties are required when defining an app configuration object. As you see, the position and size of the app windows is now defined in their configuration.

### 7.2. Starting Apps

Go the the `glue.js` file of the **Clients** app and define a function for starting the **Stocks** app. Get the **Stocks** app object with the [`application()`](../../reference/core/latest/appmanager/index.html#API-application) method and use its [`start()`](../../reference/core/latest/appmanager/index.html#Application-start) method to start the **Stocks** app when the user clicks on the "Stocks" button. Pass the current Channel as context to the started instance:

```javascript
export const startApp = glue => async () => {
    const channels = await glue.channels.list();
    let channel = {};
    if (glue.channels.my()) {
        const channelDefinition = channels.find(channel => channel.name === glue.channels.my());
        channel = {
            name: channelDefinition.name,
            label: channelDefinition.name,
            color: channelDefinition.meta.color
        };
    } else {
        channel = {
            name: NO_CHANNEL_VALUE,
            label: NO_CHANNEL_VALUE
        }
    };
    glue.appManager.application("Stocks").start({ channel });
};
```

*Note that the `ChannelSelectorWidget` wraps a React `<Select />` component and to use it as a controlled component (when you want to make the **Stocks** app automatically select a Channel on startup), you must create a proper Channel definition object using the values of the `name` and `meta.color` properties and pass it to the **Stocks** app.*

Import the `startApp()` function in the `<Clients />` component, create a `startStocksApp()` callback and pass it to the `onClick` handler of the "Stocks" button:

```javascript
import { startApp } from "./glue.js";

function Clients() {
    ...
    const startStocksApp = useGlue(startApp);
    ...

    return (
        ...
            <div className="col-md-2 py-2">
                <button className="btn btn-primary" onClick={startStocksApp}>Stocks</button>
            </div>
        ...
    )
};
```

Go to the `glue.js` file of the **Stocks** app and define a function that will get the Channel passed as window context by the **Clients** app:

```javascript
export const getMyWindowContext = (setWindowContext) => async (glue) => {
    const myWindow = glue.appManager.myInstance;
    const context = await myWindow.getContext();

    setWindowContext({ channel: context.channel });
};
```

Go to the `<Stocks />` component, import the function and use it to set the window context:

```javascript
import { getMyWindowContext } from "./glue";

function Stocks() {
    ...
    const [currentChannel, setCurrentChannel] = useState({ value: NO_CHANNEL_VALUE, label: NO_CHANNEL_VALUE });
    const [windowContext, setWindowContext] = useState({});

    useGlue(getMyWindowContext(setWindowContext));

    useEffect(() => {
        if (windowContext.channel) {
            setCurrentChannel(windowContext.channel);
            if (onChannelSelected) {
                onChannelSelected({ value: windowContext.channel.name });
            }
        } else {
            setCurrentChannel({ value: NO_CHANNEL_VALUE, label: NO_CHANNEL_VALUE });
        }
    }, [windowContext.channel, onChannelSelected]);
    ...
};
```

Add a `value` property to the `<ChannelSelectorWidget />` that will hold the `currentChannel` value. Add the `setCurentChannel()` function to the `onChannelSelected` property:

```javascript
function Stocks() {
    ...
    return (
        ...
        <div className="col-md-2 align-self-center">
            <ChannelSelectorWidget
                key={channelWidgetState}
                value={currentChannel}
                channelNamesAndColors={channelNamesAndColors}
                onChannelSelected={channel => {
                    onChannelSelected(channel);
                    setCurrentChannel(channel);
                }}
                onDefaultChannelSelected={channel => {
                    setDefaultClient();
                    onChannelSelected(channel);
                    setCurrentChannel({ value: NO_CHANNEL_VALUE, label: NO_CHANNEL_VALUE });
                }}
            />
        </div>
        ...
    )
};
```

The `onChannelSelected()` function manages the Channel selection and the `setCurrentChannel()` function visualizes the current Channel in the component.

### 7.3. App Instances

Go to the `glue.js` file of the **Stocks** app and edit the `openStockDetails()` function. Use the [`application()`](../../reference/core/latest/appmanager/index.html#API-application) method to get the **Stock Details** app. Check whether an instance with the selected stock has already been started by iterating over the contexts of the existing **Stock Details** instances. If there is no instance with the selected stock, call the `start()` method on the app object and pass the selected stock as a context:

```javascript
export const openStockDetails = (glue) => async (stock) => {
    const detailsApplication = glue.appManager.application("Stock Details");

    // Check whether an instance with the selected stock is already running.
    const contexts = await Promise.all(
        // Use the `instances` property to get all running app instances.
        detailsApplication.instances.map(instance => instance.getContext())
    );
    const isRunning = contexts.find(context => context.stock.RIC === stock.RIC);

    if (!isRunning) {
        detailsApplication.start({ stock }).catch(console.error);
    };
};
```

Go to the `glue.js` file of the **Stock Details** app and edit the `getMyWindowContext()` function to get the window context using the App Management API:

```javascript
export const getMyWindowContext = (setWindowContext) => async (glue) => {
    const myWindow = glue.appManager.myInstance;
    const context = await myWindow.getContext();

    setWindowContext({ stock: context.stock });
};
```

Everything works as before, the difference being that the apps now use the App Management API instead of the Window Management API.

## 8. Plugins

The developer team has decided against hard coding app definitions, as in practice it's more scalable to fetch them from a web service. The Glue42 [Plugins](../../capabilities/plugins/index.html) allow you to execute initial system logic contained in a custom function with access to the `glue` object. You can also configure the [Main app](../../developers/core-concepts/web-platform/overview/index.html) whether to wait for the execution of the Plugin to complete before initialization. This will enable you to fetch and import the app definitions on startup of the Main app, but before the initialization of the [@glue42/web-platform](https://www.npmjs.com/package/@glue42/web-platform) library has completed, so that they are available to the Glue42 framework when the user starts the Main app.

*See also the [Capabilities > Plugins](../../capabilities/plugins/index.html) documentation.*

### 8.1. Defining a Plugin

Go to the `index.js` file of the **Clients** app, comment out or delete the previously declared app definitions and remove the `applications` property from the library configuration object.

Import the `setupApplications()` function from the `applicationsPlugin.js` file located in the `/plugins` folder of the **Clients** app.

Next, configure the Plugin in the Main app by using the `plugins` property of the [@glue42/web-platform](https://www.npmjs.com/package/@glue42/web-platform) configuration object. Plugin are defined in the `definitions` array of the `plugins` object. Set a name for the Plugin and pass a reference to the `setupApplications()` function in the `start` property of the Plugin object. Use the optional `config` object to pass the URL from which to fetch the app definitions. Set the `critical` property to `true` to instruct the Main app to wait for the Plugin to execute before the Web Platform initialization completes:

```javascript
import { setupApplications } from "./plugins/applicationsPlugin";

// Define a Plugin.
const plugins = {
    definitions: [
        {
            name: "Setup Applications",
            config: { url: "http://localhost:8080/api/applicationsReact"},
            start: setupApplications,
            critical: true
        }
    ]
};

const config = { channels, plugins };

const settings  = {
    webPlatform: {
        factory: GlueWebPlatform,
        config
    }
};

ReactDOM.render(
    <GlueProvider settings={settings}>
        <Clients />
    </GlueProvider>,
    document.getElementById("root")
);
```

### 8.2. Implementing a Plugin

Go to the `applicationsPlugin.js` file. The `setupApplications()` function will be the Plugin that will be executed on startup of the Main app. It will receive an initialized `glue` object as a first argument, and the `config` object from the Plugin definition as a second argument. From the `url` property of the `config` object you will extract the URL from which to fetch the app definitions.

In `setupApplications()` call the `fetchAppDefinitions()` function and pass to it the URL as an argument. Store the fetched app definitions in a variable and use the [`import()`](../../reference/core/latest/appmanager/index.html#InMemory-import) method of the [`inMemory`](../../reference/core/latest/appmanager/index.html#InMemory) object of the App Management API to [import the app definitions at runtime](../../capabilities/application-management/index.html#managing_app_definitions_at_runtime):

```javascript
// In `setupApplications()`.

try {
    const appDefinitions = await fetchAppDefinitions(url);

    await glue.appManager.inMemory.import(appDefinitions);
} catch (error) {
    console.error(error.message);
};
```

From a user perspective, everything works as before, but by using a Plugin to fetch and import the app definitions at runtime, you have decoupled the Main app from the previously hard coded `applications` object.

## 9. Workspaces

The latest feedback from the users is that their desktops very quickly become cluttered with multiple floating windows. The [**Glue42 Core**](https://glue42.com/core/) [Workspaces](../../capabilities/windows/workspaces/overview/index.html) feature solves exactly that problem.

The new requirement is that when a user clicks on a client in the **Clients** app, a new Workspace is to open displaying detailed information about the selected client in one app and their stocks portfolio in another. When the user clicks on a stock, a third app is to appear in the same Workspace displaying more details about the selected stock. You will create a **Client Details** app for displaying information about the selected client.

Remove the "Stocks" button from the **Clients** app and all logic related to it. Also remove all logic and references related to Channels from the **Clients** and **Stocks** apps that were introduced in a previous chapter. Go to the **Stock Details** app and remove the element displaying whether the selected client has the selected stock in their portfolio and all logic related to it.

Instead, you will use Workspaces to allow the users to work with multiple clients at once and organize their desktops at the same time. Channels and Workspaces can, of course, be used together to provide extremely enhanced user experience, but in order to focus entirely on working with Workspaces and the [Workspaces API](../../reference/core/latest/workspaces/index.html), the Channels functionality will be ignored.

*See also the [Capabilities > Windows > Workspaces](../../capabilities/windows/workspaces/overview/index.html) documentation.*

### 9.1. Setup

All Workspaces are contained in a specialized standalone web app called [Workspaces App](../../capabilities/windows/workspaces/overview/index.html#workspaces_concepts-frame). It's outside the scope of this tutorial to cover building and customizing this app, so you have a ready-to-go app located at `/workspace`. The Workspaces App is already being hosted at `http://localhost:9300/`.

#### Create the Client Details App

Create a **Client Details** app that will be used for showing client information by following these steps:

- Create a new React app named `client-details` in the root directory of your [**Glue42 Core**](https://glue42.com/core/) project following the instructions in [Chapter 1.4.](#1_initial_setup-14_react_project_setup).

- Create a `ClientDetails.jsx` file in `/client-details/src` and paste the following code:

```javascript
import React, { useState } from "react";

function ClientDetails() {
    const [client, setClient] = useState({});

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-md-2">
                    <span id="glueSpan" className="label label-warning">Glue42 is unavailable</span>
                </div>
                <div className="col-md-10">
                    <h1 className="text-center">Client Details</h1>
                </div>
            </div>
            <div className="row">
                <div className="col-md-12">
                    <h3 id="clientStatus"></h3>
                </div>
            </div>
            <div className="row">
                <table id="clientsTable" className="table table-hover">
                    <tbody>
                        <tr>
                            <th>Full Name</th>
                            <td data-name>{client && client.clientName}</td>
                        </tr>
                        <tr>
                            <th>Address</th>
                            <td data-address>{client && client.address}</td>
                        </tr>
                        <tr>
                            <th>Phone Number</th>
                            <td data-phone>{client && client.contactNumbers}</td>
                        </tr>
                        <tr>
                            <th>Email</th>
                            <td data-email>{client && client.email}</td>
                        </tr>
                        <tr>
                            <th>Account Manager</th>
                            <td data-manager>{client && client.accountManager}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClientDetails;
```

- Go to the `index.js` file of the newly created **Client Details** app. Add all imports from the example below, remove the `App` import and replace the `<App />` component with `<ClientDetails />`:

```javascript
import GlueWeb from "@glue42/web";
import { GlueProvider } from "@glue42/react-hooks";
import ClientDetails from "./ClientDetails";
import "bootstrap/dist/css/bootstrap.css";

const settings  = {
    web: {
        factory: GlueWeb
    }
};

ReactDOM.render(
    <GlueProvider settings={settings}>
        <ClientDetails />
    </GlueProvider>,
    document.getElementById("root")
);
```

### 9.2. Workspace Layouts

A [Workspace Layout](../../capabilities/windows/workspaces/overview/index.html#workspaces_concepts-workspace_layout) describes the apps participating in the Workspace and their arrangement. In a real-life scenario, Workspace Layouts, like app definitions, will most likely be fetched from a web service. Therefore, you can use another Glue42 [Plugin](../../capabilities/plugins/index.html) to fetch a Workspace Layout named "Client Space" that the **Clients** app will use as a blueprint for restoring a Workspace when the user clicks on a client.

*For more details on using Glue42 Plugins, see chapter [8. Plugins](#8_plugins).*

Go to the `index.js` file of the **Clients** app, import the `setupLayouts()` function from `layoutsPlugin.js` located in the `/plugins` folder and define another Plugin that will fetch the Workspace Layout:

```javascript
import { setupLayouts } from "./plugins/layoutsPlugin";

const plugins = {
    definitions: [
        {
            name: "Setup Applications",
            config: { url: "http://localhost:8080/api/applicationsReact"},
            start: setupApplications,
            critical: true
        },
        {
            name: "Setup Workspace Layouts",
            config: { url: "http://localhost:8080/api/layouts"},
            start: setupLayouts,
            critical: true
        }
    ]
};

const config = { plugins };
```

Go to the `layoutsPlugin.js` file. In `setupLayouts()` call the `fetchWorkspaceLayoutDefinitions()` function and pass to it the URL as an argument. Store the fetched Layout definitions in a variable and use the [`import()`](../../reference/core/latest/appmanager/index.html#InMemory-import) method of the [Layouts API](../../reference/core/latest/layouts/index.html) to import the Workspace Layout at runtime.

```javascript
// In setupLayouts().

try {
    const layoutDefinitions = await fetchWorkspaceLayoutDefinitions(url);

    await glue.layouts.import(layoutDefinitions);
} catch (error) {
    console.error(error.message);
};
```

Now the Workspace Layout can be restored by name using the [Workspaces API](../../reference/core/latest/workspaces/index.html).

### 9.3. Initializing Workspaces

To be able to use Workspaces functionalities, initialize the [Workspaces API](../../reference/core/latest/workspaces/index.html) in the **Clients**, **Client Details** and **Stocks** apps. The **Stock Details** app will participate in the Workspace, but won't use any Workspaces functionality.

Go to the root directories of the **Clients**, **Stocks** and **Client Details** apps and run the following command to install the Workspaces library:

```cmd
npm install --save @glue42/workspaces-api
```

Go to the `index.js` file of the **Clients** app and add the necessary configuration for initializing the Workspaces library. The **Clients** app is also the [Main app](../../developers/core-concepts/web-platform/overview/index.html) and besides the `GlueWorkspaces()` factory function, its configuration object requires also a `workspaces` property defining where the Workspaces App is located:

```javascript
import GlueWorkspaces from "@glue42/workspaces-api";

const config = {
    // Pass the `GlueWorkspaces()` factory function.
    glue: { libraries: [GlueWorkspaces] },
    // Specify the location of the Workspaces App.
    workspaces: { src: "http://localhost:9300/" },
    plugins
};

const settings  = {
    webPlatform: {
        factory: GlueWebPlatform,
        config
    }
};

ReactDOM.render(
    <GlueProvider settings={settings}>
        <Clients />
    </GlueProvider>,
    document.getElementById("root")
);
```

Next, go to the `index.js` files of the **Client Details** and **Stocks** apps, import the `GlueWorkspaces` library, and add a reference to the `GlueWorkspaces()` factory function to the `libraries` array of the configuration object when initializing the Glue42 Web library:

```javascript
import GlueWorkspaces from "@glue42/workspaces-api";

const config = { libraries: [GlueWorkspaces] };

const settings = {
    web: {
        factory: GlueWeb,
        config
    }
};
```

### 9.4. Opening Workspaces

Next, implement opening a new Workspace when the user clicks on a client in the **Clients** app.

Go to the `glue.js` file of the **Clients** app, define a function that will restore by name the Workspace Layout you retrieved earlier and pass the selected client as a starting context. The specified context will be attached as window context to all windows participating in the Workspace:

```javascript
export const startAppWithWorkspace = (glue) => async (client) => {
    try {
        const workspace = await glue.workspaces.restoreWorkspace("Client Space", { context: client });
    } catch (error) {
        console.error(error.message);
    };
};
```

Import the function in the `<Clients />` component and create a `openWorkspace()` callback to be passed to the `onClick` handler of each client row:

```javascript
import { startAppWithWorkspace } from "./glue";

function Clients() {
    ...
    const openWorkspace = useGlue(startAppWithWorkspace);
    ...
};
```

Delete the existing code in the `onClick` handler of the client row element and replace it with a call to `openWorkspace()`:

```javascript
...
    return (
        ...
            <tr
                key={pId}
                onClick={() => {
                    openWorkspace({ clientId: gId, clientName: name, accountManager, portfolio, ...rest });
                }}
            >
            ...
            </tr>
        ...
    );
...
```

If everything is correct, a new Workspace will now open every time you click on a client.

### 9.5. Starting Context

Handle the starting Workspace context to show the details and the portfolio of the selected client in the **Client Details** and **Stocks** apps. Also, set the Workspace title to the name of the selected client.

Create a `glue.js` file in the `/client-details/src` folder of the **Client Details** and define a function that will be used for handling the details of the selected client. Use the [`onContextUpdated()`](../../reference/core/latest/workspaces/index.html#Workspace-onContextUpdated) method of the current Workspace to subscribe for context updates. Invoke the `setClient()` function passing the value of the updated context and set the title of the Workspace to the name of the selected client:

```javascript
export const setClientFromWorkspace = (setClient) => async (glue) => {
    const myWorkspace = await glue.workspaces.getMyWorkspace();
    myWorkspace.onContextUpdated((context) => {
        if (context) {
            setClient(context);
            myWorkspace.setTitle(context.clientName);
        };
    });
};
```

Import the `setClientFromWorkspace()` function in the `<ClientDetails />` component and set it up using the `useGlue()` hook:

```javascript
import { useGlue } from "@glue42/react-hooks";
import { setClientFromWorkspace } from "./glue";

function ClientDetails() {
    ...
    useGlue(setClientFromWorkspace(setClient));
    ...
};
```

Next, go to the `glue.js` file of the **Stocks** app and define a function that will be used for handling the stocks of the selected client. Use the [`onContextUpdated()`](../../reference/core/latest/workspaces/index.html#Workspace-onContextUpdated) Workspace method and set up the stocks for the selected client:

```javascript
export const setClientFromWorkspace = (setClient) => async (glue) => {
    const myWorkspace = await glue.workspaces.getMyWorkspace();
    myWorkspace.onContextUpdated((context) => {
        if (context) {
            setClient(context);
        };
    });
};
```

Import the `setClientFromWorkspace()` function in the `<Stocks />` component and set it up using the `useGlue()` hook:

```javascript
import { setClientFromWorkspace } from "./glue";

function Stocks() {
    ...
    useGlue(setClientFromWorkspace(setClient));
    ...
};
```

Now, when you select a client in the **Clients** app, a new Workspace will open with the **Client Details** and **Stocks** apps showing the relevant client information.

### 9.6. Modifying Workspaces

Next, you have to make the **Stock Details** app appear in the same Workspace as a sibling of the **Stocks** app when the user clicks on a stock. You have to check whether the **Stock Details** app has already been added to the Workspace, and if not - add it and update its context with the selected stock, otherwise - only update its context.

*To achieve this functionality, you will have to manipulate a Workspace and its elements. It is recommended that you familiarize yourself with the Workspaces terminology to fully understand the concepts and steps below. Use the available documentation about [Workspaces Concepts](../../capabilities/windows/workspaces/overview/index.html#workspaces_concepts), [Workspace Box Elements](../../capabilities/windows/workspaces/workspaces-api/index.html#box_elements) and the [Workspaces API](../../reference/core/latest/workspaces/index.html).*

The **Stocks** app is a [`WorkspaceWindow`](../../reference/core/latest/workspaces/index.html#WorkspaceWindow) that is the only child of a [`Group`](../../reference/core/latest/workspaces/index.html#Group) element. If you add the **Stock Details** app as a child to that `Group`, it will be added as a second tab window and the user will have to manually switch between both apps. The **Stock Details** app has to be a sibling of the **Stocks** app, but both apps have to be visible within the same parent element. That's why, you have to add a new `Group` element as a sibling of the existing `Group` that contains the **Stocks** app, and then load the **Stock Details** app in it.

After the **Stocks Details** app has been opened in the Workspace as a [`WorkspaceWindow`](../../reference/core/latest/workspaces/index.html#WorkspaceWindow), you have to pass the selected stock as its context. To do that, get a reference to the underlying [Glue42 Window](../../reference/core/latest/windows/index.html#WebWindow) object of the **Stock Details** window using the [`getGdWindow()`](../../reference/core/latest/workspaces/index.html#WorkspaceWindow-getGdWindow) method of the [`WorkspaceWindow`](../../reference/core/latest/workspaces/index.html#WorkspaceWindow) instance and update its context with the [`updateContext()`](../../reference/core/latest/windows/index.html#WebWindow-updateContext) method.

Go to the `glue.js` file of the **Stocks** app and define the following function:

```javascript
export const openStockDetailsInWorkspace = (glue) => async (stock) => {
    // Reference to the Glue42 Window object of the Stock Details instance.
    let detailsGlue42Window;

    const myWorkspace = await glue.workspaces.getMyWorkspace();

    // Reference to the `WorkspaceWindow` object of the Stock Details instance.
    let detailsWorkspaceWindow = myWorkspace.getWindow(window => window.appName === "Stock Details");

    // Check whether the Stock Details has already been opened.
    if (detailsWorkspaceWindow) {
        detailsGlue42Window = detailsWorkspaceWindow.getGdWindow();
    } else {
        // Reference to the current window.
        const myId = glue.windows.my().id;
        // Reference to the immediate parent element of the Stocks window.
        const myImmediateParent = myWorkspace.getWindow(window => window.id === myId).parent;
        // Add a `Group` element as a sibling of the immediate parent of the Stocks window.
        const group = await myImmediateParent.parent.addGroup();

        // Open the Stock Details window in the newly created `Group` element.
        detailsWorkspaceWindow = await group.addWindow({ appName: "Stock Details" });

        await detailsWorkspaceWindow.forceLoad();

        detailsGlue42Window = detailsWorkspaceWindow.getGdWindow();
    };

    // Update the window context with the selected stock.
    detailsGlue42Window.updateContext({ stock });
};
```

*Note that [`forceLoad()`](../../reference/core/latest/workspaces/index.html#WorkspaceWindow-forceLoad) is used to make sure that the **Stock Details** app is loaded and a [Glue42 Window](../../reference/core/latest/windows/index.html#WebWindow) instance is available. This is necessary, because [`addWindow()`](../../reference/core/latest/workspaces/index.html#Group-addWindow) adds a new window to the [`Group`](../../reference/core/latest/workspaces/index.html#Group) (meaning that it exists as an element in the Workspace), but it doesn't guarantee that the content has loaded.*

Import the function in the `<Stocks />` component and edit the existing `showStockDetails()` callback:

```javascript
import { openStockDetailsInWorkspace } from "./glue";

function Stocks() {
    ...
    const showStockDetails = useGlue(openStockDetailsInWorkspace);
    ...
};
```

Go to the `glue.js` file of the **Stock Details** app and change the `getMyWindowContext()` function to the following:

```javascript
export const getMyWindowContext = (setWindowContext) => async (glue) => {
    const myWindow = glue.windows.my();
    const context = await myWindow.getContext();

    setWindowContext({ stock: context.stock });

    myWindow.onContextUpdated((context) => {
        if (context) {
            setWindowContext({ stock: context.stock });
        };
    });
};
```

Now, when you click on a stock in the **Stocks** app, the **Stock Details** app will open below it in the Workspace showing information about the selected stocks.

## 10. Intents

A new requirement coming from the users is to implement a functionality that exports the portfolio of the selected client. Using the [Intents API](../../reference/core/latest/intents/index.html), you will instrument the **Stocks** app to raise an Intent for exporting the portfolio, and another app will perform the actual action - the **Portfolio Downloader**. The benefit of this is that at a later stage of the project, the app for exporting the portfolio can be replaced, or another app for handling the exported portfolio in a different way can also register the same Intent. In any of these cases, code changes in the **Stocks** app won't be necessary.

*See also the [Capabilities > Intents](../../capabilities/intents/index.html) documentation.*

### 10.1 Registering an Intent

In order for the **Portfolio Downloader** app to be targeted as an Intent handler, it must be registered as such. Apps can be registered as Intent handlers either by declaring the Intents they can handle in their app definition using the `"intents"` top-level key and supplying a handler function via the [`addIntentListener()`](../../reference/core/latest/intents/index.html#API-addIntentListener) method, or at runtime using only the [`addIntentListener()`](../../reference/core/latest/intents/index.html#API-addIntentListener) method. Using the app definition to register an Intent allows the app to be targeted as an Intent handler even if it isn't currently running. If the app is registered as an Intent handler at runtime, it can act as an Intent handler only during its life span.

The **Portfolio Downloader** app is already registered as an Intent handler in the `applicationsReact.json` file located in the `/rest-server/data` directory. The only required property is the `name` of the Intent, but you can optionally specify a display name (e.g., `"Download Portfolio"`, which can later be used in a dynamically generated UI) and a context (predefined data structure, e.g. `"ClientPortfolio"`) with which the app can work:

```json
// In `applicationsReact.json`.

{
    "name": "Portfolio Downloader",
    "type": "window",
    "details": {
        "url": "http://localhost:9400/"
    },
    // Configuration for handling Intents.
    "intents": [
        {
            "name": "ExportPortfolio",
            "displayName": "Download Portfolio",
            "contexts": [
                "ClientPortfolio"
            ]
        }
    ]
}
```

Go to the `glue.js` file of the **Portfolio Downloader** app. In the `setupIntentListener()` function pass the name of the Intent and the already implemented `intentHandler()` function to the [`addIntentListener()`](../../reference/core/latest/intents/index.html#API-addIntentListener) method, so that it will be called whenever the **Portfolio Downloader** app is targeted as an Intent handler by the user:

```javascript
export const setupIntentListener = (setClientName) => (glue) => {
    const intentHandler = (context) => {

        if (context.type !== "ClientPortfolio") {
            return;
        };

        setClientName(context.data.clientName);
        startPortfolioDownload(context.data.clientName, context.data.portfolio);
    };

    // Pass `intentHandler()` to the `addIntentListener()` method.
    glue.intents.addIntentListener("ExportPortfolio", intentHandler);
};
```

### 10.2 Raising an Intent

The **Stocks** app must raise an Intent request when the user clicks a button for exporting the portfolio of the selected client.

Go to the `<Stocks />` component and uncomment the "Export Portfolio" button.

Go to the `glue.js` file of the **Stocks** app and define a `raiseExportPortfolioIntentRequest()` function. Perform a check whether an Intent with the name `"ExportPortfolio"` exists. If so, create an [Intent request object](../../reference/core/latest/intents/index.html#IntentRequest-target) holding the name of the Intent and specifying targeting behavior and context for it. Use the [`raise()`](../../reference/core/latest/intents/index.html#API-raise) method to raise an Intent and pass the Intent request object to it:

```javascript
const raiseExportPortfolioIntentRequest = (glue) => async (portfolio, clientName) => {
    try {
        const intents = await glue.intents.find("ExportPortfolio");

        if (!intents) {
            return;
        };

        const intentRequest = {
            intent: "ExportPortfolio",
            context: {
                type: "ClientPortfolio",
                data: { portfolio, clientName }
            }
        };

        await glue.intents.raise(intentRequest);

    } catch (error) {
        console.error(error.message);
    };
};
```

Import the `raiseExportPortfolioIntentRequest()` function in the `<Stocks />` component and pass it to the `useGlue()` hook. Store the returned handler function in a variable and assign it to the `onClick` property of the "Export Portfolio" button. Pass the portfolio and the name of the client as arguments:

```javascript
// Import the raiseExportPortfolioIntentRequest() function.
import { raiseExportPortfolioIntentRequest } from "./glue";

// Pass it to useGlue() and store the returned handler.
const exportPortfolioButtonHandler = useGlue(raiseExportPortfolioIntentRequest);

return(
        ...
        <button
            type="button"
            className="mb-3 btn btn-primary"
            // Pass the handler to the onClick() event with portfolio and clientName arguments.
            onClick={() => exportPortfolioButtonHandler(portfolio, clientName)}
        >
            Export Portfolio
        </button>
        ...
)
```

Now, clicking on the "Export Portfolio" button will start the **Portfolio Downloader** app which will start downloading the portfolio of the currently selected client in JSON format.

## 11. Notifications

A new requirement from the users is to display a notification whenever a new Workspace has been opened. The notification must contain information for which client is the opened Workspace. Clicking on the notification must focus the Workspaces App and the Workspace for the respective client. You will use the [Notifications API](../../reference/core/latest/notifications/index.html) to raise a notification when the user clicks on a client to open a Workspace. To the notification `onclick` property, you will assign a handler for focusing the Workspaces App and the Workspace for the respective client. The handler will be invoked when the user clicks on the notification.

*Note that you must allow the Main app to send notifications from the browser and also allow receiving notifications from your OS settings, otherwise you won't be able to see the raised notifications.*

*Note that the notifications that will be raised won't contain action buttons. Notifications with action buttons require [configuring a service worker](../../capabilities/notifications/setup/index.html#configuration), which is beyond the scope of this tutorial.*

*See also the [Capabilities > Notifications](../../capabilities/notifications/setup/index.html) documentation.*

### 11.1 Raising a Notification

Go to the `glue.js` file of the **Clients** app and define a `raiseNotificationOnWorkspaceOpen()` function. Define an object holding a title and body for the notification. Use the [`raise()`](../../reference/core/latest/notifications/index.html#API-raise) method to raise a notification and pass the object with options to it:

```javascript
const raiseNotificationOnWorkspaceOpen = async (glue, clientName, workspace) => {
    const options = {
        title: "New Workspace",
        body: `A new Workspace for ${clientName} was opened!`,
    };

    const notification = await glue.notifications.raise(options);
};
```

Next, go to the `startAppWithWorkspace()` function and modify the existing code to call the `raiseNotificationOnWorkspaceOpen()` function and pass to it the `glue` object, the client name and the previously obtained [`Workspace`](../../reference/core/latest/workspaces/index.html#Workspace) object:

```javascript
// In `startAppWithWorkspace()`.

try {
    const workspace = await glue.workspaces.restoreWorkspace("Client Space", restoreConfig);

    await raiseNotificationOnWorkspaceOpen(glue, client.name, workspace);
} catch (error) {
    console.error(error.message);
};
```

Now, a notification will be raised whenever a new Workspace has been opened.

### 11.2 Notification Handler

Go to the `raiseNotificationOnWorkspaceOpen()` function and use the `onclick` property of the previously obtained [`Notification`](../../reference/core/latest/notifications/index.html#Notification) object to assign a handler for focusing the Workspaces App and the Workspace for the respective client:

```javascript
// In `raiseNotificationOnWorkspaceOpen()`.

notification.onclick = () => {
    // This will focus the Workspaces App.
    workspace.frame.focus().catch(console.error);
    // This will focus the Workspace for the respective client.
    workspace.focus().catch(console.error);
};
```

Now, when the user clicks on a notification, the Workspaces App and the Workspace for the respective client will be focused.

## Congratulations!

You have successfully completed the [**Glue42 Core**](https://glue42.com/core/) React tutorial! See also the [JavaScript](../javascript/index.html) and [Angular](../angular/index.html) tutorials for [**Glue42 Core**](https://glue42.com/core/).