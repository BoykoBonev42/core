import React from "react";
import { AddWorkspaceButtonProps } from "../types/defaultComponents";
import HeaderButton from "./HeaderButton";

const AddWorkspaceButton: React.FC<AddWorkspaceButtonProps> = ({ title, children, ...props }) => {
    return <HeaderButton {...props} title={title || "add workspace"} className={"lm_add_button"} id={"workspaces-add-workspace-button"} >{children}</HeaderButton>
};

export default AddWorkspaceButton;
