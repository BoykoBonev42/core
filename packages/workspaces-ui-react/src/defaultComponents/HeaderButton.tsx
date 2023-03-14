import React from "react";
import { ButtonProps } from "../types/defaultComponents";

const HeaderButton: React.FC<ButtonProps> = React.forwardRef(({ children, ...props }, ref) => {
    return (
        <li ref={ref} {...props}>
            {children}
        </li>
    )
});

export default HeaderButton;
