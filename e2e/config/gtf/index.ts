import "regenerator-runtime/runtime";
import { GtfCore } from "./core";
import { GtfAgm } from "./agm";
import { GtfChannels } from "./channels";
import { GtfAppManager } from "./appManager";
import { GtfIntents } from './intents';
import { GtfLogger } from "./logger";
import { GtfConnection } from "./connection";
import { GtfWindows } from "./windows";
import { Glue42Web } from "../../../packages/web/web.d";
import { Glue42WebPlatform, Glue42WebPlatformFactoryFunction } from "../../../packages/web-platform/platform.d";
import { WorkspacesFactoryFunction } from "../../../packages/workspaces-api/workspaces";
import { GlueSearchFactoryFunction } from "../../../packages/search-api/search";
// TODO: Add building and serving the Workspaces application to the e2e script.
import { channelsConfig, localApplicationsConfig } from "./config";
import sinon from "sinon";
import { GtfPuppet } from "./puppet";
import { GtfContexts } from './contexts';
import { GtfFdc3 } from './fdc3/fdc3';

// Make the RUNNER environment variable available inside of the tests (resolved during the gtf build process) and set it as window title.
const RUNNER = process.env.RUNNER;
window.RUNNER = RUNNER;
document.title = RUNNER;

console.log(`Runner in GTF: ${RUNNER}`);

const runningMode = process.env.RUNNER;

declare const window: any;
declare const GlueWorkspaces: WorkspacesFactoryFunction;
declare const GlueSearch: GlueSearchFactoryFunction;
declare const GlueWebPlatform: Glue42WebPlatformFactoryFunction;

const getBaseGluePlatformConfig = (): Glue42WebPlatform.Config => {
    const glueWebConfig: Glue42Web.Config = {
        libraries: [GlueWorkspaces, GlueSearch],
        systemLogger: { level: "error" }
    };

    const gluePlatformConfig: Glue42WebPlatform.Config = {
        // TODO: Test supplier and remote applications modes.
        applications: {
            local: localApplicationsConfig
        },
        layouts: {
            mode: "session"
        },
        channels: channelsConfig,
        glue: glueWebConfig,
        workspaces: {
            // TODO: Add building and serving the Workspaces application to the e2e script.
            src: "http://localhost:7654"
        },
        serviceWorker: {
            registrationPromise: setupNotifications()
        },
        gateway: {
            logging: {
                level: "error"
            }
        },
        environment: {
            test: 42,
            testObj: {
                test: 42
            },
            testArr: [42]
        }
    };

    return gluePlatformConfig;
}

const baseGlueSetup = async (): Promise<Glue42Web.API> => {
    const gluePlatformConfig = getBaseGluePlatformConfig();

    const { glue, platform } = await (GlueWebPlatform as (config?: Glue42WebPlatform.Config) => Promise<{ glue: Glue42Web.API, platform: Glue42WebPlatform.API }>)(gluePlatformConfig);

    window.glue = glue;
    window.platform = platform;

    return glue;
}

const setupNotifications = () => {
    window.notificationsFakeTriggerClick = false;
    window.notificationsFakePermission = "granted";

    window.sinonSandbox = sinon.createSandbox();

    window.showNotificationFake = window.sinonSandbox.fake.resolves({});
    window.notificationConstructorFake = window.sinonSandbox.fake();

    window.Notification = class FakeNotification {
        constructor(title: string, options: any) {
            window.notificationConstructorFake(title, options);

            setTimeout(() => {
                if (window.notificationsFakeTriggerClick) {
                    const fakeEvent = {
                        target: options
                    };

                    this.onclick(fakeEvent);
                }
            }, 200);
        }

        static requestPermission() {
            return window.notificationsFakePermission;
        }

        static get permission() {
            return window.notificationsFakePermission;
        }

        onclick: any;
    };

    const fakeSwRegistration = new Promise<ServiceWorkerRegistration>((resolve) => resolve({ showNotification: window.showNotificationFake } as ServiceWorkerRegistration));

    return fakeSwRegistration;
};

const startPuppetGtf = async () => {

    const gtfCore = new GtfCore();

    window.gtf = Object.assign(
        gtfCore,
        { puppet: new GtfPuppet() },
        { contexts: new GtfContexts() }
    );

    await window.gtf.puppet.start();
};

const startGtf = async () => {
    const glue = await baseGlueSetup();

    const gtfCore = new GtfCore(glue);
    const gtfLogger = new GtfLogger(glue);

    gtfLogger.patchLogMessages();
    await gtfLogger.register();

    window.gtf = Object.assign(
        gtfCore,
        { agm: new GtfAgm(glue) },
        { channels: new GtfChannels(glue) },
        { appManager: new GtfAppManager(glue) },
        { intents: new GtfIntents(glue) },
        { connection: new GtfConnection() },
        { windows: new GtfWindows(glue) },
        { contexts: new GtfContexts() }
    );
};

const getGtfWithFdc3 = (gtfCore: GtfCore, glue: Glue42Web.API) => {
    return Object.assign(
        gtfCore,
        { fdc3: new GtfFdc3(glue) },
        { appManager: new GtfAppManager(glue) },
        { channels: new GtfChannels(glue) },
        { intents: new GtfIntents(glue) },
        { contexts: new GtfContexts() }
    );
}

const startFdc3Gtf = async (): Promise<void> => {
    const fdc3ReadyPromise = new Promise<void>((resolve) => {
        if (window.fdc3) {
            resolve();
        }

        window.addEventListener("fdc3Ready", resolve);
    });

    await fdc3ReadyPromise;

    const glue = await baseGlueSetup();

    const gtfCore = new GtfCore(glue);

    window.gtf = getGtfWithFdc3(gtfCore, glue);
}

if (runningMode === "Puppet") {
    window.coreReady = startPuppetGtf();
} else if (runningMode === "Fdc3") {
    window.coreReady = startFdc3Gtf();
} else {
    window.coreReady = startGtf();
}
