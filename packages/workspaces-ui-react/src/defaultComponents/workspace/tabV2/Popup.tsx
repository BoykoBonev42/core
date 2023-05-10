import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import workspacesManagerDecorator from "../../../workspacesManager";
import { Size } from "../../../types/internal";
import useWorkspaceWindowClicked from "../../../useWorkspaceWindowClicked";
import { WorkspaceLockConfig } from "./types";

interface PopupProps {
    buttonBounds: { left: number, top: number, right: number, bottom: number };
    workspaceId: string;
    lockConfig: WorkspaceLockConfig;
    children?: React.ReactNode;
    hidePopup: () => void;
}

interface PopupChildProps {
    resizePopup: (size: Size) => void;
}

const WorkspaceTabV2Popup: React.FC<PopupProps> = ({ workspaceId, buttonBounds, lockConfig, hidePopup, children }) => {
    const [size, setSize] = useState({ height: 230, width: 200 });

    const normalizeBounds = (left: number, top: number, size: Size) => {
        const windowWidth = window.innerWidth;
        let normalizedLeft = left;
        if (left + size.width! > windowWidth) {
            const horizontalOverflow = left + size.width! - windowWidth;
            normalizedLeft = Math.max(0, normalizedLeft - horizontalOverflow);
        }

        const windowHeight = window.innerHeight;
        let normalizedTop = top;
        if (top + size.height! > windowHeight) {
            const verticalOverflow = top + size.height! - windowHeight;
            normalizedTop = Math.max(0, normalizedTop - verticalOverflow);
        }

        return {
            left: normalizedLeft,
            top: normalizedTop,
            ...size
        }
    }
    const normalizedBounds = normalizeBounds(buttonBounds.left, buttonBounds.bottom, size);
    const style: React.HTMLAttributes<HTMLDivElement>["style"] = {
        left: normalizedBounds.left,
        top: normalizedBounds.top,
        height: size.height,
        width: size.width,
    };

    const backgroundElementStyle: React.HTMLAttributes<HTMLDivElement>["style"] = {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: "transparent",
        zIndex: 98
    };

    const resizePopup = useCallback((size: Size) => {
        setSize(s => ({
            height: (size.height ?? s.height) + 2, // 2 is for border 
            width: (size.width ?? s.width) + 2
        }));
    }, []);

    useEffect(() => {
        workspacesManagerDecorator.requestFocus();
    }, []);

    useWorkspaceWindowClicked(() => {
        hidePopup();
    });

    useEffect(() => {
        window.addEventListener("resize", hidePopup);
        return () => {
            window.removeEventListener("resize", hidePopup);
        }
    }, [hidePopup]);

    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement<PopupChildProps>(child as React.ReactElement<any, string | React.JSXElementConstructor<any>>, { resizePopup });
        }
        return child;
    });

    return ReactDOM.createPortal(<div onClick={() => hidePopup()} style={backgroundElementStyle}>
        <div onClick={(e) => e.stopPropagation()} style={style} className="workspace-tab-popup">
            {childrenWithProps}
        </div>
    </div>
        , document.body);
}

export default WorkspaceTabV2Popup;