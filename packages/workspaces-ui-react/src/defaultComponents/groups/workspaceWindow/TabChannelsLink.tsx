import React, { useRef } from "react"
import { WorkspaceWindowChannelsLinkProps } from "../../../types/defaultComponents";

const WorkspaceWindowTabChannelsLink: React.FC<WorkspaceWindowChannelsLinkProps> = (props) => {
    const linkRef = useRef<HTMLDivElement>(null);

    const onClick = () => {
        if (!linkRef.current) {
            return;
        }

        const rawBounds = linkRef.current.getBoundingClientRect();
        const bounds = {
            left: rawBounds.left,
            top: rawBounds.top,
            width: rawBounds.width,
            height: rawBounds.height
        };
        props.showSelector(bounds);
    };

    const iconColor = props.color!=="transparent" ? "inherit" : "#808079";

    return <div ref={linkRef} className="channels-link" style={{ backgroundColor: props.color }} onClick={onClick}>
        <div className="link-icon" style={{ backgroundColor: iconColor }}></div>
    </div>
}

export default WorkspaceWindowTabChannelsLink;