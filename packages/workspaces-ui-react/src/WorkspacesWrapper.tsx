import React, { useEffect, useRef } from "react";
import { WorkspacesWrapperProps } from "./types/internal";
import withGlueInstance from "./withGlueInstance";
import workspacesManager from "./workspacesManager";

const templateId = "workspaces-react-wrapper-template";
const workspacesInnerContainerId = "outter-layout-container";

const WorkspacesWrapper: React.FC<WorkspacesWrapperProps> = ({ shouldInit, glue, ...props }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let placeholder = document.getElementById(templateId) as HTMLTemplateElement;
        if (!placeholder) {
            const template = document.createElement("template");
            template.id = templateId;
            const glContainer = document.createElement("div");

            glContainer.id = workspacesInnerContainerId;
            glContainer.style.overflow = "hidden";
            glContainer.style.width = "100%";
            glContainer.style.height = "100%";
            template.content.appendChild(glContainer);
            document.body.appendChild(template);
            placeholder = template;
        }
        if (!containerRef.current) {
            return;
        }
        containerRef.current.appendChild(placeholder.content);

        if (!shouldInit) {
            return;
        }
        const componentFactory = {
            // Create
            createLogo: props.onCreateLogoRequested,
            createWorkspaceTabs: props.onCreateWorkspaceTabRequested,
            createAddWorkspace: props.onCreateAddWorkspaceRequested,
            createSystemButtons: props.onCreateSystemButtonsRequested,

            createWorkspaceContents: props.onCreateWorkspaceContentsRequested,

            createBeforeGroupTabs: props.onCreateBeforeGroupTabsRequested,
            createWorkspaceWindowTabs: props.onCreateWorkspaceWindowTabRequested,
            createAfterGroupTabs: props.onCreateAfterGroupTabsRequested,
            createGroupHeaderButtons: props.onCreateGroupHeaderButtonsRequested,

            createSaveWorkspacePopup: props.onCreateSaveWorkspacePopupRequested,
            createAddApplicationPopup: props.onCreateAddApplicationPopupRequested,
            createAddWorkspacePopup: props.onCreateAddWorkspacePopupRequested,

            createWorkspaceLoadingAnimation: props.onCreateWorkspaceLoadingAnimationRequested,
            // Update
            updateWorkspaceTabs: props.onUpdateWorkspaceTabsRequested,
            updateWorkspaceWindowTabs: props.onUpdateWorkspaceWindowTabsRequested,
            updateGroupHeaderButtons: props.onUpdateGroupHeaderButtonsRequested,
            // Remove
            removeWorkspaceTabs: props.onRemoveWorkspaceTabsRequested,
            removeWorkspaceContents: props.onRemoveWorkspaceContentsRequested,
            removeBeforeGroupTabs: props.onRemoveBeforeGroupTabsRequested,
            removeWorkspaceWindowTab: props.onRemoveWorkspaceWindowTabRequested,
            removeAfterGroupTabs: props.onRemoveAfterGroupTabsRequested,
            removeGroupHeaderButtons: props.onRemoveGroupHeaderButtonsRequested,
            removeWorkspaceLoadingAnimation: props.onRemoveWorkspaceLoadingAnimationRequested,
            // Misc
            hideSystemPopups: props.onHideSystemPopupsRequested,
            externalPopupApplications: props.externalPopupApplications
        };
        workspacesManager.init(glue, componentFactory);

        return () => {
            let placeholder = document.getElementById(templateId) as HTMLTemplateElement;

            if (!containerRef.current) {
                return;
            }

            placeholder?.content.appendChild(containerRef.current.children[0]);

            workspacesManager.unmount();
        }
    }, [shouldInit]);

    return (
        <div ref={containerRef} style={{ overflow: "hidden", width: "100%", height: "100%" }}>

        </div>
    );
}

export default withGlueInstance(WorkspacesWrapper);