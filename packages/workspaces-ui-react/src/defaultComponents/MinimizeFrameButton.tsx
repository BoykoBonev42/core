import React from "react";
import { MinimizeFrameButtonProps } from "../types/defaultComponents";
import HeaderButton from "./HeaderButton";

const MinimizeFrameButton: React.FC<MinimizeFrameButtonProps> = ({ title, children, ...props }) => {
    return <HeaderButton {...props} title={title || "minimize"} className={"lm_minimise"} id={"workspaces-minimize-frame-button"} >{children}</HeaderButton>
};

export default MinimizeFrameButton;
