import { Bounds } from "./types/internal";
import callbackRegistry, { UnsubscribeFunction } from "callback-registry";
import { Glue42Web } from "@glue42/web";
import { generateWindowId } from "./utils";
import { PlatformCommunicator } from "./interop/platformCommunicator";

export class IFrameController {
    private readonly _registry = callbackRegistry();
    private _idToFrame: { [k: string]: HTMLIFrameElement } = {};
    private readonly _glue: Glue42Web.API;
    private readonly _platformCommunicator: PlatformCommunicator;

    constructor(glue: Glue42Web.API, platformCommunicator: PlatformCommunicator) {
        this._glue = glue;
        this._platformCommunicator = platformCommunicator;
    }

    public async startFrame(id: string, url: string, layoutState?: object, windowId?: string): Promise<HTMLIFrameElement> {
        return this.startCore(id, url, layoutState, windowId);
    }

    public moveFrame(id: string, bounds: Bounds): void {
        const frame = this._idToFrame[id];
        const jFrame = $(frame);

        if (bounds.width !== 0 && bounds.height !== 0) {
            jFrame.css("top", `${bounds.top}px`);
            jFrame.css("left", `${bounds.left}px`);
        }

        jFrame.css("width", `${bounds.width}px`);
        jFrame.css("height", `${bounds.height}px`);
    }

    // The windows which are send to the back must be first
    public selectionChanged(toFront: string[], toBack: string[]): void {
        toBack.forEach(id => {
            $(this._idToFrame[id]).css("z-index", "-1");
        });

        toFront.forEach(id => {
            if ($(this._idToFrame[id]).hasClass("maximized-active-tab")) {
                $(this._idToFrame[id]).css("z-index", this.getMaximizedFrameZIndex());
            } else {
                $(this._idToFrame[id]).css("z-index", "19");
            }
        });
    }

    public maximizeTab(id: string): void {
        $(this._idToFrame[id]).addClass("maximized-active-tab");
    }

    public restoreTab(id: string): void {
        $(this._idToFrame[id]).removeClass("maximized-active-tab");
    }

    public selectionChangedDeep(toFront: string[], toBack: string[]): void {
        toBack.forEach(id => {
            // The numbers is based on the z index of golden layout elements
            $(this._idToFrame[id]).css("z-index", "-1");
        });

        toFront.forEach(id => {
            if ($(this._idToFrame[id]).hasClass("maximized-active-tab")) {
                // The numbers is based on the z index of golden layout elements
                $(this._idToFrame[id]).css("z-index", "42");
            } else {
                // The numbers is based on the z index of golden layout elements
                $(this._idToFrame[id]).css("z-index", "19");
            }
        });
    }

    public bringToFront(id: string): void {
        // Z index is this high to guarantee top most position
        $(this._idToFrame[id]).css("z-index", "999");
    }

    public remove(id: string): void {
        const frame = this._idToFrame[id];
        if (frame) {
            delete this._idToFrame[id];
            this._platformCommunicator.isOperationSupported({ domain: "system", operation: "cleanupClientsOnWorkspaceFrameUnregister" })
                .then((isOperationSupported) => {
                    if (!isOperationSupported) {
                        frame.contentWindow.postMessage({
                            glue42core: {
                                type: "manualUnload"
                            }
                        }, "*");
                    }
                    setTimeout(() => {
                        frame.remove();
                        this._registry.execute("frame-removed", id);
                    }, 0);
                });
        }
    }

    public onFrameLoaded(callback: (frameId: string) => void): UnsubscribeFunction {
        return this._registry.add("frameLoaded", callback);
    }

    public onFrameRemoved(callback: (frameId: string) => void): UnsubscribeFunction {
        return this._registry.add("frame-removed", callback);
    }

    public onFrameContentClicked(callback: () => void): UnsubscribeFunction {
        return this._registry.add("frame-content-clicked", callback);
    }

    public onWindowTitleChanged(callback: (id: string, newTitle: string) => void): UnsubscribeFunction {
        return this._registry.add("window-title-changed", callback);
    }

    public hasFrame(id: string): boolean {
        return !!this._idToFrame[id];
    }

    public getWindowId(id: string): string {
        if (!this.hasFrame(id)) {
            return undefined;
        }
        return this._idToFrame[id].name.split("#wsp")[0];
    }

    private async startCore(id: string, url: string, layoutState?: object, windowId?: string): Promise<HTMLIFrameElement> {
        windowId = windowId || generateWindowId();
        if (this._idToFrame[id]) {
            return this._idToFrame[id];
        }

        if (!url) {
            throw new Error(`The url of window with itemId ${id} is undefined`);
        }

        const frame: HTMLIFrameElement = document.createElement("iframe");
        frame.name = `${windowId}#wsp`;
        (frame as any).loading = "lazy";
        frame.style.top = "30000px";
        frame.style.width = "30000px";
        frame.style.width = "0px";
        frame.style.height = "0px";
        frame.src = url;

        const inExt = (new URL(location.href)).protocol.includes("extension");

        if (inExt) {
            frame.setAttribute("sandbox", "allow-forms allow-scripts allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin");
        }

        document.body.appendChild(frame);

        this._registry.execute("frameLoaded", id);

        frame.setAttribute("id", id);
        $(frame).css("position", "absolute");

        this._idToFrame[id] = frame;
        await this.waitForWindow(windowId);

        return frame;
    }

    private waitForWindow(windowId: string): Promise<void> {
        return new Promise<void>((res, rej) => {
            let unsub = (): void => {
                // safety
            };
            const timeout = setTimeout(() => {
                rej(`Window with id ${windowId} did not appear in 5000ms`);
                unsub();
            }, 5000);

            unsub = this._glue.windows.onWindowAdded((w) => {
                if (w.id === windowId) {
                    unsub();
                    res();
                    clearTimeout(timeout);
                }
            });

            const glueWindow = this._glue.windows.list().find((w) => w.id === windowId);
            if (glueWindow) {
                res();
                unsub();
                clearTimeout(timeout);
            }
        });

    }

    private getMaximizedFrameZIndex(): string {
        return "42";
    }
}
