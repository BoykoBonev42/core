import AddWorkspaceButton from './defaultComponents/AddWorkspaceButton';
import CloseFrameButton from './defaultComponents/CloseFrameButton';
import GlueLogo from './defaultComponents/GlueLogo';
import MaximizeFrameButton from './defaultComponents/MaximizeFrameButton';
import MinimizeFrameButton from './defaultComponents/MinimizeFrameButton';
import AddApplicationPopup from './defaultComponents/popups/addApplication/AddApplicationPopup';
import AddWorkspacePopup from './defaultComponents/popups/addWorkspace/AddWorkspacePopup';
import SaveWorkspacePopup from './defaultComponents/popups/saveWorkspace/SaveWorkspacePopup';
import WorkspaceContents from "./defaultComponents/workspace/WorkspaceContents";
import MoveArea from "./defaultComponents/MoveArea";
import useWorkspacePopup from './useWorkspacePopup';
import useWorkspaceWindowClicked from './useWorkspaceWindowClicked';

import WorkspacePopup from './WorkspacePopup';
import {
    Bounds,
} from './types/internal';

import {
    AddWorkspaceButtonProps,
    MaximizeFrameButtonProps,
    MinimizeFrameButtonProps,
    AddWorkspacePopupProps,
    SaveWorkspacePopupProps,
    AddApplicationPopupProps,
    AddWindowButtonProps,
    MaximizeGroupButtonProps,
    EjectButtonProps,
    MoveAreaProps,
    WorkspaceWindowTabProps,
    WorkspaceWindowTabCloseButtonProps,
    WorkspaceWindowTabTitleProps,
    WorkspaceWindowChannelsLinkProps,
    GroupHeaderButtonsProps
} from "./types/defaultComponents";

import {
    WorkspacesProps,
    SaveWorkspacePopupComponentProps,
    AddWorkspacePopupComponentProps,
    AddApplicationPopupComponentProps,
    WorkspaceTabComponentProps,
    showAddApplicationPopupOptions,
} from "./types/api";

import {
    WorkspaceContentsProps,
    WorkspaceLoadingAnimationProps
} from "./types/shared";

import WorkspacesElementCreationWrapper from './WorkspacesElementCreationWrapper'
import workspacesManager from './workspacesManager';
import WorkspaceTab from "./defaultComponents/workspace/WorkspaceTab";
import WorkspaceTitle from './defaultComponents/workspace/WorkspaceTitle';
import WorkspaceSaveButton from './defaultComponents/workspace/WorkspaceSaveButton';
import WorkspaceIconButton from './defaultComponents/workspace/WorkspaceIconButton';
import WorkspaceTabCloseButton from './defaultComponents/workspace/WorkspaceTabCloseButton';
import WorkspaceLoadingAnimation from './defaultComponents/WorkspaceLoadingAnimation';
import WorkspaceTabV2 from './defaultComponents/workspace/tabV2/WorkspaceTabV2';
import WorkspaceWindowChannelsSelector from './defaultComponents/groups/workspaceWindow/TabChannelsLink';
import WorkspaceWindowTabTitle from './defaultComponents/groups/workspaceWindow/TabTitle';
import WorkspaceWindowTabCloseButton from './defaultComponents/groups/workspaceWindow/TabCloseButton';
import WorkspaceWindowTab from './defaultComponents/groups/workspaceWindow/Tab';
import AddWindowButton from './defaultComponents/groups/AddWindowButton';
import EjectButton from './defaultComponents/groups/EjectButton';
import MaximizeGroupButton from './defaultComponents/groups/MaximizeGroupButton';
import RestoreGroupButton from './defaultComponents/groups/RestoreGroupButton';
import GroupHeaderButtons from './defaultComponents/groups/HeaderButtons'

export {
    SaveWorkspacePopup,
    AddWorkspacePopup,
    AddApplicationPopup,
    CloseFrameButton,
    GlueLogo,
    MaximizeFrameButton,
    MinimizeFrameButton,
    AddWorkspaceButton,
    WorkspacePopup,
    useWorkspacePopup,
    useWorkspaceWindowClicked,
    WorkspaceContents,
    MoveArea,
    WorkspaceTab,
    WorkspaceTitle,
    WorkspaceSaveButton,
    WorkspaceIconButton,
    WorkspaceTabCloseButton,
    WorkspaceLoadingAnimation,
    WorkspaceTabV2,
    WorkspaceWindowChannelsSelector,
    WorkspaceWindowTabTitle,
    WorkspaceWindowTabCloseButton,
    WorkspaceWindowTab,
    AddWindowButton,
    EjectButton,
    MaximizeGroupButton,
    RestoreGroupButton,
    GroupHeaderButtons
};
export const notifyMoveAreaChanged: () => void = () => workspacesManager?.notifyMoveAreaChanged();
export const getComponentBounds: () => Bounds = () => workspacesManager?.getComponentBounds();
export const getFrameId: () => string = () => workspacesManager?.getFrameId();
export const requestFocus: () => void = () => workspacesManager?.requestFocus();
export const showAddApplicationPopup: (options: showAddApplicationPopupOptions) => void = ({ workspaceId, groupId, bounds }) => workspacesManager.showAddApplicationPopup(workspaceId, groupId, bounds);

export {
    WorkspacesProps,
    Bounds,
    AddWorkspaceButtonProps,
    MaximizeFrameButtonProps,
    MinimizeFrameButtonProps,
    AddWindowButtonProps,
    MaximizeGroupButtonProps,
    EjectButtonProps,
    SaveWorkspacePopupComponentProps,
    AddWorkspacePopupComponentProps,
    AddApplicationPopupComponentProps,
    AddWorkspacePopupProps,
    SaveWorkspacePopupProps,
    AddApplicationPopupProps,
    WorkspaceContentsProps,
    MoveAreaProps,
    WorkspaceTabComponentProps,
    WorkspaceLoadingAnimationProps,
    WorkspaceWindowChannelsLinkProps,
    WorkspaceWindowTabTitleProps,
    WorkspaceWindowTabCloseButtonProps,
    WorkspaceWindowTabProps,
    GroupHeaderButtonsProps
};
export default WorkspacesElementCreationWrapper;