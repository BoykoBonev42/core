import GoldenLayout from "@glue42/golden-layout";
import componentStateMonitor from "./componentStateMonitor";
import { TabObserver } from "./layout/tabObserver";
import store from "./state/store";
import { idAsString } from "./utils";

export class WorkspacesUIExecutor {
    public static readonly HibernationIconClass = "lm_hibernationIcon";
    public static readonly SaveWorkspaceButtonLabel = "save";
    private readonly hibernatedWorkspaceIconLabel = "hibernated";

    public showWorkspaceSaveButton(options: { workspaceId?: string; workspaceTab?: GoldenLayout.Tab }): void {
        const workspaceTab = options.workspaceTab || store.getWorkspaceTabElement(options.workspaceId);

        if (workspaceTab.element.hasClass(WorkspacesUIExecutor.HibernationIconClass)) {
            return;
        }

        workspaceTab.element.children(".lm_saveButton").show();
    }

    public hideWorkspaceSaveButton(options: { workspaceId?: string; workspaceTab?: GoldenLayout.Tab }): void {
        const workspaceTab = options.workspaceTab || store.getWorkspaceTabElement(options.workspaceId);

        if (workspaceTab.element.hasClass(WorkspacesUIExecutor.HibernationIconClass)) {
            return;
        }
        workspaceTab.element.children(".lm_saveButton").hide();
    }

    public showWorkspaceIconButton(options: { workspaceId?: string; workspaceTab?: GoldenLayout.Tab; icon: string }): void {
        const workspaceTab = options.workspaceTab || store.getWorkspaceTabElement(options.workspaceId);

        if (!workspaceTab || workspaceTab.element.hasClass(WorkspacesUIExecutor.HibernationIconClass)) {
            return;
        }
        const iconButton = workspaceTab.element.children(".lm_iconButton");
        iconButton.css("display", "flex");
        iconButton.show();

        const content = workspaceTab.element.find(".lm_iconButtonContent");
        content.css("-webkit-mask-image", `url("${options.icon}")`);
    }

    public hideWorkspaceIconButton(options: { workspaceId?: string; workspaceTab?: GoldenLayout.Tab }): void {
        const workspaceTab = options.workspaceTab || store.getWorkspaceTabElement(options.workspaceId);

        if (!workspaceTab || workspaceTab.element.hasClass(WorkspacesUIExecutor.HibernationIconClass)) {
            return;
        }
        workspaceTab.element.children(".lm_iconButton").hide();
    }

    public replaceWorkspaceSaveButtonWithIcon(options: { workspaceId?: string; workspaceTab?: GoldenLayout.Tab; icon: string }): void {
        if (componentStateMonitor.decoratedFactory.createWorkspaceTabs) {
            return;
        }
        this.hideWorkspaceSaveButton(options);
        this.showWorkspaceIconButton(options);
    }

    public replaceWorkspaceIconButtonWithSave(options: { workspaceId?: string; workspaceTab?: GoldenLayout.Tab }): void {
        if (componentStateMonitor.decoratedFactory.createWorkspaceTabs) {
            return;
        }
        this.hideWorkspaceIconButton(options);
        this.showWorkspaceSaveButton(options);
    }

    public hideHibernatedIcon(options: { workspaceId?: string; workspaceTab?: GoldenLayout.Tab }): void {
        const workspaceTab = options.workspaceTab || store.getWorkspaceTabElement(options.workspaceId);

        if (!workspaceTab) {
            return;
        }
        const saveButton = workspaceTab.element.children(".lm_saveButton");
        saveButton.removeClass(WorkspacesUIExecutor.HibernationIconClass);
    }

    public showHibernationIcon(options: { workspaceId?: string; workspaceTab?: GoldenLayout.Tab }): void {
        const tab = options.workspaceTab || store.getWorkspaceTabElement(options.workspaceId);

        if (!tab) {
            return;
        }

        const saveButton = tab.element.children(".lm_saveButton");

        if (!saveButton.is(":visible")) {
            saveButton.show();
        }

        saveButton.addClass(WorkspacesUIExecutor.HibernationIconClass);
        saveButton.attr("title", this.hibernatedWorkspaceIconLabel);
    }

    public showSaveIcon(options: { workspaceId: string; workspaceTab?: GoldenLayout.Tab }): void {
        const tab = options.workspaceTab || store.getWorkspaceTabElement(options.workspaceId);
        const workspace = store.getById(options.workspaceId);

        if (!tab) {
            return;
        }

        const saveButton = tab.element.children(".lm_saveButton");
        saveButton.removeClass(WorkspacesUIExecutor.HibernationIconClass);

        saveButton.attr("title", WorkspacesUIExecutor.SaveWorkspaceButtonLabel);

        if (workspace.layout && workspace.layout.config.workspacesOptions.showSaveButton === false) {
            saveButton.hide();
        }
    }

