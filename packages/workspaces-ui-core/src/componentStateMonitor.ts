/* eslint-disable @typescript-eslint/no-explicit-any */
//tslint:disable-next-line:no-var-requires
import { ComponentFactory, CreateGroupHeaderButtonsOptions, CreateWorkspaceTabsOptions, CreateWorkspaceWindowTabsOptions, DecoratedFactory, VisibilityState } from "./types/componentFactory";
import createRegistry from "callback-registry";
const shortid = require("shortid");
import { idAsString } from "./utils";
import { AddWindowButtonLabel, EjectButtonLabel, GroupHeaderMaximizeLabel, GroupHeaderRestoreLabel, WorkspaceWindowCloseButtonLabel } from "./utils/constants";
import uiExecutor from "./uiExecutor";

class ComponentStateMonitor {
    private readonly _visibilityState: VisibilityState = {
        logo: undefined,
        workspaceTabs: {},
        addWorkspace: undefined,
        systemButtons: undefined,
        workspaceContents: {},
        beforeGroupTabs: {},
        workspaceWindowTabs: {},
        afterGroupTabs: {},
        groupHeaderButtons: {},
    };

    private _lastSelectedWorkspaceTab: CreateWorkspaceTabsOptions;
    private _lastSelectedWorkspaceWindowTab: { [groupId: string]: CreateWorkspaceWindowTabsOptions } = {};

    private _callbackRegistry = createRegistry();

    private _componentsFactory: ComponentFactory = {};
    private readonly _decoratedFactory: DecoratedFactory = {};
    private readonly _observer = new MutationObserver((mutations) => {
        Array.from(mutations).forEach((m) => {
            const targetDiv = m.target as HTMLDivElement;

            const workspaceId = this.getWorkspaceIdFromContents(targetDiv);
            const action = targetDiv.style.display === "none" ? "workspace-contents-hidden" : "workspace-contents-shown";
            this._callbackRegistry.execute(action, workspaceId);
        });
    });

    public get decoratedFactory(): DecoratedFactory {
        return this._decoratedFactory;
    }

