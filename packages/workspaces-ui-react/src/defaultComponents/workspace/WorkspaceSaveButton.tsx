import React, { useEffect, useRef } from "react";
import { SaveButtonProps } from "../../types/defaultComponents";

const WorkspaceSaveButton: React.FC<SaveButtonProps> = ({ showSavePopup }) => {
    const saveButton = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (saveButton.current) {
            saveButton.current.addEventListener("mousedown", (e) => {
                e.stopPropagation();
            });

            saveButton.current.addEventListener("click", (e) => {
                e.stopPropagation();

                if (saveButton.current) {
                    const targetBounds = saveButton.current.getBoundingClientRect();
                    showSavePopup(targetBounds);
                }
            });
        }
    }, [saveButton]);

    return (
        <div ref={saveButton} className="lm_saveButton" title="save" ></div>
    )
};

export default WorkspaceSaveButton;