import React from "react";
import { WorkspaceLoadingAnimationProps } from "../types/shared";

const WorkspaceLoadingAnimation: React.FC<WorkspaceLoadingAnimationProps> = ({ workspaceId, ...props }) => {
    return (
        <div className="wrapper">
            <div className="inner">
                <div className="ball"></div>
                <div className="ball"></div>
            </div>
            <div className="mid">
                <div className="ball"></div>
                <div className="ball"></div>
            </div>
            <div className="text">Loading</div>
        </div>
    )
};

export default WorkspaceLoadingAnimation;