    public showWorkspaceCloseButton(options: { workspaceId?: string; workspaceTab?: GoldenLayout.Tab }): void {
        const tab = options.workspaceTab || store.getWorkspaceTabElement(options.workspaceId);

        if (!tab) {
            return;
        }

        const closeButton = tab.element.children(".lm_close_tab");

        closeButton.show();
    }

    public hideWorkspaceCloseButton(options: { workspaceId?: string; workspaceTab?: GoldenLayout.Tab }): void {
        const tab = options.workspaceTab || store.getWorkspaceTabElement(options.workspaceId);

        if (!tab) {
            return;
        }

        const closeButton = tab.element.children(".lm_close_tab");

        closeButton.hide();
    }

    public addInvisibleStyle(transparentColor: string): void {
        const style = document.createElement("style");
        style.type = "text/css";
        style.innerHTML = `.lm_content.transparent-color { background-color: ${transparentColor}; }`;
        document.getElementsByTagName("head")[0].appendChild(style);
    }

    public makeContentInvisible(): void {
        $(".lm_item_container .lm_content .lm_item_container .lm_content").addClass("transparent-color");
    }

    public showWindowCloseButton(windowId: string | GoldenLayout.Component): void {
        if (componentStateMonitor.decoratedFactory.createWorkspaceWindowTabs) {
            return;
        }
        let windowContentItem;
        if (typeof windowId === "string") {
            windowContentItem = store.getWindowContentItem(windowId);
        } else {
            windowContentItem = windowId;
        }

        windowContentItem.tab.closeElement.show();
    }

    public hideWindowCloseButton(windowId: string | GoldenLayout.Component): void {
        if (componentStateMonitor.decoratedFactory.createWorkspaceWindowTabs) {
            return;
        }
        let windowContentItem;
        if (typeof windowId === "string") {
            windowContentItem = store.getWindowContentItem(windowId);
        } else {
            windowContentItem = windowId;
        }

        windowContentItem.tab.closeElement.hide();
    }

    public showMaximizeButton(itemId: string | GoldenLayout.Stack): void {
        if (componentStateMonitor.decoratedFactory.createGroupHeaderButtons) {
            return;
        }
        let containerContentItem;
        if (typeof itemId === "string") {
            containerContentItem = store.getContainer(itemId);
        } else {
            containerContentItem = itemId;
        }

        if (containerContentItem.type !== "stack") {
            throw new Error(`Cannot show maximize button of ${containerContentItem.type} ${containerContentItem.config.id}`);
        }

        const maximiseButton = containerContentItem.header.element.children(".lm_controls").children(".lm_maximise");

        maximiseButton?.show();
    }

    public hideMaximizeButton(itemId: string | GoldenLayout.Stack): void {
        if (componentStateMonitor.decoratedFactory.createGroupHeaderButtons) {
            return;
        }
        let containerContentItem;
        if (typeof itemId === "string") {
            containerContentItem = store.getContainer(itemId);
        } else {
            containerContentItem = itemId;
        }

        if (containerContentItem.type !== "stack") {
            throw new Error(`Cannot hide maximize button of ${containerContentItem.type} ${containerContentItem.config.id}`);
        }

        const maximiseButton = containerContentItem.header.element.children(".lm_controls").children(".lm_maximise");

        maximiseButton?.hide();
    }

    public showEjectButton(itemId: string | GoldenLayout.Stack): void {
        if (componentStateMonitor.decoratedFactory.createGroupHeaderButtons) {
            return;
        }
        let containerContentItem;
        if (typeof itemId === "string") {
            containerContentItem = store.getContainer(itemId);
        } else {
            containerContentItem = itemId;
        }

        if (containerContentItem.type !== "stack") {
            throw new Error(`Cannot show eject button of ${containerContentItem.type} ${containerContentItem.config.id}`);
        }
        const ejectButton = containerContentItem.header.element.children(".lm_controls").children(".lm_popout");

        ejectButton?.show();
    }

    public hideEjectButton(itemId: string | GoldenLayout.Stack): void {
        if (componentStateMonitor.decoratedFactory.createGroupHeaderButtons) {
            return;
        }
        let containerContentItem;
        if (typeof itemId === "string") {
            containerContentItem = store.getContainer(itemId);
        } else {
            containerContentItem = itemId;
        }

        if (containerContentItem.type !== "stack") {
            throw new Error(`Cannot hide eject button of ${containerContentItem.type} ${containerContentItem.config.id}`);
        }
        const ejectButton = containerContentItem.header.element.children(".lm_controls").children(".lm_popout");

        ejectButton?.hide();
    }

    public showAddWindowButton(itemId: string | GoldenLayout.Stack): void {
        if (componentStateMonitor.decoratedFactory.createGroupHeaderButtons) {
            return;
        }
        let containerContentItem;
        if (typeof itemId === "string") {
            containerContentItem = store.getContainer(itemId);
        } else {
            containerContentItem = itemId;
        }

        if (containerContentItem.type !== "stack") {
            throw new Error(`Cannot show add window button of ${containerContentItem.type} ${containerContentItem.config.id}`);
        }

        if (containerContentItem.config.workspacesConfig.showAddWindowButton === false) {
            return;
        }

        const button = containerContentItem.header.element.children(".lm_controls").children(".lm_add_button");
        button?.show();
    }

