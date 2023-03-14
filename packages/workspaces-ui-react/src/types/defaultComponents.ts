import { Bounds, Size } from "./internal";

export interface ButtonProps extends React.DetailedHTMLProps<React.HtmlHTMLAttributes<HTMLLIElement>, HTMLLIElement> {
    title?: string;
    frameId?: string;
}

export interface GroupHeaderButtonProps extends ButtonProps {
    visible: boolean;
}

export type AddWorkspaceButtonProps = ButtonProps;
export type CloseFrameButtonProps = ButtonProps;
export type MinimizeFrameButtonProps = ButtonProps;
export type MaximizeFrameButtonProps = ButtonProps;

export interface RestoreGroupButtonProps extends GroupHeaderButtonProps {
    restore: () => void;
}
export interface MaximizeGroupButtonProps extends GroupHeaderButtonProps {
    maximize: () => void;
}
export interface EjectButtonProps extends GroupHeaderButtonProps {
    eject: () => void;
}
export interface AddWindowButtonProps extends GroupHeaderButtonProps {
    showPopup: (bounds: Bounds) => void;
}

export interface GlueLogoProps extends React.DetailedHTMLProps<React.HtmlHTMLAttributes<HTMLSpanElement>, HTMLSpanElement> {
    frameId?: string;
}

export interface GlueWorkspaceLoadingAnimationProps {
    workspaceId: string;
}

export interface SaveWorkspacePopupProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
    workspaceId: string,
    glue?: any,
    resizePopup: (s: Size) => void,
    hidePopup: () => void,
    buildMode?: boolean,
}

export interface AddApplicationPopupProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
    workspaceId: string;
    glue?: any;
    resizePopup: (s: Size) => void;
    hidePopup: () => void;
    boxId: string;
    frameId?: string;
    filterApps?: (glueApp: any) => boolean;
}

export interface AddWorkspacePopupProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
    frameId: string,
    glue?: any,
    filterLayouts?: (layouts: any) => boolean;
    resizePopup: (s: Size) => void,
    hidePopup: () => void
}

export interface ApplicationItemProps {
    appName: string;
    onClick?: (e: React.MouseEvent) => void;
}

export interface ApplicationListProps {
    glue: any;
    inLane: boolean;
    parent: any;
    hidePopup: () => void;
    searchTerm: string;
    updatePopupHeight: () => void;
    filterApps?: (glueApplication: any) => boolean;
}

export interface ContainerSwitchProps {
    inLane: boolean;
    setInLane: (b: boolean) => void;
    parent: any;
}

export interface WorkspaceLayoutItemProps {
    name: string,
    onClick: (e: React.MouseEvent) => void,
    onCloseClick: (e: React.MouseEvent) => void
}

export interface WorkspaceLayoutsListProps {
    glue: any;
    frameId: string;
    showFeedback: (errMsg: string) => void;
    hidePopup: () => void;
    resizePopup: () => void;
    filterLayouts?: (layout: any) => boolean;
}

export interface SaveContextCheckboxProps {
    changeChecked: (value: boolean) => void;
    refreshHeight: () => void;
}

export interface SaveWorkspaceButtonProps {
    workspaceId: string;
    inputValue: string;
    clearInput: () => void;
    showFeedback: (errorMsg: string) => void;
    shouldSaveContext: boolean;
    hideFeedback: () => void;
    glue: any;
    hidePopup: () => void;
    buildMode?: boolean;
}

export interface SaveButtonProps {
    showSavePopup: (bounds: Bounds) => void;
}

export interface WorkspaceIconButtonProps {
    icon: string;
}

export interface WorkspaceTabCloseButtonProps {
    close: () => void;
}

export interface WorkspaceTitleProps {
    title: string;
}

export interface GroupHeaderButtonsProps {
    workspaceId: string;
    groupId: string;
    addWindow: AddWindowButtonProps;
    restore: RestoreGroupButtonProps;
    maximize: MaximizeGroupButtonProps;
    eject: EjectButtonProps;
}


export type MoveAreaProps = React.DetailedHTMLProps<React.HtmlHTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export interface WorkspaceWindowTabProps {
    channels: {
        visible: boolean;
        color: string;
        showSelector: (bounds: Bounds) => void;
    };
    title: string;
    close: {
        visible: boolean;
        title: string;
        close: () => void;
    };
}

export interface WorkspaceWindowTabTitleProps {
    title: string;
}

export interface WorkspaceWindowTabCloseButtonProps {
    close: () => void;
    title: string;
}

export interface WorkspaceWindowChannelsLinkProps {
    color: string;
    showSelector: (bounds: Bounds) => void;
}

