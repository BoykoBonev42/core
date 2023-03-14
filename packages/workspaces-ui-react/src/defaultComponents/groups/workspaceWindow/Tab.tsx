import React from "react";
import { WorkspaceWindowTabProps } from "../../../types/defaultComponents";
import WorkspaceWindowTabChannelsLink from "./TabChannelsLink";
import WorkspaceWindowTabCloseButton from "./TabCloseButton";
import WorkspaceWindowTabTitle from "./TabTitle";

const WorkspaceWindowTab: React.FC<WorkspaceWindowTabProps> = ({ channels, title, close }) => {
    return (
        <>
            {channels.visible && <WorkspaceWindowTabChannelsLink {...channels} />}
            <i className="lm_left" />
            <WorkspaceWindowTabTitle title={title} />
            {close.visible && <WorkspaceWindowTabCloseButton {...close} />}
            <i className="lm_right" />
        </>
    );
}


export default WorkspaceWindowTab;