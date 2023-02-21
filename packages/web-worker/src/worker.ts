/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42WebWorkerFactoryFunction, WebWorkerConfig } from "../web.worker";
import { dbName, dbVersion, platformOpenTimeoutMS, platformPingTimeoutMS, serviceWorkerBroadcastChannelName } from "./constants";
import { webWorkerConfigDecoder } from "./decoders";
import { nanoid } from "nanoid";
import { IDBPDatabase, openDB } from "idb";

let openDbPromise: Promise<IDBPDatabase<any>>;

const trimUrlQueryHashAndTrailingSlash = (url: string): string => {
    const trimmedQueryHash = url.split("?")[0].split("#")[0];
    const trimmedTrailingSlash = trimmedQueryHash.replace(/\/$/, "");

    return trimmedTrailingSlash;
};

const startDb = (): Promise<IDBPDatabase<any>> => {
    if (openDbPromise) {
        return openDbPromise;
    }

    openDbPromise = openDB<any>(dbName, dbVersion, {
        upgrade: (db: IDBPDatabase<any>) => {
            if (!db.objectStoreNames.contains("workspaceLayouts")) {
                db.createObjectStore("workspaceLayouts");
            }

            if (!db.objectStoreNames.contains("globalLayouts")) {
                db.createObjectStore("globalLayouts");
            }

            if (!db.objectStoreNames.contains("serviceWorker")) {
                db.createObjectStore("serviceWorker");
            }
        }
    });

    return openDbPromise;
};

const checkPlatformOpen = (): Promise<boolean> => {
    const checkPromise = new Promise<boolean>((resolve) => {
        const channel = new BroadcastChannel(serviceWorkerBroadcastChannelName);

        const existenceHandler = function (event: any): void {
            const data = event.data;
            // check to see if somehow I have reference to the client that answers
            if (data.pong) {
                channel.removeEventListener("message", existenceHandler);
                resolve(true);
            }
        };

        channel.addEventListener("message", existenceHandler);

        channel.postMessage({ messageType: "ping" });
    });

    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), platformPingTimeoutMS));

    return Promise.race([checkPromise, timeoutPromise]);
};

const getPlatformUrl = async (config: WebWorkerConfig): Promise<string | undefined> => {
    if (config.platform?.url) {
        const url = config.platform.url.split("?")[0].split("#")[0];
        console.debug(`getting url from config: ${url}`);
        return trimUrlQueryHashAndTrailingSlash(url);
    }

    console.debug("starting the db");
    const db = await startDb();

    if (!db.objectStoreNames.contains("serviceWorker")) {
        console.warn("there is no service worker store");
        return;
    }

    const workerData = await db.get("serviceWorker", "workerData");

    const url = workerData?.platformUrl?.split("?")[0].split("#")[0];

    return trimUrlQueryHashAndTrailingSlash(url);
};

const validateConfig = (config: WebWorkerConfig = {}): WebWorkerConfig => {
    const validated: WebWorkerConfig = webWorkerConfigDecoder.runWithException(config);

    if (validated.platform?.url) {
        validated.platform.url = validated.platform.url.replace(/\/$/, "");
    }

    return validated;
};

export const raiseGlueNotification = async (settings: any): Promise<void> => {

    const options = Object.assign({}, settings, { title: undefined, clickInterop: undefined, actions: undefined });

    options.actions = settings.actions?.map((action: any) => {
        return {
            action: action.action,
            title: action.title,
            icon: action.icon
        };
    });

    const glueData = {
        clickInterop: settings.clickInterop,
        actions: settings.actions,
        id: nanoid()
    };

    if (options.data) {
        options.data.glueData = glueData;
    } else {
        options.data = { glueData };
    }

    return (self as any).registration.showNotification(settings.title, options);
};

export const openCorePlatform = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {

        if (!url) {
            return reject("Cannot open the platform, because a url was not provided");
        }

        const channel = new BroadcastChannel(serviceWorkerBroadcastChannelName);

        const openHandler = function (event: any): void {
            const data = event.data;

            if (data.platformStarted) {
                channel.removeEventListener("message", openHandler);
                resolve();
            }
        };

        channel.addEventListener("message", openHandler);

        (self as any).clients.openWindow(url).catch(reject);

        setTimeout(() => reject(`Timed out waiting for the platform to open and send a ready signal: ${platformOpenTimeoutMS} MS`), platformOpenTimeoutMS);
    });
};