    public init(frameId: string, componentsFactory?: ComponentFactory): void {
        this._componentsFactory = componentsFactory;
        if (componentsFactory?.createAddWorkspace) {
            this.decoratedFactory.createAddWorkspace = (args) => {
                args.frameId = frameId;
                this._visibilityState.addWorkspace = args;

                return this._componentsFactory.createAddWorkspace(args);
            };
        }

        if (componentsFactory?.createWorkspaceTabs) {
            this.decoratedFactory.createWorkspaceTabs = (args) => {
                if (args.isSelected === true) {
                    this.changeSelectedWorkspaceState(args);
                }

                const previousEntry = this._visibilityState.workspaceTabs[args.workspaceId] ?? {};
                this._visibilityState.workspaceTabs[args.workspaceId] = { ...previousEntry, ...args };

                this.setupCleanup(this._componentsFactory.removeWorkspaceTabs, "workspaceTabs", args.workspaceId, undefined, undefined, args.workspaceId);
                return componentsFactory.createWorkspaceTabs(args);
            };
        }

        if (componentsFactory?.createLogo) {
            this.decoratedFactory.createLogo = (args) => {
                args.frameId = frameId;
                this._visibilityState.logo = args;

                return this._componentsFactory.createLogo(args);
            };
        }

        if (componentsFactory?.createSystemButtons) {
            this.decoratedFactory.createSystemButtons = (args) => {
                args.frameId = frameId;
                this._visibilityState.systemButtons = args;

                return componentsFactory.createSystemButtons(args);
            };
        }

        if (componentsFactory?.createWorkspaceContents) {
            this.decoratedFactory.createWorkspaceContents = (args) => {
                const visibilityStateEntry = args;
                this._visibilityState.workspaceContents[args.workspaceId] = (visibilityStateEntry);

                const unsub = this.onWorkspaceClosed(args.workspaceId, () => {
                    this.cleanupWorkspaceContents(args.workspaceId);
                    unsub();
                });

                this.subscribeForWorkspaceContentsVisibility(args.workspaceId);
                return componentsFactory.createWorkspaceContents(args);
            };
        }

        if (componentsFactory?.createBeforeGroupTabs) {
            this.decoratedFactory.createBeforeGroupTabs = (args) => {
                this._visibilityState.beforeGroupTabs[args.groupId] = args;
                this.setupCleanup(this._componentsFactory.removeBeforeGroupTabs, "beforeGroupTabs", args.groupId, undefined, args.groupId, args.workspaceId);

                return componentsFactory.createBeforeGroupTabs(args);
            };
        }

        if (componentsFactory?.createWorkspaceWindowTabs) {
            this.decoratedFactory.createWorkspaceWindowTabs = (args) => {
                if (args.isSelected === true) {
                    this.changeSelectedWorkspaceWindowState(args);
                }
                this._visibilityState.workspaceWindowTabs[args.placementId] = args;
                this.setupCleanup(this._componentsFactory.removeWorkspaceWindowTabs, "workspaceWindowTabs", args.placementId, args.placementId, args.groupId, args.workspaceId);

                return componentsFactory.createWorkspaceWindowTabs(args);
            };
        }

        if (componentsFactory?.createAfterGroupTabs) {
            this.decoratedFactory.createAfterGroupTabs = (args) => {
                this._visibilityState.afterGroupTabs[args.groupId] = args;
                this.setupCleanup(this._componentsFactory.removeAfterGroupTabs, "afterGroupTabs", args.groupId, undefined, args.groupId, args.workspaceId);
                return componentsFactory.createAfterGroupTabs(args);
            };
        }

        if (componentsFactory?.createGroupHeaderButtons) {
            this.decoratedFactory.createGroupHeaderButtons = (args) => {
                this._visibilityState.groupHeaderButtons[args.groupId] = args;
                this.setupCleanup(this._componentsFactory.removeGroupHeaderButtons, "groupHeaderButtons", args.groupId, undefined, args.groupId, args.workspaceId);
                return componentsFactory.createGroupHeaderButtons(args);
            };
        }

        if (componentsFactory?.updateWorkspaceTabs) {
            this.decoratedFactory.updateWorkspaceTabs = (args) => {
                if (!this._visibilityState.workspaceTabs[args.workspaceId]) {
                    return;
                }
                if (args.isSelected === true) {
                    this.changeSelectedWorkspaceState(args as CreateWorkspaceTabsOptions);
                }

                const previousEntry = this._visibilityState.workspaceTabs[args.workspaceId] ?? {};
                this._visibilityState.workspaceTabs[args.workspaceId] = { ...previousEntry, ...args } as CreateWorkspaceTabsOptions;
                componentsFactory.updateWorkspaceTabs(args as CreateWorkspaceTabsOptions);
            };
        } else {
            this.decoratedFactory.updateWorkspaceTabs = () => {
                // do nothing
            };
        }

        if (componentsFactory?.createWorkspaceWindowTabs) {
            this.decoratedFactory.updateWorkspaceWindowTabs = (args) => {
                if (!this._visibilityState.workspaceWindowTabs[args.placementId]) {
                    return;
                }
                if (args.isSelected === true) {
                    this.changeSelectedWorkspaceWindowState(args as CreateWorkspaceWindowTabsOptions);
                }

                const previousEntry = this._visibilityState.workspaceTabs[args.placementId] ?? {};
                args.channels = {
                    ...this._visibilityState.workspaceWindowTabs[args.placementId].channels,
                    ...args.channels
                };
                args.close = {
                    ...this._visibilityState.workspaceWindowTabs[args.placementId].close,
                    ...args.close
                };
                this._visibilityState.workspaceWindowTabs[args.placementId] = { ...previousEntry, ...args } as CreateWorkspaceWindowTabsOptions;

                componentsFactory.updateWorkspaceWindowTabs(args as CreateWorkspaceWindowTabsOptions);
            };
        } else {
            this.decoratedFactory.updateWorkspaceWindowTabs = () => {
                // do nothing
            };
        }

        if (componentsFactory?.createGroupHeaderButtons) {
            this.decoratedFactory.updateGroupHeaderButtons = (args) => {
                if (!this._visibilityState.groupHeaderButtons[args.groupId]) {
                    return;
                }

                const previousEntry = this._visibilityState.groupHeaderButtons[args.groupId] ?? {};
                args.addWindow = {
                    ...this._visibilityState.groupHeaderButtons[args.groupId].addWindow,
                    ...args.addWindow
                };
                args.maximize = {
                    ...this._visibilityState.groupHeaderButtons[args.groupId].maximize,
                    ...args.maximize
                };
                args.restore = {
                    ...this._visibilityState.groupHeaderButtons[args.groupId].restore,
                    ...args.restore
                };
                args.eject = {
                    ...this._visibilityState.groupHeaderButtons[args.groupId].eject,
                    ...args.eject
                };
                this._visibilityState.groupHeaderButtons[args.groupId] = { ...previousEntry, ...args } as CreateGroupHeaderButtonsOptions;
                componentsFactory.updateGroupHeaderButtons(args as CreateGroupHeaderButtonsOptions);
            };
        } else {
            this.decoratedFactory.updateGroupHeaderButtons = () => {
                // do nothing
            };
        }

        if (componentsFactory) {
            this.decoratedFactory.createId = () => {
                return shortid.generate();
            };

            this.decoratedFactory.createWorkspaceTabsOptions = ({ element, contentItem }) => {
                const itemIndex = contentItem.parent.contentItems.indexOf(contentItem);
                const isSelected = itemIndex === ((contentItem.parent.config as any).activeItemIndex || 0); // copied from the stack init in GL
                return {
                    domNode: element,
                    workspaceId: idAsString(contentItem.config.id),
                    title: contentItem.config.title,
                    isSelected,
                    isPinned: contentItem.config.workspacesConfig.isPinned,
                    icon: contentItem.config.workspacesConfig.icon,
                    showSaveButton: contentItem.config.workspacesConfig.showSaveButton ?? true,
                    showCloseButton: contentItem.config.workspacesConfig.showCloseButton ?? true,
                    layoutName: contentItem.config.workspacesConfig.layoutName
                };
            };

            this.decoratedFactory.createWorkspaceWindowTabsOptions = ({ element, contentItem }) => {
                const itemIndex = contentItem.parent.contentItems.indexOf(contentItem);
                const isSelected = itemIndex === ((contentItem.parent.config as any).activeItemIndex || 0); // copied from the stack init in GL
                return {
                    domNode: element,
                    groupId: idAsString(contentItem.parent.config.id),
                    placementId: idAsString(contentItem.config.id),
                    windowId: contentItem.config.componentState?.windowId,
                    workspaceId: idAsString(contentItem.layoutManager.root.config.id),
                    title: contentItem.config.title,
                    isSelected,
                    channels: {
                        color: "transparent",
                        visible: false
                    },
                    close: {
                        title: WorkspaceWindowCloseButtonLabel,
                        visible: contentItem.config.workspacesConfig.showCloseButton ?? true
                    }
                };
            };

            this.decoratedFactory.createGroupHeaderButtonsOptions = ({ element, contentItem }) => {
                return {
                    domNode: element,
                    groupId: idAsString(contentItem.config.id),
                    workspaceId: contentItem.layoutManager.config.workspacesOptions.workspaceId,
                    addWindow: {
                        visible: true,
                        title: AddWindowButtonLabel
                    },
                    eject: {
                        visible: true,
                        title: EjectButtonLabel
                    },
                    maximize: {
                        visible: !contentItem.isMaximized,
                        title: GroupHeaderMaximizeLabel
                    },
                    restore: {
                        visible: contentItem.isMaximized,
                        title: GroupHeaderRestoreLabel
                    }
                };
            };
        }
    }

