import GoldenLayout from "@glue42/golden-layout";

interface CreateOptions {
    domNode: HTMLElement;
}

interface GroupHeaderCreateOptions {
    groupId: string;
    workspaceId: string;
}

export interface CreateWorkspaceTabsOptions extends CreateOptions {
    workspaceId: string;
    title: string;
    isPinned: boolean;
    icon: string;
    isSelected: boolean;
    showSaveButton: boolean;
    showCloseButton: boolean;
    layoutName: string;
}

export type CreateBeforeGroupTabsOptions = GroupHeaderCreateOptions;

export interface CreateWorkspaceWindowTabsOptions extends GroupHeaderCreateOptions {
    placementId: string;
    windowId?: string;
    title: string;
    isSelected: boolean;
    close: CreateWorkspaceWindowTabCloseButtonsOptions;
    channels: CreateChannelsLinkOptions;
}

export type CreateAfterGroupTabsOptions = GroupHeaderCreateOptions;

export interface CreateChannelsLinkOptions {
    visible: boolean;
    color: string;
}

export interface CreateWorkspaceWindowTabCloseButtonsOptions {
    visible: boolean;
    title?: string;
}

export interface CreateAddWindowButtonOptions {
    title?: string;
    visible: boolean;
}

export interface CreateEjectButtonOptions {
    title?: string;
    visible: boolean;
}

export interface CreateMaximizeButtonOptions {
    title?: string;
    visible: boolean;
}

export interface CreateRestoreButtonOptions {
    title?: string;
    visible: boolean;
}

export interface CreateGroupHeaderButtonsOptions extends GroupHeaderCreateOptions {
    addWindow: CreateAddWindowButtonOptions;
    eject: CreateEjectButtonOptions;
    maximize: CreateMaximizeButtonOptions;
    restore: CreateRestoreButtonOptions;
}

interface BasePayloadOptions {
    domNode: HTMLElement;
    resizePopup: (size: any) => void;
    hidePopup: () => void;
    callback?: () => void;
    frameId: string;
}

export interface AddApplicationPopupOptions extends BasePayloadOptions {
    boxId: string;
    workspaceId: string;
    parentType?: string;
}

export interface SaveWorkspacePopupOptions extends BasePayloadOptions {
    workspaceId: string;
    buildMode: boolean;
}

// tslint:disable-next-line: no-empty-interface
export interface AddWorkspacePopupOptions extends BasePayloadOptions {
}

export interface ComponentFactory {
    createLogo?: (options: { domNode: HTMLElement; frameId: string }) => void;
    createWorkspaceTabs?: (options: CreateWorkspaceTabsOptions) => void;
    createAddWorkspace?: (options: { domNode: HTMLElement; frameId: string }) => void;
    createSystemButtons?: (options: { domNode: HTMLElement; frameId: string }) => void;
    createWorkspaceContents?: (options: { domNode: HTMLElement; containerElement?: HTMLElement; workspaceId: string }) => void;

    createBeforeGroupTabs?: (options: CreateBeforeGroupTabsOptions) => void;
    createWorkspaceWindowTabs?: (options: CreateWorkspaceWindowTabsOptions) => void;
    createAfterGroupTabs?: (options: CreateAfterGroupTabsOptions) => void;
    createGroupHeaderButtons?: (options: CreateGroupHeaderButtonsOptions) => void;

    createAddApplicationPopup?: (options: AddApplicationPopupOptions) => void;
    createSaveWorkspacePopup?: (options: SaveWorkspacePopupOptions) => void;
    createAddWorkspacePopup?: (options: AddWorkspacePopupOptions) => void;

    hideSystemPopups?: (cb: () => void) => void;

    updateWorkspaceTabs?: (options: Partial<CreateWorkspaceTabsOptions>) => void;
    updateWorkspaceWindowTabs?: (options: Partial<CreateWorkspaceWindowTabsOptions>) => void;
    updateGroupHeaderButtons?: (options: Partial<CreateGroupHeaderButtonsOptions>) => void;

