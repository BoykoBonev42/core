import React from "react";
import { RestoreGroupButtonProps } from "../../types/defaultComponents";
import HeaderButton from "../HeaderButton";

const RestoreGroupButton: React.FC<RestoreGroupButtonProps> = ({ children, visible, restore, ...props }) => {
    return <HeaderButton className={"lm_maximise workspace_content lm_restore"} onClick={() => restore()} {...props} >{children}</HeaderButton>
};

export default RestoreGroupButton;
