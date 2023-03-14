import React from "react";
import { EjectButtonProps } from "../../types/defaultComponents";
import HeaderButton from "../HeaderButton";

const EjectButton: React.FC<EjectButtonProps> = ({ children, visible, eject, ...props }) => {
    return <HeaderButton className={"lm_popout"} onClick={() => eject()} {...props} > {children}</HeaderButton >
};

export default EjectButton;
