import React from "react";
import { GroupHeaderButtonsProps } from "../../types/defaultComponents";
import AddWindowButton from "./AddWindowButton";
import EjectButton from "./EjectButton";
import MaximizeGroupButton from "./MaximizeGroupButton";
import RestoreGroupButton from "./RestoreGroupButton";

const GroupHeaderButtons: React.FC<GroupHeaderButtonsProps> = ({ addWindow, restore, maximize, eject }) => {
    return (<>
        {addWindow.visible && <AddWindowButton {...addWindow} />}
        {eject.visible && <EjectButton {...eject} />}
        {restore.visible && <RestoreGroupButton {...restore} />}
        {maximize.visible && <MaximizeGroupButton {...maximize} />}
    </>);
};

export default GroupHeaderButtons;