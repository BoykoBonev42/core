import React, { useEffect, useRef } from "react";
import { AddWindowButtonProps } from "../../types/defaultComponents";
import HeaderButton from "../HeaderButton";

const AddWindowButton: React.FC<AddWindowButtonProps> = ({ children, visible, showPopup, ...props }) => {
    const ref = useRef<HTMLLIElement>(null);

    useEffect(() => {
        if (!ref.current) {
            return;
        }

        const onClick = (e: MouseEvent) => {
            e.stopPropagation();

            const rawBounds = ref.current!.getBoundingClientRect();

            showPopup({
                left: rawBounds.left,
                top: rawBounds.bottom,
                width: rawBounds.width,
                height: rawBounds.height,
            });
        }

        ref.current.addEventListener("click", onClick);
    }, [ref]);

    return <HeaderButton ref={ref} className={"lm_add_button"} {...props}  >{children}</HeaderButton>
};

export default AddWindowButton;