export const focusCorePlatform = async (url: string): Promise<void> => {
    if (!url) {
        console.warn("Cannot open the platform, because a url was not provided");
        return;
    }

    const allWindows = await (self as any).clients.matchAll({ type: "window" });

    for (const client of allWindows) {

        const urlStrippedQueryHash = client.url.split("?")[0].split("#")[0];
        const urlStrippedTrailingSlash = urlStrippedQueryHash.replace(/\/$/, "");

        if (urlStrippedTrailingSlash === url) {

            await client.focus();
            return;
        }
    }
};

export const setupCore: Glue42WebWorkerFactoryFunction = (config?: WebWorkerConfig): void => {
    const verifiedConfig = validateConfig(config);

    self.addEventListener("notificationclick", (event: any) => {
        let isPlatformOpen: boolean;

        const channel = new BroadcastChannel(serviceWorkerBroadcastChannelName);

        console.debug("Received a notification, checking if the platform is open");

        const executionPromise = checkPlatformOpen()
            .then((platformExists: boolean) => {

                isPlatformOpen = platformExists;

                console.debug(`The platform is: ${isPlatformOpen ? "open" : "not open"}`);

                const action = event.action;

                if (!action && verifiedConfig.notifications?.defaultClick) {
                    console.debug("Calling a defined default click handler");
                    return verifiedConfig.notifications.defaultClick(event, isPlatformOpen);
                }

                if (action && verifiedConfig.notifications?.actionClicks?.some((actionDef) => actionDef.action === action)) {
                    const foundHandler = verifiedConfig.notifications.actionClicks.find((actionDef) => actionDef.action === action).handler;
                    console.debug(`Calling a defined action click handler for action: ${action}`);
                    return foundHandler(event, isPlatformOpen);
                }
            })
            .then(() => {
                console.debug("Getting the platform url");
                return getPlatformUrl(verifiedConfig);
            })
            .then((url) => {

                console.debug(`Found platform url: ${url}`);

                if (!isPlatformOpen && verifiedConfig.platform?.openIfMissing) {
                    console.debug("Opening the platform");
                    return openCorePlatform(url);
                }

                const focusOnClick = (event as any).notification.data?.glueData?.focusPlatformOnDefaultClick;

                if (isPlatformOpen && focusOnClick) {
                    console.debug("Focusing the platform");
                    return focusCorePlatform(url);
                }
            })
            .then(() => {
                const messageType = "notificationClick";

                const action = (event as any).action;
                const glueData = (event as any).notification.data.glueData;

                const definition = {
                    badge: (event as any).notification.badge,
                    body: (event as any).notification.body,
                    data: (event as any).notification.data,
                    dir: (event as any).notification.dir,
                    icon: (event as any).notification.icon,
                    image: (event as any).notification.image,
                    lang: (event as any).notification.lang,
                    renotify: (event as any).notification.renotify,
                    requireInteraction: (event as any).notification.requireInteraction,
                    silent: (event as any).notification.silent,
                    tag: (event as any).notification.tag,
                    timestamp: (event as any).notification.timestamp,
                    vibrate: (event as any).notification.vibrate
                };

                channel.postMessage({ messageType, action, glueData, definition });
            })
            .catch((error) => {
                const stringError = typeof error === "string" ? error : JSON.stringify(error.message);
                channel.postMessage({ messageType: "notificationError", error: stringError });
            });

        event.waitUntil(executionPromise);
    });

    self.addEventListener("notificationclose", (event: any) => {
        const channel = new BroadcastChannel(serviceWorkerBroadcastChannelName);

        console.debug("Received a notification close event, checking if the platform is open");

        const executionPromise = checkPlatformOpen()
            .then((platformExists: boolean) => {

                console.debug(`The platform is: ${platformExists ? "open" : "not open"}`);

                if (!platformExists) {
                    console.log("The platform is not opened and will not open it for a notification close event");
                    return;
                }

                const messageType = "notificationClose";

                const action = (event as any).action;
                const glueData = (event as any).notification.data.glueData;

                const definition = {
                    badge: (event as any).notification.badge,
                    body: (event as any).notification.body,
                    data: (event as any).notification.data,
                    dir: (event as any).notification.dir,
                    icon: (event as any).notification.icon,
                    image: (event as any).notification.image,
                    lang: (event as any).notification.lang,
                    renotify: (event as any).notification.renotify,
                    requireInteraction: (event as any).notification.requireInteraction,
                    silent: (event as any).notification.silent,
                    tag: (event as any).notification.tag,
                    timestamp: (event as any).notification.timestamp,
                    vibrate: (event as any).notification.vibrate
                };

                channel.postMessage({ messageType, action, glueData, definition });
            })
            .catch((error) => {
                const stringError = typeof error === "string" ? error : JSON.stringify(error.message);
                channel.postMessage({ messageType: "notificationError", error: stringError });
            });

        event.waitUntil(executionPromise);
    });
};
