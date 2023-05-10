import React from "react";

//#region CreateElementOptions

export interface CreateElementRequestOptions {
  domNode: HTMLElement;
  callback?: () => void;
  frameId: string;
  [k: string]: any;
}

export interface CreateWorkspaceTabRequestOptions extends CreateElementRequestOptions {
  workspaceId: string;
  title: string;
  isSelected: boolean;
  isPinned: boolean;
  icon: string;
  showSaveButton: boolean;
  showCloseButton: boolean;
  layoutName: string;
}

export interface CreateWorkspaceContentsRequestOptions extends CreateElementRequestOptions {
  workspaceId: string
}

export interface CreateGroupRequestOptions extends CreateElementRequestOptions {
  groupId: string;
  workspaceId: string;
}

export interface CreateWorkspaceWindowTabRequestOptions extends CreateGroupRequestOptions {
  isSelected: boolean;
  windowId: string;
  elementId: string;
  title: string;
  channels: {
    color: string;
    visible: boolean;
    title: string;
  };
  close: {
    visible: boolean;
    title: string;
  };
}

export interface CreateGroupHeaderButtonsRequestOptions extends CreateGroupRequestOptions {
  addWindow: {
    visible: boolean;
    title: string;
  };
  maximize: {
    visible: boolean;
    title: string;
  };
  restore: {
    visible: boolean;
    title: string;
  };
  eject: {
    visible: boolean;
    title: string;
  };
}

export interface CreatePopupRequestOptions extends CreateElementRequestOptions {
  resizePopup: (s: Size) => void;
  hidePopup: () => void;
  glue?: any;
}

export interface CreateSaveWorkspacePopupRequestOptions extends CreatePopupRequestOptions {
  workspaceId: string;
}

export interface CreateAddApplicationPopupRequestOptions extends CreatePopupRequestOptions {
  workspaceId: string;
  boxId: string;
}

export interface CreateAddWorkspacePopupRequestOptions extends CreatePopupRequestOptions {
  frameId: string;
}

export interface CreateWorkspaceLoadingAnimationRequestOptions extends CreateElementRequestOptions {
  workspaceId: string;
}

//#endregion

//#region RemoveOptions
export interface RemoveWorkspaceContentsRequestOptions {
  workspaceId: string;
}

export interface RemoveRequestOptions {
  elementId: string;
}
//#endregion

export interface ElementCreationWrapperState {
  logo?: CreateElementRequestOptions;
  workspaceTabs: { [elementId: string]: CreateWorkspaceTabRequestOptions };
  addWorkspace?: CreateElementRequestOptions;
  systemButtons?: CreateElementRequestOptions;

  workspaceContents: CreateWorkspaceContentsRequestOptions[];

  beforeGroupTabsZones: { [elementId: string]: CreateGroupRequestOptions };
  workspaceWindowTabsZones: { [elementId: string]: CreateWorkspaceWindowTabRequestOptions };
  afterGroupTabsZones: { [elementId: string]: CreateGroupRequestOptions };
  groupHeaderButtonsZones: { [elementId: string]: CreateGroupHeaderButtonsRequestOptions };

  saveWorkspacePopup?: CreateSaveWorkspacePopupRequestOptions;
  addApplicationPopup?: CreateAddApplicationPopupRequestOptions;
  addWorkspacePopup?: CreateAddWorkspacePopupRequestOptions;

  workspaceLoadingAnimations: { [workspaceId: string]: CreateWorkspaceLoadingAnimationRequestOptions };
}

export interface WorkspacesWrapperProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  onCreateLogoRequested?: (options: CreateElementRequestOptions) => void;
  onCreateWorkspaceTabRequested?: (options: CreateWorkspaceTabRequestOptions) => void;
  onCreateAddWorkspaceRequested?: (options: CreateElementRequestOptions) => void;
  onCreateSystemButtonsRequested?: (options: CreateElementRequestOptions) => void;

  onCreateWorkspaceContentsRequested?: (options: CreateElementRequestOptions) => void;

  onCreateBeforeGroupTabsRequested?: (options: CreateGroupRequestOptions) => void;
  onCreateWorkspaceWindowTabRequested?: (options: CreateWorkspaceWindowTabRequestOptions) => void;
  onCreateAfterGroupTabsRequested?: (options: CreateGroupRequestOptions) => void;
  onCreateGroupHeaderButtonsRequested?: (options: CreateGroupRequestOptions) => void;

  onCreateSaveWorkspacePopupRequested?: (options: CreateSaveWorkspacePopupRequestOptions) => void;
  onCreateAddApplicationPopupRequested?: (options: CreateAddApplicationPopupRequestOptions) => void;
  onCreateAddWorkspacePopupRequested?: (options: CreateAddWorkspacePopupRequestOptions) => void;

  onCreateWorkspaceLoadingAnimationRequested?: (options: CreateWorkspaceLoadingAnimationRequestOptions) => void;

  onUpdateWorkspaceTabsRequested?: (options: CreateWorkspaceTabRequestOptions) => void;
  onUpdateWorkspaceWindowTabsRequested?: (options: CreateWorkspaceWindowTabRequestOptions) => void;
  onUpdateGroupHeaderButtonsRequested?: (options: CreateGroupHeaderButtonsRequestOptions) => void;

  onRemoveWorkspaceTabsRequested?: (options: RemoveRequestOptions) => void;

  onRemoveWorkspaceContentsRequested?: (options: RemoveWorkspaceContentsRequestOptions) => void;

  onRemoveBeforeGroupTabsRequested?: (options: RemoveRequestOptions) => void;
  onRemoveWorkspaceWindowTabRequested?: (options: RemoveRequestOptions) => void;
  onRemoveAfterGroupTabsRequested?: (options: RemoveRequestOptions) => void;
  onRemoveGroupHeaderButtonsRequested?: (options: RemoveRequestOptions) => void;

  onRemoveWorkspaceLoadingAnimationRequested?: (options: RemoveRequestOptions) => void;

  onHideSystemPopupsRequested?: (cb: () => void) => void;
  externalPopupApplications: {
    addApplication: string | undefined;
    saveWorkspace: string | undefined;
    addWorkspace: string | undefined;
  }
  glue?: any;
  shouldInit: boolean;
}

export interface PortalProps {
  domNode: HTMLElement;
  children?: React.ReactNode;
}

export interface WorkspacesManager {
  getFrameId(): string;
  init(componentFactory: any): void;
  notifyMoveAreaChanged(): void;
  notifyWorkspacePopupChanged(element: HTMLElement): string;
  getComponentBounds(): Bounds;
  registerPopup(element: HTMLElement): string;
  removePopup(element: HTMLElement): void;
  removePopupById(elementId: string): void;
  subscribeForWindowFocused(cb: () => any): () => void;
  unmount(): void;
  requestFocus(): void;
  showSaveWorkspacePopup(workspaceId: string, bounds: Bounds): void;
  closeWorkspace(workspaceId: string): void;
  closeWindow(id: string): Promise<void>;
  maximizeGroup(id: string): Promise<void>;
  restoreGroup(id: string): Promise<void>;
  ejectActiveWindow(groupId: string): Promise<void>;
  showChannelsSelector(placementId: string, bounds: Bounds): Promise<void>;
  showAddApplicationPopup(workspaceId: string, groupId: string, bounds: Bounds): Promise<void>;
}

export interface Bounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width?: number;
  height?: number;
}
