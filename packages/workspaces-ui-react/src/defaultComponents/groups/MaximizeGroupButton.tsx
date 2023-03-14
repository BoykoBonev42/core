import React from "react";
import { MaximizeGroupButtonProps } from "../../types/defaultComponents";
import HeaderButton from "../HeaderButton";

const MaximizeGroupButton: React.FC<MaximizeGroupButtonProps> = ({ children, visible, maximize, ...props }) => {
    return <HeaderButton className={"lm_maximise workspace_content"} onClick={() => maximize()} {...props} >{children}</HeaderButton>
};

export default MaximizeGroupButton;