    public reInitialize(incomingFactory?: ComponentFactory) {
        if (incomingFactory?.createLogo && this._visibilityState.logo) {
            incomingFactory.createLogo(this._visibilityState.logo);
        }

        if (incomingFactory?.createAddWorkspace && this._visibilityState.addWorkspace) {
            incomingFactory.createAddWorkspace(this._visibilityState.addWorkspace);
        }

        if (incomingFactory?.createWorkspaceTabs) {
            Object.values(this._visibilityState.workspaceTabs).forEach((wt) => {
                incomingFactory.createWorkspaceTabs(wt);
            });
        }

        if (incomingFactory?.createSystemButtons && this._visibilityState.systemButtons) {
            incomingFactory.createSystemButtons(this._visibilityState.systemButtons);
        }

        if (incomingFactory?.createWorkspaceContents) {
            Object.values(this._visibilityState.workspaceContents).forEach((wc) => {
                incomingFactory.createWorkspaceContents(wc);
            });
        }

        if (incomingFactory?.createBeforeGroupTabs) {
            Object.values(this._visibilityState.beforeGroupTabs).forEach((bgt) => {
                incomingFactory.createBeforeGroupTabs(bgt);
            });
        }

        if (incomingFactory?.createWorkspaceWindowTabs) {
            Object.values(this._visibilityState.workspaceWindowTabs).forEach((wwt) => {
                incomingFactory.createWorkspaceWindowTabs(wwt);
            });
        }

        if (incomingFactory?.createAfterGroupTabs) {
            Object.values(this._visibilityState.afterGroupTabs).forEach((agt) => {
                incomingFactory.createAfterGroupTabs(agt);
            });
        }

        if (incomingFactory?.createGroupHeaderButtons) {
            Object.values(this._visibilityState.groupHeaderButtons).forEach((ghb) => {
                incomingFactory.createGroupHeaderButtons(ghb);
            });
        }

        this._componentsFactory = incomingFactory;
    }

