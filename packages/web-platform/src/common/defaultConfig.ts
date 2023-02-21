import { InternalPlatformConfig } from "./types";

export const defaultPlatformConfig: InternalPlatformConfig = {
    windows: {
        windowResponseTimeoutMs: 10000,
        defaultWindowOpenBounds: {
            top: 0,
            left: 0,
            width: 800,
            height: 600
        }
    },
    notifications: {
        enable: true,
        enableToasts: true,
        clearNotificationOnClick: true
    },
    applications: {
        local: []
    },
    layouts: {
        mode: "idb",
        local: []
    },
    channels: {
        definitions: []
    },
    plugins: {
        definitions: []
    },
    gateway: {
        logging: {
            level: "info"
        }
    },
    connection: {},
    glue: {},
    environment: {},
    workspacesFrameCache: true
};

export const defaultTargetString = "*";

export const defaultFetchTimeoutMs = 3000;

export const defaultOpenerTimeoutMs = 1000;

export const defaultPreferredDiscoveryIntervalMS = 15000;

export const defaultClientPortRequestTimeoutMS = 15000;

export const defaultClientPreferredLogicTestTimeoutMS = 5000;