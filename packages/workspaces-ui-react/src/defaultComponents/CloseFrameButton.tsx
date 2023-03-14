import React from "react";
import { CloseFrameButtonProps } from "../types/defaultComponents";
import HeaderButton from "./HeaderButton";

const CloseFrameButton: React.FC<CloseFrameButtonProps> = ({ title, children, ...props }) => {
    return <HeaderButton {...props} title={title || "close"} className={"lm_close"} id={"workspaces-close-frame-button"}>{children}</HeaderButton>
};

export default CloseFrameButton;