    public onWorkspaceContentsShown(callback: (workspaceId: string) => void) {
        this._callbackRegistry.add("workspace-contents-shown", callback);
    }

    public onWorkspaceContentsHidden(callback: (workspaceId: string) => void) {
        this._callbackRegistry.add("workspace-contents-hidden", callback);
    }

    public notifyWorkspaceClosed(workspaceId: string) {
        this._callbackRegistry.execute(`workspace-closed-${workspaceId}`, workspaceId);
    }

    public notifyGroupClosed(groupId: string) {
        this._callbackRegistry.execute(`group-closed-${groupId}`, groupId);
    }

    public notifyWindowClosed(placementId: string) {
        this._callbackRegistry.execute(`window-closed-${placementId}`, placementId);
    }

    private onWorkspaceClosed(workspaceId: string, callback: (workspaceId: string) => void) {
        return this._callbackRegistry.add(`workspace-closed-${workspaceId}`, callback);
    }

    private onGroupClosed(groupId: string, callback: (groupId: string) => void) {
        return this._callbackRegistry.add(`group-closed-${groupId}`, callback);
    }

    private onWindowClosed(placementId: string, callback: (placementId: string) => void) {
        return this._callbackRegistry.add(`window-closed-${placementId}`, callback);
    }

    private subscribeForWorkspaceContentsVisibility(workspaceId: string) {
        const contentsElement = document.getElementById(`nestHere${workspaceId}`);
        if (!contentsElement) {
            return;
        }
        this._observer.observe(contentsElement, {
            attributes: true,
            attributeFilter: ["style"]
        });
    }

    private getWorkspaceIdFromContents(element: HTMLElement) {
        return element.id.split("nestHere")[1];
    }

    private changeSelectedWorkspaceState(args: CreateWorkspaceTabsOptions) {
        const previouslySelected = this._lastSelectedWorkspaceTab;

        if (previouslySelected) {
            this.decoratedFactory.updateWorkspaceTabs({ workspaceId: previouslySelected.workspaceId, isSelected: false });
        }

        this._lastSelectedWorkspaceTab = args;
    }

    private changeSelectedWorkspaceWindowState(args: CreateWorkspaceWindowTabsOptions) {
        const previouslySelected = this._lastSelectedWorkspaceWindowTab[args.groupId];

        if (previouslySelected) {
            this.decoratedFactory.updateWorkspaceWindowTabs({ placementId: previouslySelected.placementId, isSelected: false });
        }

        this._lastSelectedWorkspaceWindowTab[args.groupId] = args;
    }

    private cleanupWorkspaceContents(workspaceId: string) {
        if (!workspaceId) {
            return;
        }
        this._componentsFactory.removeWorkspaceContents({ workspaceId });
        delete this._visibilityState.workspaceContents[workspaceId];
        const workspaceLayoutContainer = document.getElementById(uiExecutor.getWorkspaceLayoutContainerId(workspaceId));
        if (workspaceLayoutContainer) {
            workspaceLayoutContainer.remove();
        }
    }

    private setupCleanup(removeFactoryFunction: (removeOptions: { elementId: string }) => void, stateKey: keyof VisibilityState, elementId: string, placementId?: string, groupId?: string, workspaceId?: string) {
        let windowUnsub = () => {
            // do nothing
        };
        let groupUnsub = () => {
            // do nothing
        };
        let workspaceUnsub = () => {
            // do nothing
        };
        const cleanUp = () => {
            if (removeFactoryFunction) {
                removeFactoryFunction({ elementId });
            }

            delete (this._visibilityState[stateKey] as any)[elementId];
            windowUnsub();
            groupUnsub();
            workspaceUnsub();
        };
        if (placementId) {
            windowUnsub = this.onWindowClosed(placementId, cleanUp);
        }
        if (groupId) {
            groupUnsub = this.onGroupClosed(groupId, cleanUp);
        }
        if (workspaceId) {
            workspaceUnsub = this.onWorkspaceClosed(workspaceId, cleanUp);
        }
    }
}

export default new ComponentStateMonitor();
