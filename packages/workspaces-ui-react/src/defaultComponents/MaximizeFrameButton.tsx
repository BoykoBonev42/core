import React from "react";
import { MaximizeFrameButtonProps } from "../types/defaultComponents";
import HeaderButton from "./HeaderButton";

const MaximizeFrameButton: React.FC<MaximizeFrameButtonProps> = ({ title, children, ...props }) => {
    return <HeaderButton {...props} title={title || "maximize"} className={"lm_maximise"} id={"workspaces-maximize-frame-button"}>{children}</HeaderButton>
};

export default MaximizeFrameButton;
