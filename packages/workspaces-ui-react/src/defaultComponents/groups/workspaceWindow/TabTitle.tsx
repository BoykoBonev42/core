import React from "react";
import { WorkspaceWindowTabTitleProps } from "../../../types/defaultComponents";

const WorkspaceWindowTabTitle: React.FC<WorkspaceWindowTabTitleProps> = ({ title }) => {
    return (
        <span className="lm_title" style={{ maxWidth: "150px" }}>{title}</span>
    )
}

export default WorkspaceWindowTabTitle;