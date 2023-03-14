import React, { useEffect, useState } from "react";
import AddApplicationPopup from "./defaultComponents/popups/addApplication/AddApplicationPopup";
import AddWorkspacePopup from "./defaultComponents/popups/addWorkspace/AddWorkspacePopup";
import SaveWorkspacePopup from "./defaultComponents/popups/saveWorkspace/SaveWorkspacePopup";
import Portal from "./Portal";
import { ElementCreationWrapperState, Bounds } from "./types/internal";
import workspacesManager from "./workspacesManager";
import WorkspacesWrapper from "./WorkspacesWrapper";
import workspacesStore from "./workspacesStore";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import WorkspaceTabV2 from "./defaultComponents/workspace/tabV2/WorkspaceTabV2";
import { WorkspacesProps } from "./types/api";

const WorkspacesElementCreationWrapper: React.FC<WorkspacesProps> = ({ components, glue, ...additionalProperties }) => {
    const state = useSyncExternalStore<ElementCreationWrapperState>(workspacesStore.subscribe, workspacesStore.getSnapshot);
    const [shouldInit, setShouldInit] = useState(false);

    useEffect(() => {
        setShouldInit(true);
    }, []);

    const addApplicationComponent = components?.popups?.AddApplicationComponent || AddApplicationPopup;
    const saveWorkspaceComponent = components?.popups?.SaveWorkspaceComponent || SaveWorkspacePopup;
    const addWorkspaceComponent = components?.popups?.AddWorkspaceComponent || AddWorkspacePopup;

    const onCreateAddApplicationRequested = addApplicationComponent && typeof addApplicationComponent !== "string" ?
        workspacesStore.onCreateAddApplicationRequested : undefined;

    const onCreateAddWorkspacePopupRequested = addWorkspaceComponent && typeof addWorkspaceComponent !== "string" ?
        workspacesStore.onCreateAddWorkspacePopupRequested : undefined;

    const onCreateSaveWorkspaceRequested = saveWorkspaceComponent && typeof saveWorkspaceComponent !== "string" ?
        workspacesStore.onCreateSaveWorkspaceRequested : undefined;

    const addApplication = typeof addApplicationComponent === "string" ? addApplicationComponent : undefined;
    const saveWorkspace = typeof saveWorkspaceComponent === "string" ? saveWorkspaceComponent : undefined;
    const addWorkspace = typeof addWorkspaceComponent === "string" ? addWorkspaceComponent : undefined;

    const externalPopupApplications = {
        addApplication,
        saveWorkspace,
        addWorkspace
    };

    const workspaceTab = components?.header?.WorkspaceTabComponent ?? WorkspaceTabV2;
    const groupHeader = components?.groupHeader;

    const renderLogoComponent = () => {
        const LogoCustomElement = components?.header?.LogoComponent;
        if (!LogoCustomElement || (!state.logo || !state.logo.domNode)) {
            return;
        }

        const { domNode, callback, ...options } = state.logo;
        return <Portal domNode={domNode}><LogoCustomElement {...options} /></Portal>
    }

    const renderWorkspaceTabs = () => {
        const TabComponent = components?.header?.WorkspaceTabComponent ?? WorkspaceTabV2;

        return Object.values(state.workspaceTabs).map((g) => {
            if (!TabComponent || !g.domNode) {
                return;
            }

            const { domNode, callback, ...options } = g;
            const onCloseClick = () => {
                workspacesManager.closeWorkspace(g.workspaceId);
            };

            const onSaveClick = (bounds: Bounds) => {
                workspacesManager.showSaveWorkspacePopup(g.workspaceId, bounds);
            };
            return <Portal key={`${options.workspaceId}-tab`} domNode={domNode}><TabComponent onCloseClick={onCloseClick} onSaveClick={onSaveClick} {...options} /></Portal>
        });
    }

    const renderAddWorkspaceComponent = () => {
        const AddWorkspaceCustomComponent = components?.header?.AddWorkspaceComponent;

        if (!AddWorkspaceCustomComponent || (!state.addWorkspace || !state.addWorkspace.domNode)) {
            return;
        }

        const { domNode, callback, ...options } = state.addWorkspace;
        return <Portal domNode={domNode}><AddWorkspaceCustomComponent {...options} /></Portal>
    }

    const renderSystemButtonsComponent = () => {
        const SystemButtonsCustomComponent = components?.header?.SystemButtonsComponent;
        if (!SystemButtonsCustomComponent || (!state.systemButtons || !state.systemButtons.domNode)) {
            return;
        }

        const { domNode, callback, ...options } = state.systemButtons;

        return <Portal domNode={domNode}><SystemButtonsCustomComponent {...options} /></Portal>
    }

    const renderWorkspaceContents = () => {
        const WorkspaceContentsComponent = components?.WorkspaceContents;

        return state.workspaceContents.map((wc) => {
            if (!WorkspaceContentsComponent || !wc.domNode) {
                return;
            }

            const { domNode, callback, ...options } = wc;
            return <Portal key={options.workspaceId} domNode={domNode}><WorkspaceContentsComponent {...options} /></Portal>
        });
    }

    const renderBeforeGroupTabs = () => {
        const BeforeGroupTabsComponent = groupHeader?.BeforeTabsComponent;

        return Object.values(state.beforeGroupTabsZones).map((g) => {
            if (!BeforeGroupTabsComponent || !g.domNode) {
                return;
            }

            const { domNode, callback, ...options } = g;
            return <Portal key={`${options.groupId}-beforeTabs`} domNode={domNode}><BeforeGroupTabsComponent {...options} /></Portal>
        });
    }

    const renderWorkspaceWindowTabs = () => {
        const WorkspaceWindowTabsComponent = groupHeader?.WorkspaceWindowTabComponent;

        return Object.values(state.workspaceWindowTabsZones).map((g) => {
            if (!WorkspaceWindowTabsComponent || !g.domNode) {
                return;
            }

            const { domNode, callback, ...options } = g;

            const close = {
                ...options.close,
                close: () => {
                    workspacesManager.closeWindow(g.placementId)
                }
            };

            const channels = {
                ...options.channels,
                showSelector: (bounds: Bounds) => {
                    workspacesManager.showChannelsSelector(g.placementId, bounds);
                }
            }

            return <Portal key={options.placementId} domNode={domNode}><WorkspaceWindowTabsComponent {...options} elementId={options.placementId} close={close} channels={channels} /></Portal>
        });
    }

    const renderAfterGroupTabs = () => {
        const AfterGroupTabsComponent = groupHeader?.AfterTabsComponent;

        return Object.values(state.afterGroupTabsZones).map((g) => {
            if (!AfterGroupTabsComponent || !g.domNode) {
                return;
            }

            const { domNode, callback, ...options } = g;
            return <Portal key={`${options.groupId}-afterTabs`} domNode={domNode}><AfterGroupTabsComponent {...options} /></Portal>
        });
    }

    const renderGroupHeaderButtons = () => {
        const ButtonsComponent = groupHeader?.ButtonsComponent;

        return Object.values(state.groupHeaderButtonsZones).map((g) => {
            if (!ButtonsComponent || !g.domNode) {
                return;
            }

            const { domNode, callback, ...options } = g;

            const addWindow = {
                ...options.addWindow,
                showPopup: (bounds: Bounds) => {
                    workspacesManager.showAddApplicationPopup(options.workspaceId, options.groupId, bounds);
                }
            };

            const maximize = {
                ...options.maximize,
                maximize: () => {
                    workspacesManager.maximizeGroup(options.groupId);
                }
            };

            const restore = {
                ...options.restore,
                restore: () => {
                    workspacesManager.restoreGroup(options.groupId);
                }
            };

            const eject = {
                ...options.eject,
                eject: () => {
                    workspacesManager.ejectActiveWindow(options.groupId);
                }
            };

            return <Portal key={`${options.groupId}-headerButtons`} domNode={domNode}>
                <ButtonsComponent {...options} addWindow={addWindow} maximize={maximize} restore={restore} eject={eject} />
            </Portal>
        });
    }

    const renderSaveWorkspacePopupComponent = () => {
        const SaveWorkspaceCustomComponent = components?.popups?.SaveWorkspaceComponent || SaveWorkspacePopup;
        if (!SaveWorkspaceCustomComponent || (!state.saveWorkspacePopup || !state.saveWorkspacePopup.domNode)) {
            return;
        }

        const { domNode, ...options } = state.saveWorkspacePopup;

        return <Portal domNode={domNode}><SaveWorkspaceCustomComponent glue={glue} {...options} /></Portal>
    }

    const renderAddApplicationPopupComponent = () => {
        const AddApplicationCustomComponent = components?.popups?.AddApplicationComponent || AddApplicationPopup;
        if (!AddApplicationCustomComponent || (!state.addApplicationPopup || !state.addApplicationPopup.domNode)) {
            return;
        }

        const { domNode, ...options } = state.addApplicationPopup;

        return <Portal domNode={domNode}><AddApplicationCustomComponent glue={glue} {...options} /></Portal>
    }

    const renderAddWorkspacePopupComponent = () => {
        const AddWorkspaceCustomComponent = components?.popups?.AddWorkspaceComponent || AddWorkspacePopup;
        if (!AddWorkspaceCustomComponent || (!state.addWorkspacePopup || !state.addWorkspacePopup.domNode)) {
            return;
        }
        const { domNode, callback, ...options } = state.addWorkspacePopup;

        return <Portal domNode={domNode}><AddWorkspaceCustomComponent glue={glue} {...options} /></Portal>
    }

    const renderWorkspaceLoadingAnimations = () => {
        const LoadingAnimationComponent = components?.loadingAnimation?.Workspace;

        return Object.values(state.workspaceLoadingAnimations).map((g) => {
            if (!LoadingAnimationComponent || !g.domNode) {
                return;
            }

            const { domNode, callback, ...options } = g;
            return <Portal key={`${options.workspaceId}-loading-animation`} domNode={domNode}><LoadingAnimationComponent  {...options} /></Portal>
        });
    }

    return (
        <div {...additionalProperties} style={{ overflow: "hidden", width: "100%", height: "100%" }}>
            {renderLogoComponent()}
            {renderWorkspaceTabs()}
            {renderAddWorkspaceComponent()}
            {renderSystemButtonsComponent()}

            {renderWorkspaceContents()}

            {renderBeforeGroupTabs()}
            {renderWorkspaceWindowTabs()}
            {renderAfterGroupTabs()}
            {renderGroupHeaderButtons()}

            {renderSaveWorkspacePopupComponent()}
            {renderAddApplicationPopupComponent()}
            {renderAddWorkspacePopupComponent()}

            {renderWorkspaceLoadingAnimations()}
            <WorkspacesWrapper
                onCreateLogoRequested={components?.header?.LogoComponent ? workspacesStore.onCreateLogoRequested : undefined}
                onCreateWorkspaceTabRequested={workspaceTab ? workspacesStore.onCreateWorkspaceTabRequested : undefined}
                onCreateAddWorkspaceRequested={components?.header?.AddWorkspaceComponent ? workspacesStore.onCreateAddWorkspaceRequested : undefined}
                onCreateSystemButtonsRequested={components?.header?.SystemButtonsComponent ? workspacesStore.onCreateSystemButtonsRequested : undefined}

                onCreateWorkspaceContentsRequested={components?.WorkspaceContents ? workspacesStore.onCreateWorkspaceContentsRequested : undefined}

                onCreateBeforeGroupTabsRequested={groupHeader?.BeforeTabsComponent ? workspacesStore.onCreateBeforeGroupTabsRequested : undefined}
                onCreateWorkspaceWindowTabRequested={groupHeader?.WorkspaceWindowTabComponent ? workspacesStore.onCreateWorkspaceWindowTabRequested : undefined}
                onCreateAfterGroupTabsRequested={groupHeader?.AfterTabsComponent ? workspacesStore.onCreateAfterGroupTabsRequested : undefined}
                onCreateGroupHeaderButtonsRequested={groupHeader?.ButtonsComponent ? workspacesStore.onCreateGroupHeaderButtonsRequested : undefined}

                onCreateSaveWorkspacePopupRequested={onCreateSaveWorkspaceRequested}
                onCreateAddApplicationPopupRequested={onCreateAddApplicationRequested}
                onCreateAddWorkspacePopupRequested={onCreateAddWorkspacePopupRequested}

                onCreateWorkspaceLoadingAnimationRequested={components?.loadingAnimation?.Workspace ? workspacesStore.onCreateWorkspaceLoadingAnimationRequested : undefined}

                onUpdateWorkspaceTabsRequested={workspaceTab ? workspacesStore.onUpdateWorkspaceTabRequested : undefined}

                onUpdateWorkspaceWindowTabsRequested={groupHeader?.WorkspaceWindowTabComponent ? workspacesStore.onUpdateWorkspaceWindowTabRequested : undefined}
                onUpdateGroupHeaderButtonsRequested={groupHeader?.ButtonsComponent ? workspacesStore.onUpdateGroupHeaderButtonsRequested : undefined}

                onRemoveWorkspaceTabsRequested={workspaceTab ? workspacesStore.onRemoveWorkspaceTabRequested : undefined}

                onRemoveWorkspaceContentsRequested={components?.WorkspaceContents ? workspacesStore.onRemoveWorkspaceContentsRequested : undefined}

                onRemoveBeforeGroupTabsRequested={groupHeader?.BeforeTabsComponent ? workspacesStore.onRemoveBeforeTabsRequested : undefined}
                onRemoveWorkspaceWindowTabRequested={groupHeader?.WorkspaceWindowTabComponent ? workspacesStore.onRemoveWorkspaceWindowTabRequested : undefined}
                onRemoveAfterGroupTabsRequested={groupHeader?.AfterTabsComponent ? workspacesStore.onRemoveAfterTabsRequested : undefined}
                onRemoveGroupHeaderButtonsRequested={groupHeader?.ButtonsComponent ? workspacesStore.onRemoveGroupHeaderButtonsRequested : undefined}

                onRemoveWorkspaceLoadingAnimationRequested={components?.loadingAnimation?.Workspace ? workspacesStore.onRemoveWorkspaceLoadingAnimation : undefined}

                onHideSystemPopupsRequested={workspacesStore.onHideSystemPopups}
                externalPopupApplications={externalPopupApplications}
                shouldInit={shouldInit}
                glue={glue}
            />
        </div>
    );
}

export default WorkspacesElementCreationWrapper;
