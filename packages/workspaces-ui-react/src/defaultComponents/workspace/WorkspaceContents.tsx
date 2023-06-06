import React, { useEffect } from "react";
import { WorkspaceContentsProps } from "../../types/shared";

const WorkspaceContents: React.FC<WorkspaceContentsProps> = ({ workspaceId, containerElement, frameId, ...props }) => {
    const containerRef = React.createRef<HTMLDivElement>();

    useEffect(() => {
        let workspaceContents = document.getElementById(`nestHere${workspaceId}`);
        if (!workspaceContents) {
            console.warn(`Could not find element for workspace ${workspaceId}`);
            return;
        }

        workspaceContents.style.display = "";
        containerRef.current?.appendChild(workspaceContents);

        return () => {
            workspaceContents = document.getElementById(`nestHere${workspaceId}`);
            if (!workspaceContents) {
                return;
            }
            workspaceContents.style.display = "none";
            document.body.appendChild(workspaceContents);
        }
    }, [workspaceId]);

    return (
        <div style={{ width: "100%", height: "100%" }}  {...props} ref={containerRef}>
        </div >
    );
};


export default WorkspaceContents;