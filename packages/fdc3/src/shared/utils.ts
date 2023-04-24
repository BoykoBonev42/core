import { Listener, DesktopAgent } from '@finos/fdc3';
import { nanoid } from 'nanoid';

export const isInElectron = navigator.userAgent.toLowerCase().includes(" electron/");

export const isInGdContainer = navigator.userAgent.toLowerCase().includes(" tick42-glue-desktop/");

export const fetchTimeout = (url: string, timeoutMilliseconds = 3000): Promise<Response> => {
    return new Promise((resolve, reject) => {
        let timeoutHit = false;
        const timeout = setTimeout(() => {
            timeoutHit = true;
            reject(new Error(`Fetch request for: ${url} timed out at: ${timeoutMilliseconds} milliseconds`));
        }, timeoutMilliseconds);

        fetch(url)
            .then((response) => {
                if (!timeoutHit) {
                    clearTimeout(timeout);
                    resolve(response);
                }
            })
            .catch((err) => {
                if (!timeoutHit) {
                    clearTimeout(timeout);
                    reject(err);
                }
            });
    });
};

export const isValidNonEmptyObject = (obj: object): boolean => {
    return typeof obj === "object" && !Array.isArray(obj) && Object.keys(obj).length !== 0;
};

export const AsyncListener = (actualUnsub:
    (() => void)
    | Promise<() => void>
): Listener => {
    return {
        unsubscribe(): void {
            if (!actualUnsub) {
                console.error("Failed to unsubscribe!");
                return;
            }

            if (typeof actualUnsub === "function") {
                actualUnsub();
            } else {
                (actualUnsub as Promise<() => void>).then((unsubFunc: () => void) => unsubFunc()).catch(console.error);
            }
        }
    };
};

export const checkIfInElectron = (globalFdc3: DesktopAgent) => {
    /* if we are running Electron with contextIsolated */
    const hasGlue42electron = typeof window !== "undefined" && "glue42electron" in window;

    if (!hasGlue42electron) {
        return;
    }

    const runningInElectron = typeof process !== "undefined" &&  "contextIsolated" in process;

    if (runningInElectron) {
        const contextBridge = require("electron").contextBridge;
        
        contextBridge.exposeInMainWorld("fdc3", globalFdc3);
    }
}

export const promisePlus = <T>(promise: () => Promise<T>, timeoutMilliseconds: number, timeoutMessage?: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {

        const timeout = setTimeout(() => {

            const message = timeoutMessage || `Promise timeout hit: ${timeoutMilliseconds}`;

            reject(message);
        }, timeoutMilliseconds);

        promise()
            .then((result) => {
                clearTimeout(timeout);
                resolve(result);
            })
            .catch((error) => {
                clearTimeout(timeout);
                reject(error);
            });
    });
};

export const generateCommandId = (): string => {
    return nanoid();
}