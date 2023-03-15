import React from "react";
import { WorkspaceTabComponentProps } from "../../types/api";
import SaveButton from "./WorkspaceSaveButton";
import WorkspaceIconButton from "./WorkspaceIconButton";
import WorkspaceTabCloseButton from "./WorkspaceTabCloseButton";
import WorkspaceTitle from "./WorkspaceTitle";

const WorkspaceTab: React.FC<WorkspaceTabComponentProps> = ({ isPinned, title, onCloseClick, onSaveClick, icon, showSaveButton, showCloseButton }) => {
    return (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", width: "100%" }} title={title}>
            {isPinned ? <WorkspaceIconButton icon={icon} /> : showSaveButton && <SaveButton showSavePopup={onSaveClick} />}
            <i className="lm_left" />
            {!isPinned && <WorkspaceTitle title={title} />}
            {(!isPinned && showCloseButton) && <WorkspaceTabCloseButton close={onCloseClick} />}
            <i className="lm_right" />
        </div>

    )
}

export default WorkspaceTab;