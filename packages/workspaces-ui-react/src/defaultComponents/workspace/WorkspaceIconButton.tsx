import React from "react";
import { WorkspaceIconButtonProps } from "../../types/defaultComponents";

const WorkspaceIconButton: React.FC<WorkspaceIconButtonProps> = ({ icon, ...rest }) => {
    const style = {
        display: "flex",
        WebkitMaskImage: `url("${icon}")`
    };
    return <div className="lm_iconButton" style={{
        display: "flex"
    }} {...rest}>
        <span className="lm_iconButtonContent" style={style}></span>
    </div>
}

export default WorkspaceIconButton;