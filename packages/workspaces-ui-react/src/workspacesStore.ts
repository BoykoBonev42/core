import {
    CreateAddApplicationPopupRequestOptions,
    CreateAddWorkspacePopupRequestOptions,
    CreateElementRequestOptions,
    CreateGroupHeaderButtonsRequestOptions,
    CreateGroupRequestOptions,
    CreateSaveWorkspacePopupRequestOptions,
    CreateWorkspaceContentsRequestOptions,
    CreateWorkspaceLoadingAnimationRequestOptions,
    CreateWorkspaceTabRequestOptions,
    CreateWorkspaceWindowTabRequestOptions,
    ElementCreationWrapperState,
    RemoveRequestOptions,
    RemoveWorkspaceContentsRequestOptions
} from "./types/internal";

class WorkspacesStore {
    private listeners = new Set<() => void>();
    private state: ElementCreationWrapperState = {
        logo: undefined,
        workspaceTabs: {},
        addWorkspace: undefined,
        systemButtons: undefined,
        workspaceContents: [],
        beforeGroupTabsZones: {},
        workspaceWindowTabsZones: {},
        afterGroupTabsZones: {},
        groupHeaderButtonsZones: {},
        saveWorkspacePopup: undefined,
        addApplicationPopup: undefined,
        addWorkspacePopup: undefined,
        workspaceLoadingAnimations: {}
    };

    public subscribe = (cb: () => void) => {
        this.listeners.add(cb);
        return () => {
            this.listeners.delete(cb);
        };
    }

    public getSnapshot = () => {
        return this.state;
    }

    public onCreateLogoRequested = (options: CreateElementRequestOptions) => {
        if (options === this.state.logo) {
            return;
        }
        this.setState(s => {
            return {
                ...s,
                logo: options
            }
        });
    }

    public onCreateWorkspaceTabRequested = (options: CreateWorkspaceTabRequestOptions) => {
        this.onCreateOrUpdateRequested(options.workspaceId, options, "workspaceTabs");
    }

    public onCreateAddWorkspaceRequested = (options: CreateElementRequestOptions) => {
        if (options === this.state.addWorkspace) {
            return;
        }
        this.setState(s => {
            return {
                ...s,
                addWorkspace: options
            }
        });
    }

    public onCreateSystemButtonsRequested = (options: CreateElementRequestOptions) => {
        if (options === this.state.systemButtons) {
            return;
        }
        this.setState(s => {
            return {
                ...s,
                systemButtons: options
            }
        });
    }

    public onCreateWorkspaceContentsRequested = (options: CreateWorkspaceContentsRequestOptions) => {
        if (this.state.workspaceContents.some(wc => wc.domNode === options.domNode)) {
            return;
        }

        this.setState(s => {
            return {
                ...s,
                workspaceContents: [
                    ...s.workspaceContents,
                    options
                ]
            }
        });
    }

    public onCreateBeforeGroupTabsRequested = (options: CreateGroupRequestOptions) => {
        this.onCreateOrUpdateRequested(options.groupId, options, "beforeGroupTabsZones");
    }

    public onCreateWorkspaceWindowTabRequested = (options: CreateWorkspaceWindowTabRequestOptions) => {
        this.onCreateOrUpdateRequested(options.placementId, options, "workspaceWindowTabsZones");
    }

    public onCreateAfterGroupTabsRequested = (options: CreateGroupRequestOptions) => {
        this.onCreateOrUpdateRequested(options.groupId, options, "afterGroupTabsZones");
    }

    public onCreateGroupHeaderButtonsRequested = (options: CreateGroupRequestOptions) => {
        this.onCreateOrUpdateRequested(options.groupId, options, "groupHeaderButtonsZones");
    }

    public onCreateSaveWorkspaceRequested = (options: CreateSaveWorkspacePopupRequestOptions) => {
        if (options === this.state.saveWorkspacePopup) {
            return;
        }
        this.setState(s => {
            return {
                ...s,
                saveWorkspacePopup: options
            }
        }, options.callback);
    }

    public onCreateAddApplicationRequested = (options: CreateAddApplicationPopupRequestOptions) => {
        if (options === this.state.addApplicationPopup) {
            return;
        }
        this.setState(s => {
            return {
                ...s,
                addApplicationPopup: options
            }
        }, options.callback);
    }