    /**
     * @options the elementId is a workspaceId
     */
    removeWorkspaceTabs?: (options: { elementId: string }) => void;
    removeWorkspaceContents?: (options: { workspaceId: string }) => void;
    /**
     * @options the elementId is a groupId
     */
    removeBeforeGroupTabs?: (options: { elementId: string }) => void;
    /**
     * @options the elementId is a placementId
     */
    removeWorkspaceWindowTabs?: (options: { elementId: string }) => void;
    /**
     * @options the elementId is a groupId
     */
    removeAfterGroupTabs?: (options: { elementId: string }) => void;
    /**
     * @options the elementId is a groupId
     */
    removeGroupHeaderButtons?: (options: { elementId: string }) => void;

    externalPopupApplications?: {
        addApplication?: string;
        saveWorkspace?: string;
        addWorkspace?: string;
    };

    createId?: () => string;
}

export interface DecoratedComponentFactory {
    createLogo?: (options: { domNode: HTMLElement }) => void;
    createAddWorkspace?: (options: { domNode: HTMLElement }) => void;
    createSystemButtons?: (options: { domNode: HTMLElement }) => void;
    createWorkspaceContents?: (options: { domNode: HTMLElement; workspaceId: string }) => void;

    createGroupIcons?: (options: { domNode: HTMLElement; groupId: string; workspaceId: string }) => void;
    createGroupTabControls?: (options: { domNode: HTMLElement; groupId: string; workspaceId: string }) => void;

    createAddApplicationPopup?: (options: AddApplicationPopupOptions) => void;
    createSaveWorkspacePopup?: (options: SaveWorkspacePopupOptions) => void;
    createAddWorkspacePopup?: (options: AddWorkspacePopupOptions) => void;

    hideSystemPopups?: (cb: () => void) => void;

    removeWorkspaceContents?: (options: { workspaceId: string }) => void;
    removeGroupIcons?: (options: { groupId: string }) => void;
    removeGroupTabControls?: (options: { groupId: string }) => void;
    removeGroupHeaderButtons?: (options: { groupId: string }) => void;

    createId?: () => string;
}

export interface WorkspaceTabsBuilderOptions {
    element: HTMLElement;
    contentItem: GoldenLayout.Component;
}

export interface WorkspaceWindowTabsBuilderOptions {
    element: HTMLElement;
    contentItem: GoldenLayout.Component;
}

export interface GroupHeaderButtonsBuilderOptions {
    element: HTMLElement;
    contentItem: GoldenLayout.Component;
}

export interface DecoratedFactory extends ComponentFactory {
    createWorkspaceTabsOptions?: (options: WorkspaceTabsBuilderOptions) => CreateWorkspaceTabsOptions;
    createWorkspaceWindowTabsOptions?: (options: WorkspaceWindowTabsBuilderOptions) => CreateWorkspaceWindowTabsOptions;
    createGroupHeaderButtonsOptions?: (options: GroupHeaderButtonsBuilderOptions) => CreateGroupHeaderButtonsOptions;
}

export interface VisibilityState {
    logo: { domNode: HTMLElement; frameId: string };
    workspaceTabs: { [id: string]: CreateWorkspaceTabsOptions };
    addWorkspace: { domNode: HTMLElement; frameId: string };
    systemButtons: { domNode: HTMLElement; frameId: string };
    workspaceContents: { [workspaceId: string]: { domNode: HTMLElement; workspaceId: string } };
    beforeGroupTabs: { [groupId: string]: CreateBeforeGroupTabsOptions };
    workspaceWindowTabs: { [placementId: string]: CreateWorkspaceWindowTabsOptions };
    afterGroupTabs: { [groupId: string]: CreateAfterGroupTabsOptions };
    groupHeaderButtons: { [groupId: string]: CreateGroupHeaderButtonsOptions };
}