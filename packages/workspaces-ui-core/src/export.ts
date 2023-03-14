/* eslint-disable @typescript-eslint/no-unused-vars */
import manager from "./manager";
import facade from "./interop/facade";
import jquery from "jquery";
import { Glue42Web } from "@glue42/web";
import startupReader from "./config/startupReader";
import { WorkspacesManager } from "../workspaces";
import { ComponentFactory } from "./types/componentFactory";
import { Bounds } from "./types/internal";

declare const window: Window & { glue: Glue42Web.API; $: JQueryStatic };

window.$ = jquery;
let done: () => void;

window.addEventListener("beforeunload", () => {
    facade.dispose();
    if (done) {
        done();
    }
});

const init = (glue: Glue42Web.API, componentFactory?: ComponentFactory) => {
    const isInitialized = manager.initialized;
    if (isInitialized) {
        manager.init(glue, glue.agm.instance.windowId, facade, componentFactory);
        return;
    }
    facade.subscribeForWorkspaceEvents();

    const result = manager.init(glue, glue.agm.instance.windowId, facade, componentFactory);

    done = result.cleanUp;
    facade.init(glue, glue.agm.instance.windowId).then(() => {
        if (!startupReader.config.emptyFrame) {
            manager.workspacesEventEmitter.raiseFrameEvent({ action: "opened", payload: { frameSummary: { id: glue.agm.instance.windowId }, frameBounds: manager.stateResolver.getFrameBounds() } });
        }
    }).catch(console.warn);

    return manager;
};


const workspacesManagerAPI: WorkspacesManager = {
    init,
    getFrameId: () => {
        return manager.frameId;
    },
    notifyMoveAreaChanged: () => {
        return;
    },
    getComponentBounds: () => {
        return manager.getComponentBounds();
    },
    registerPopup: (element: HTMLElement) => {
        return "";
    },
    removePopup: (element: HTMLElement) => {
        return;
    },
    removePopupById: (element: string) => {
        return;
    },
    unmount: () => {
        manager.unmount();
        return;
    },
    subscribeForWindowFocused: (callback: () => void) => {
        return manager.subscribeForWindowClicked(callback);
    },
    notifyWorkspacePopupChanged: (element: HTMLElement) => {
        return;
    },
    requestFocus: () => {
        return;
    },
    closeWorkspace: (id: string) => {
        manager.closeItem(id);
    },
    showSaveWorkspacePopup: (workspaceId: string, bounds: Bounds) => {
        manager.showSaveWorkspacePopup(workspaceId, bounds);
    },
    closeWindow: (id: string) => {
        manager.closeItem(id);
    },
    restoreGroup: (id: string) => {
        manager.restoreItem(id);
    },
    maximizeGroup: (id: string) => {
        manager.maximizeItem(id);
    },
    ejectActiveWindow: (id: string) => {
        manager.ejectActiveWindow(id);
    },
    showChannelsSelector: (placementId: string, bounds: Bounds) => {
        manager.showChannelsSelector(placementId, bounds);
    },
    showAddApplicationPopup: (groupId: string, bounds: Bounds) => {
        manager.showAddWindowPopup(groupId, bounds);
    }
};

export default workspacesManagerAPI;