    public onCreateAddWorkspacePopupRequested = (options: CreateAddWorkspacePopupRequestOptions) => {
        if (options === this.state.addWorkspacePopup) {
            return;
        }
        this.setState(s => {
            return {
                ...s,
                addWorkspacePopup: options
            }
        }, options.callback);
    }

    public onCreateWorkspaceLoadingAnimationRequested = (options: CreateWorkspaceLoadingAnimationRequestOptions) => {
        this.onCreateOrUpdateRequested(options.workspaceId, options, "workspaceLoadingAnimations");
    }

    public onUpdateWorkspaceTabRequested = (options: CreateWorkspaceTabRequestOptions) => {
        this.onCreateOrUpdateRequested(options.workspaceId, options, "workspaceTabs");
    }

    public onUpdateWorkspaceWindowTabRequested = (options: CreateWorkspaceWindowTabRequestOptions) => {
        this.onCreateOrUpdateRequested(options.placementId, options, "workspaceWindowTabsZones");
    }

    public onUpdateGroupHeaderButtonsRequested = (options: CreateGroupHeaderButtonsRequestOptions) => {
        this.onCreateOrUpdateRequested(options.groupId, options, "groupHeaderButtonsZones");
    }

    public onRemoveWorkspaceTabRequested = (options: RemoveRequestOptions) => {
        this.onRemoveRequested(options.elementId, "workspaceTabs");
    }

    public onRemoveWorkspaceContentsRequested = (options: RemoveWorkspaceContentsRequestOptions) => {
        this.setState(s => {
            return {
                ...s,
                workspaceContents: [
                    ...s.workspaceContents.filter((wc) => wc.workspaceId !== options.workspaceId),
                ]
            }
        });
    }

    public onRemoveBeforeTabsRequested = (options: RemoveRequestOptions) => {
        this.onRemoveRequested(options.elementId, "beforeGroupTabsZones");
    }

    public onRemoveWorkspaceWindowTabRequested = (options: RemoveRequestOptions) => {
        this.onRemoveRequested(options.elementId, "workspaceWindowTabsZones");
    }

    public onRemoveAfterTabsRequested = (options: RemoveRequestOptions) => {
        this.onRemoveRequested(options.elementId, "afterGroupTabsZones");
    }

    public onRemoveGroupHeaderButtonsRequested = (options: RemoveRequestOptions) => {
        this.onRemoveRequested(options.elementId, "groupHeaderButtonsZones");
    }

    public onHideSystemPopups = (cb: () => void) => {
        this.setState((s) => {
            if (!s.addApplicationPopup && !s.saveWorkspacePopup && !s.addWorkspacePopup) {
                // preventing unnecessary rerendering
                return s;
            }
            return {
                ...s,
                addApplicationPopup: undefined,
                saveWorkspacePopup: undefined,
                addWorkspacePopup: undefined
            };
        }, cb);
    }

    public onRemoveWorkspaceLoadingAnimation = (options: RemoveRequestOptions) => {
        this.onRemoveRequested(options.elementId, "workspaceLoadingAnimations");
    }

    private setState(cb: (ns: ElementCreationWrapperState) => ElementCreationWrapperState, afterUpdateCallback?: () => void) {
        this.state = cb(this.state);
        if (typeof afterUpdateCallback === "function") {
            afterUpdateCallback();
        }

        this.listeners.forEach((l) => l());
    }

    private onCreateOrUpdateRequested = <T extends keyof ElementCreationWrapperState>(id: string, options: ElementCreationWrapperState[T], key: T) => {
        if (options === this.state[key]![id] || !options) {
            return;
        }
        this.setState(s => {
            const partOfStateCopy = Object.keys(s[key]!).reduce((acc, elementId) => {
                acc[elementId] = s[key]![elementId];
                return acc;
            }, {});

            const previousObj = partOfStateCopy[id] ?? {};
            partOfStateCopy[id] = { ...previousObj, ...options };
            return {
                ...s,
                [key]: partOfStateCopy
            }
        });
    }

    private onRemoveRequested = (id: string, key: keyof ElementCreationWrapperState) => {
        if (!this.state[key]![id]) {
            return;
        }
        this.setState(s => {
            const newTabElementsObj = Object.keys(s[key]!).reduce((acc, elementId) => {
                if (elementId != id) {
                    acc[elementId] = s[key]![elementId];
                }
                return acc;
            }, {});

            return {
                ...s,
                [key]: newTabElementsObj
            }
        });
    }
}

export default new WorkspacesStore();