import { CSSProperties, RefObject } from "react";
import { PopupActions, PopupProps } from "reactjs-popup/dist/types";
import { Bounds, Size } from "./internal";
import { WorkspaceContentsProps, WorkspaceLoadingAnimationProps } from "./shared";

//#region FrameHeader

export interface HeaderComponentProps {
    frameId: string;
    [k: string]: any;
}

export interface WorkspaceTabComponentProps {
    workspaceId: string;
    isSelected: boolean;
    isPinned: boolean;
    title: string;
    icon: string;
    showSaveButton: boolean;
    showCloseButton: boolean;
    layoutName: string;
    onCloseClick: () => void;
    onSaveClick: (bounds: Bounds) => void;
}

//#endregion

//#region GroupHeader

export interface GroupHeaderButtonProps {
    visible: boolean;
    title: string;
}

export interface ChannelsGroupHeaderButtonProps extends GroupHeaderButtonProps {
    color: string;
    showSelector: (bounds: Bounds) => void;
}

export interface CloseWorkspaceWindowTabButtonProps extends GroupHeaderButtonProps {
    close: () => void;
}

export interface AddWindowGroupHeaderButtonProps extends GroupHeaderButtonProps {
    showPopup: (bounds: Bounds) => void;
}

export interface MaximizeGroupHeaderButtonProps extends GroupHeaderButtonProps {
    maximize: () => void;
}

export interface RestoreGroupHeaderButtonProps extends GroupHeaderButtonProps {
    restore: () => void;
}

export interface EjectGroupHeaderButtonProps extends GroupHeaderButtonProps {
    eject: () => void;
}

export interface GroupHeaderComponentProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
    groupId: string;
    workspaceId: string;
}

export interface WorkspaceWindowTabComponentProps extends GroupHeaderComponentProps {
    isSelected: boolean;
    elementId: string;
    windowId: string;
    title: string;
    channels: ChannelsGroupHeaderButtonProps;
    close: CloseWorkspaceWindowTabButtonProps;
}

export interface GroupHeaderButtonsComponentProps extends GroupHeaderComponentProps {
    addWindow: AddWindowGroupHeaderButtonProps;
    maximize: MaximizeGroupHeaderButtonProps;
    restore: RestoreGroupHeaderButtonProps;
    eject: EjectGroupHeaderButtonProps;
}

//#endregion

//#region Popups
export interface AddWorkspacePopupComponentProps {
    frameId: string;
    resizePopup: (s: Size) => void;
    hidePopup: () => void;
    glue?: any;
}

export interface AddApplicationPopupComponentProps {
    workspaceId: string;
    boxId: string;
    resizePopup: (s: Size) => void;
    hidePopup: () => void;
    glue?: any;
}

export interface SaveWorkspacePopupComponentProps {
    workspaceId: string;
    resizePopup: (s: Size) => void;
    hidePopup: () => void;
    glue?: any;
}

export interface WorkspacePopupProps extends Omit<PopupProps, "ref"> {
    // bounds: Bounds;
    innerContentStyle?: CSSProperties;
    popupRef?: RefObject<PopupActions>;
}

export interface showAddApplicationPopupOptions {
    workspaceId: string;
    groupId: string;
    bounds: Bounds;
}
//#endregion

export interface WorkspacesProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
    components?: {
        header?: {
            LogoComponent?: React.ComponentType<HeaderComponentProps>;
            WorkspaceTabComponent?: React.ComponentType<WorkspaceTabComponentProps>;
            AddWorkspaceComponent?: React.ComponentType<HeaderComponentProps>;
            SystemButtonsComponent?: React.ComponentType<HeaderComponentProps>;
        };
        WorkspaceContents?: React.ComponentType<WorkspaceContentsProps>;
        groupHeader?: {
            BeforeTabsComponent?: React.ComponentType<GroupHeaderComponentProps>;
            WorkspaceWindowTabComponent?: React.ComponentType<WorkspaceWindowTabComponentProps>;
            AfterTabsComponent?: React.ComponentType<GroupHeaderComponentProps>;
            ButtonsComponent?: React.ComponentType<GroupHeaderButtonsComponentProps>;
        };
        popups?: {
            SaveWorkspaceComponent?: React.ComponentType<SaveWorkspacePopupComponentProps> | string;
            AddApplicationComponent?: React.ComponentType<AddApplicationPopupComponentProps> | string;
            AddWorkspaceComponent?: React.ComponentType<AddWorkspacePopupComponentProps> | string;
        };
        loadingAnimation?: {
            Workspace?: React.ComponentType<WorkspaceLoadingAnimationProps>;
        }
    };
    glue?: any;
}