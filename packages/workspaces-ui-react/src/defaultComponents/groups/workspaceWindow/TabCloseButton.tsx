import React, { useEffect, useRef } from "react";
import { WorkspaceWindowTabCloseButtonProps } from "../../../types/defaultComponents";

const WorkspaceWindowTabCloseButton: React.FC<WorkspaceWindowTabCloseButtonProps> = ({ title, close }) => {
    const closeBtn = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (closeBtn.current) {
            const listener = (e: Event) => {
                e.stopPropagation();
                close();
            };
            closeBtn.current.addEventListener("mousedown", listener);
            closeBtn.current.addEventListener("click", listener);
        }
    }, [closeBtn]);

    return <div title={title} ref={closeBtn} className="lm_close_tab"></div>
}

export default WorkspaceWindowTabCloseButton;