    public hideAddWindowButton(itemId: string | GoldenLayout.Stack): void {
        if (componentStateMonitor.decoratedFactory.createGroupHeaderButtons) {
            return;
        }
        let containerContentItem;
        if (typeof itemId === "string") {
            containerContentItem = store.getContainer(itemId);
        } else {
            containerContentItem = itemId;
        }

        if (containerContentItem.type !== "stack") {
            throw new Error(`Cannot hide add window button of ${containerContentItem.type} ${containerContentItem.config.id}`);
        }
        const button = containerContentItem.header.element.children(".lm_controls").children(".lm_add_button");
        button?.hide();
    }

    public showWindowCloseButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        if (!workspace?.layout) {
            return;
        }

        const allComponentItems = workspace.layout.root.getItemsByType("component");

        allComponentItems.forEach((componentItem) => {
            this.showWindowCloseButton(idAsString(componentItem.config.id));
        });
    }

    public hideWindowCloseButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        if (!workspace?.layout) {
            return;
        }

        const allComponentItems = workspace.layout.root.getItemsByType("component");

        allComponentItems.forEach((componentItem) => {
            this.hideWindowCloseButton(idAsString(componentItem.config.id));
        });
    }

    public showEjectButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        if (!workspace?.layout) {
            return;
        }

        const allComponentItems = workspace.layout.root.getItemsByType("stack");

        allComponentItems.forEach((stackItem) => {
            this.showEjectButton(idAsString(stackItem.config.id));
        });
    }

    public hideEjectButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        if (!workspace?.layout) {
            return;
        }

        const allComponentItems = workspace.layout.root.getItemsByType("stack");

        allComponentItems.forEach((stackItem) => {
            this.hideEjectButton(idAsString(stackItem.config.id));
        });
    }

    public showAddWindowButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        if (!workspace?.layout) {
            return;
        }

        const allComponentItems = workspace.layout.root.getItemsByType("stack");

        allComponentItems.forEach((stackItem) => {
            this.showAddWindowButton(idAsString(stackItem.config.id));
        });
    }

    public hideAddWindowButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        if (!workspace?.layout) {
            return;
        }

        const allComponentItems = workspace.layout.root.getItemsByType("stack");

        allComponentItems.forEach((stackItem) => {
            this.hideAddWindowButton(idAsString(stackItem.config.id));
        });
    }

    public hideWorkspaceRootItem(workspaceId: string) {
        const workspace = store.getById(workspaceId);

        if (!workspace?.layout) {
            return;
        }

        $((workspace.layout.root.contentItems[0].element as any)[0]).hide();
    }

    public showWorkspaceRootItem(workspaceId: string, tabObserver: TabObserver) {
        const workspace = store.getById(workspaceId);

        if (!workspace?.layout) {
            return;
        }

        $((workspace.layout.root.contentItems[0].element as any)[0]).show();
        workspace.layout.root.getItemsByType("stack").forEach((s: GoldenLayout.Stack) => {
            tabObserver.refreshTabsMaxWidth(s.header.tabsContainer);
        });
    }

    public waitForTransition(element: HTMLElement): Promise<void> {
        if (!this.hasTransition(element)) {
            return Promise.resolve();
        }

        return new Promise<void>((res) => {
            let unsub = (): void => {
                // do nothing
            };

            const transitionEnd = (e: TransitionEvent): void => {
                if (!e.pseudoElement && (e as any).path[0] === element) {
                    res();
                    unsub();
                }
            };

            const transitionCancel = (e: TransitionEvent): void => {
                if (!e.pseudoElement && (e as any).path[0] === element) {
                    res();
                    unsub();
                }
            };

            unsub = (): void => {
                element.removeEventListener("transitionend", transitionEnd);
                element.removeEventListener("transitioncancel", transitionCancel);
            };

            element.addEventListener("transitionend", transitionEnd);
            element.addEventListener("transitioncancel", transitionCancel);
        });
    }

    public getWorkspaceLayoutContainerId(workspaceId: string) {
        return `nestHere${workspaceId}`;
    }

    public getWorkspaceLayoutContainer(workspaceId: string): HTMLElement {
        return $(`#${this.getWorkspaceLayoutContainerId(workspaceId)}`)[0];
    }

    public changeTheme(themeName: string, allThemes: string[]): void {
        const htmlTag = $("html");

        allThemes.forEach((t) => htmlTag.removeClass(t));

        htmlTag.addClass(themeName);
    }

    private hasTransition(element: HTMLElement): boolean {
        const transition = window.getComputedStyle(element, null).getPropertyValue("transition");

        return transition !== "all 0s ease 0s";
    }
}

export default new WorkspacesUIExecutor();
