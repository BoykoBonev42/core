import React, { Fragment, useCallback, useContext, useEffect, useState } from "react";
import WorkspaceTabOptionsButton from "./OptionsButton";
import LockedIcon from "./LockedIcon";
import { Workspace, WorkspaceLockConfig } from "./types";
import { WorkspaceTabComponentProps } from "../../../types/api";
import WorkspaceIconButton from "../WorkspaceIconButton";
import WorkspaceTitle from "../WorkspaceTitle";
import WorkspaceTabCloseButton from "../WorkspaceTabCloseButton";
import { GlueContext } from "@glue42/react-hooks";


const WorkspaceTabV2: React.FC<WorkspaceTabComponentProps> = ({ isPinned, title, onCloseClick, onSaveClick, icon, showSaveButton, showCloseButton, workspaceId }) => {
    const [lockConfig, setLockConfig] = useState<WorkspaceLockConfig>({});
    const glue = (window as any).glue || useContext(GlueContext);
    useEffect(() => {
        let unsub = () => { };
        let mounted = true;
        if (!glue) {
            throw new Error("The glue object should either be attached to the window or passed in the context");
        }
        glue.workspaces.getWorkspaceById(workspaceId).then((workspace: Workspace) => {
            if (mounted) {
                setLockConfig({
                    allowDrop: workspace.allowDrop,
                    allowExtract: workspace.allowExtract,
                    allowDropBottom: workspace.allowDropBottom,
                    allowSplitters: workspace.allowSplitters,
                    allowDropLeft: workspace.allowDropLeft,
                    allowWorkspaceTabExtract: workspace.allowWorkspaceTabExtract,
                    allowDropRight: workspace.allowDropRight,
                    allowWindowReorder: workspace.allowWindowReorder,
                    allowDropTop: workspace.allowDropTop,
                    allowWorkspaceTabReorder: workspace.allowWorkspaceTabReorder,
                    showAddWindowButtons: workspace.showAddWindowButtons,
                    showCloseButton: workspace.showCloseButton,
                    showEjectButtons: workspace.showEjectButtons,
                    showSaveButton: workspace.showSaveButton,
                    showWindowCloseButtons: workspace.showWindowCloseButtons
                });
            }

            workspace.onLockConfigurationChanged((config: any) => {
                if (!mounted) {
                    return;
                }
                setLockConfig({
                    allowDrop: config.allowDrop,
                    allowExtract: config.allowExtract,
                    allowDropBottom: config.allowDropBottom,
                    allowSplitters: config.allowSplitters,
                    allowDropLeft: config.allowDropLeft,
                    allowWorkspaceTabExtract: config.allowWorkspaceTabExtract,
                    allowDropRight: config.allowDropRight,
                    allowWindowReorder: config.allowWindowReorder,
                    allowDropTop: config.allowDropTop,
                    allowWorkspaceTabReorder: config.allowWorkspaceTabReorder,
                    showAddWindowButtons: config.showAddWindowButtons,
                    showCloseButton: config.showCloseButton,
                    showEjectButtons: config.showEjectButtons,
                    showSaveButton: config.showSaveButton,
                    showWindowCloseButtons: config.showWindowCloseButtons
                });
            }).then((un: any) => {
                unsub = un;
            });
        });

        return () => {
            mounted = false;
            unsub();
        }
    }, [workspaceId, glue]);

    const closeWorkspace = useCallback(() => {
        if (!glue) {
            throw new Error("The glue object should either be attached to the window or passed in the context");
        }
        glue.workspaces.getWorkspaceById(workspaceId).then((w: Workspace) => {
            return w.close();
        });
    }, [workspaceId, glue]);

    const isLocked = useCallback(() => {
        const lockConfigCopy = { ...lockConfig };

        if (!window.glue42gd) {
            delete lockConfigCopy.allowWorkspaceTabExtract;
        }

        return Object.values(lockConfigCopy).some(v => !v);
    }, [lockConfig]);

    return (
        <div className="tab-item-v2" title={title}>
            {isPinned ? <WorkspaceIconButton icon={icon} /> : <WorkspaceTabOptionsButton showSaveButton={showSaveButton} closeWorkspace={closeWorkspace} lockConfig={lockConfig} workspaceId={workspaceId} />}
            <i className="lm_left" />
            {!isPinned && <WorkspaceTitle title={title} />}
            {isLocked() ? <LockedIcon lockConfig={lockConfig} workspaceId={workspaceId} /> : <Fragment />}
            {(!isPinned && showCloseButton) && <WorkspaceTabCloseButton close={onCloseClick} />}
            <i className="lm_right" />
        </div>
    )
}

export default WorkspaceTabV2;