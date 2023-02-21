import { Glue42Workspaces } from "@glue42/workspaces-api";
import { Decoder, string, number, object, constant, oneOf, optional, array, boolean, anyJson, lazy } from "decoder-validate";
import { Glue42Web } from "../../web";
import { AppsImportOperation, AppHelloSuccess, ApplicationData, ApplicationStartConfig, AppManagerOperationTypes, AppRemoveConfig, BaseApplicationData, BasicInstanceData, InstanceData, AppsExportOperation, FDC3Definition, AppDirectoryStateChange } from "../appManager/protocol";
import { AllLayoutsFullConfig, AllLayoutsSummariesResult, GetAllLayoutsConfig, LayoutsImportConfig, LayoutsOperationTypes, OptionalSimpleLayoutResult, RestoreLayoutConfig, SaveLayoutConfig, SaveRequestClientResponse, PlatformSaveRequestConfig, SimpleLayoutConfig, SimpleLayoutResult, PermissionStateResult, SimpleAvailabilityResult } from "../layouts/protocol";
import { HelloSuccess, OpenWindowConfig, CoreWindowData, WindowHello, WindowOperationTypes, SimpleWindowCommand, WindowTitleConfig, WindowBoundsResult, WindowMoveResizeConfig, WindowUrlResult, FrameWindowBoundsResult, FocusEventData } from "../windows/protocol";
import { IntentsOperationTypes, WrappedIntentFilter, WrappedIntents } from "../intents/protocol";
import { IntentResolverResponse, LibDomains, OperationCheckConfig, OperationCheckResult, SimpleItemIdRequest, WorkspaceFrameBoundsResult, IntentRequestWithResolverInfo, IntentRequestResolverConfig } from "./types";
import { AllNotificationsData, NotificationEventPayload, NotificationsOperationTypes, PermissionQueryResult, PermissionRequestResult, RaiseNotification, SimpleNotificationData, SimpleNotificationSelect } from "../notifications/protocol";
import { AllThemesResponse, SelectThemeConfig, SimpleThemeResponse } from "../themes/protocol";

export const nonEmptyStringDecoder: Decoder<string> = string().where((s) => s.length > 0, "Expected a non-empty string");
export const nonNegativeNumberDecoder: Decoder<number> = number().where((num) => num >= 0, "Expected a non-negative number");

export const libDomainDecoder: Decoder<LibDomains> = oneOf<"system" | "windows" | "appManager" | "layouts" | "intents" | "notifications" | "channels" | "extension" | "themes">(
    constant("system"),
    constant("windows"),
    constant("appManager"),
    constant("layouts"),
    constant("intents"),
    constant("notifications"),
    constant("channels"),
    constant("extension"),
    constant("themes")
);

export const windowOperationTypesDecoder: Decoder<WindowOperationTypes> = oneOf<"openWindow" | "getBounds" | "getFrameBounds" | "windowHello" | "windowAdded" | "windowRemoved" | "getUrl" | "moveResize" | "focus" | "close" | "getTitle" | "setTitle" | "focusChange">(
    constant("openWindow"),
    constant("windowHello"),
    constant("windowAdded"),
    constant("windowRemoved"),
    constant("getBounds"),
    constant("getFrameBounds"),
    constant("getUrl"),
    constant("moveResize"),
    constant("focus"),
    constant("close"),
    constant("getTitle"),
    constant("setTitle"),
    constant("focusChange")
);

export const appManagerOperationTypesDecoder: Decoder<AppManagerOperationTypes> = oneOf<"appHello" | "appDirectoryStateChange" | "instanceStarted" | "instanceStopped" | "applicationStart" | "instanceStop" | "clear">(
    constant("appHello"),
    constant("appDirectoryStateChange"),
    constant("instanceStarted"),
    constant("instanceStopped"),
    constant("applicationStart"),
    constant("instanceStop"),
    constant("clear")
);

export const layoutsOperationTypesDecoder: Decoder<LayoutsOperationTypes> = oneOf<"layoutAdded" | "layoutChanged" | "layoutRemoved" | "get" | "getAll" | "export" | "import" | "remove" | "clientSaveRequest" | "getGlobalPermissionState" | "requestGlobalPermission" | "checkGlobalActivated">(
    constant("layoutAdded"),
    constant("layoutChanged"),
    constant("layoutRemoved"),
    constant("get"),
    constant("getAll"),
    constant("export"),
    constant("import"),
    constant("remove"),
    constant("clientSaveRequest"),
    constant("getGlobalPermissionState"),
    constant("checkGlobalActivated"),
    constant("requestGlobalPermission")
);

export const notificationsOperationTypesDecoder: Decoder<NotificationsOperationTypes> = oneOf<"raiseNotification" | "requestPermission" | "notificationShow" | "notificationClick" | "getPermission" | "list" | "notificationRaised" | "notificationClosed" | "click" | "clear" | "clearAll">(
    constant("raiseNotification"),
    constant("requestPermission"),
    constant("notificationShow"),
    constant("notificationClick"),
    constant("getPermission"),
    constant("list"),
    constant("notificationRaised"),
    constant("notificationClosed"),
    constant("click"),
    constant("clear"),
    constant("clearAll")
);

export const windowRelativeDirectionDecoder: Decoder<Glue42Web.Windows.RelativeDirection> = oneOf<"top" | "left" | "right" | "bottom">(
    constant("top"),
    constant("left"),
    constant("right"),
    constant("bottom")
);

export const windowBoundsDecoder: Decoder<Glue42Web.Windows.Bounds> = object({
    top: number(),
    left: number(),
    width: nonNegativeNumberDecoder,
    height: nonNegativeNumberDecoder
});

export const windowOpenSettingsDecoder: Decoder<Glue42Web.Windows.Settings | undefined> = optional(object({
    top: optional(number()),
    left: optional(number()),
    width: optional(nonNegativeNumberDecoder),
    height: optional(nonNegativeNumberDecoder),
    context: optional(anyJson()),
    relativeTo: optional(nonEmptyStringDecoder),
    relativeDirection: optional(windowRelativeDirectionDecoder),
    windowId: optional(nonEmptyStringDecoder),
    layoutComponentId: optional(nonEmptyStringDecoder)
}));

export const openWindowConfigDecoder: Decoder<OpenWindowConfig> = object({
    name: nonEmptyStringDecoder,
    url: nonEmptyStringDecoder,
    options: windowOpenSettingsDecoder
});

export const windowHelloDecoder: Decoder<WindowHello> = object({
    windowId: optional(nonEmptyStringDecoder)
});

export const coreWindowDataDecoder: Decoder<CoreWindowData> = object({
    windowId: nonEmptyStringDecoder,
    name: nonEmptyStringDecoder
});

export const simpleWindowDecoder: Decoder<SimpleWindowCommand> = object({
    windowId: nonEmptyStringDecoder
});

export const helloSuccessDecoder: Decoder<HelloSuccess> = object({
    windows: array(coreWindowDataDecoder),
    isWorkspaceFrame: boolean()
});


export const windowTitleConfigDecoder: Decoder<WindowTitleConfig> = object({
    windowId: nonEmptyStringDecoder,
    title: string()
});

export const focusEventDataDecoder: Decoder<FocusEventData> = object({
    windowId: nonEmptyStringDecoder,
    hasFocus: boolean()
});

export const windowMoveResizeConfigDecoder: Decoder<WindowMoveResizeConfig> = object({
    windowId: nonEmptyStringDecoder,
    top: optional(number()),
    left: optional(number()),
    width: optional(nonNegativeNumberDecoder),
    height: optional(nonNegativeNumberDecoder),
    relative: optional(boolean())
});

export const windowBoundsResultDecoder: Decoder<WindowBoundsResult> = object({
    windowId: nonEmptyStringDecoder,
    bounds: object({
        top: number(),
        left: number(),
        width: nonNegativeNumberDecoder,
        height: nonNegativeNumberDecoder
    })
});

export const frameWindowBoundsResultDecoder: Decoder<FrameWindowBoundsResult> = object({
    bounds: object({
        top: number(),
        left: number(),
        width: nonNegativeNumberDecoder,
        height: nonNegativeNumberDecoder
    })
});

export const windowUrlResultDecoder: Decoder<WindowUrlResult> = object({
    windowId: nonEmptyStringDecoder,
    url: nonEmptyStringDecoder
});

export const anyDecoder: Decoder<unknown> = anyJson();

export const boundsDecoder: Decoder<Partial<Glue42Web.Windows.Bounds>> = object({
    top: optional(number()),
    left: optional(number()),
    width: optional(nonNegativeNumberDecoder),
    height: optional(nonNegativeNumberDecoder)
});

export const instanceDataDecoder: Decoder<InstanceData> = object({
    id: nonEmptyStringDecoder,
    applicationName: nonEmptyStringDecoder
});

export const applicationDetailsDecoder: Decoder<Glue42Web.AppManager.DefinitionDetails> = object({
    url: nonEmptyStringDecoder,
    top: optional(number()),
    left: optional(number()),
    width: optional(nonNegativeNumberDecoder),
    height: optional(nonNegativeNumberDecoder)
});

export const intentDefinitionDecoder: Decoder<Glue42Web.AppManager.Intent> = object({
    name: nonEmptyStringDecoder,
    displayName: optional(string()),
    contexts: optional(array(string())),
    customConfig: optional(object())
});

export const fdc3AppDefinitionDecoder: Decoder<FDC3Definition> = object({
    name: nonEmptyStringDecoder,
    title: optional(nonEmptyStringDecoder),
    version: optional(nonEmptyStringDecoder),
    appId: optional(nonEmptyStringDecoder),
    manifest: nonEmptyStringDecoder,
    manifestType: nonEmptyStringDecoder,
    tooltip: optional(nonEmptyStringDecoder),
    description: optional(nonEmptyStringDecoder),
    contactEmail: optional(nonEmptyStringDecoder),
    supportEmail: optional(nonEmptyStringDecoder),
    publisher: optional(nonEmptyStringDecoder),
    images: optional(array(object({ url: optional(nonEmptyStringDecoder) }))),
    icons: optional(array(object({ icon: optional(nonEmptyStringDecoder) }))),
    customConfig: anyJson(),
    intents: optional(array(intentDefinitionDecoder))
});

export const applicationDefinitionDecoder: Decoder<Glue42Web.AppManager.Definition> = object({
    name: nonEmptyStringDecoder,
    type: nonEmptyStringDecoder.where((s) => s === "window", "Expected a value of window"),
    title: optional(nonEmptyStringDecoder),
    version: optional(nonEmptyStringDecoder),
    customProperties: optional(anyJson()),
    icon: optional(string()),
    caption: optional(string()),
    details: applicationDetailsDecoder,
    intents: optional(array(intentDefinitionDecoder)),
    hidden: optional(boolean())
});

export const allApplicationDefinitionsDecoder: Decoder<Glue42Web.AppManager.Definition | FDC3Definition> = oneOf<Glue42Web.AppManager.Definition | FDC3Definition>(
    applicationDefinitionDecoder,
    fdc3AppDefinitionDecoder
);

export const appsImportOperationDecoder: Decoder<AppsImportOperation> = object({
    definitions: array(allApplicationDefinitionsDecoder),
    mode: oneOf<"replace" | "merge">(
        constant("replace"),
        constant("merge")
    )
});

export const appRemoveConfigDecoder: Decoder<AppRemoveConfig> = object({
    name: nonEmptyStringDecoder
});

export const appsExportOperationDecoder: Decoder<AppsExportOperation> = object({
    definitions: array(applicationDefinitionDecoder)
});

export const applicationDataDecoder: Decoder<ApplicationData> = object({
    name: nonEmptyStringDecoder,
    type: nonEmptyStringDecoder.where((s) => s === "window", "Expected a value of window"),
    instances: array(instanceDataDecoder),
    userProperties: optional(anyJson()),
    title: optional(nonEmptyStringDecoder),
    version: optional(nonEmptyStringDecoder),
    icon: optional(nonEmptyStringDecoder),
    caption: optional(nonEmptyStringDecoder)
});

export const baseApplicationDataDecoder: Decoder<BaseApplicationData> = object({
    name: nonEmptyStringDecoder,
    type: nonEmptyStringDecoder.where((s) => s === "window", "Expected a value of window"),
    userProperties: anyJson(),
    title: optional(nonEmptyStringDecoder),
    version: optional(nonEmptyStringDecoder),
    icon: optional(nonEmptyStringDecoder),
    caption: optional(nonEmptyStringDecoder)
});

export const appDirectoryStateChangeDecoder: Decoder<AppDirectoryStateChange> = object({
    appsAdded: array(baseApplicationDataDecoder),
    appsChanged: array(baseApplicationDataDecoder),
    appsRemoved: array(baseApplicationDataDecoder)
});

export const appHelloSuccessDecoder: Decoder<AppHelloSuccess> = object({
    apps: array(applicationDataDecoder)
});

export const basicInstanceDataDecoder: Decoder<BasicInstanceData> = object({
    id: nonEmptyStringDecoder
});

export const applicationStartConfigDecoder: Decoder<ApplicationStartConfig> = object({
    name: nonEmptyStringDecoder,
    waitForAGMReady: boolean(),
    id: optional(nonEmptyStringDecoder),
    context: optional(anyJson()),
    top: optional(number()),
    left: optional(number()),
    width: optional(nonNegativeNumberDecoder),
    height: optional(nonNegativeNumberDecoder),
    relativeTo: optional(nonEmptyStringDecoder),
    relativeDirection: optional(oneOf<"top" | "left" | "right" | "bottom">(
        constant("top"),
        constant("left"),
        constant("right"),
        constant("bottom")
    )),
    forceChromeTab: optional(boolean()),
    layoutComponentId: optional(nonEmptyStringDecoder)
});

export const layoutTypeDecoder: Decoder<Glue42Web.Layouts.LayoutType> = oneOf<"Global" | "Activity" | "ApplicationDefault" | "Swimlane" | "Workspace">(
    constant("Global"),
    constant("Activity"),
    constant("ApplicationDefault"),
    constant("Swimlane"),
    constant("Workspace")
);

export const componentTypeDecoder: Decoder<Glue42Web.Layouts.ComponentType> = oneOf<"application" | "activity">(
    constant("application"),
    constant("activity")
);

export const windowComponentStateDecoder: Decoder<Glue42Web.Layouts.WindowComponentState> = object({
    context: optional(anyJson()),
    bounds: windowBoundsDecoder,
    createArgs: object({
        name: optional(nonEmptyStringDecoder),
        url: optional(nonEmptyStringDecoder),
        context: optional(anyJson())
    }),
    windowState: optional(nonEmptyStringDecoder),
    restoreState: optional(nonEmptyStringDecoder),
    instanceId: nonEmptyStringDecoder,
    isCollapsed: optional(boolean()),
    isSticky: optional(boolean()),
    restoreSettings: object({
        groupId: optional(nonEmptyStringDecoder),
        groupZOrder: optional(number())
    })
});

export const windowLayoutComponentDecoder: Decoder<Glue42Web.Layouts.WindowComponent> = object({
    type: constant("window"),
    componentType: optional(componentTypeDecoder),
    application: nonEmptyStringDecoder,
    state: windowComponentStateDecoder
});

export const windowLayoutItemDecoder: Decoder<Glue42Workspaces.WindowLayoutItem> = object({
    type: constant("window"),
    config: object({
        appName: nonEmptyStringDecoder,
        url: optional(nonEmptyStringDecoder),
        title: optional(string()),
        allowExtract: optional(boolean()),
        allowReorder: optional(boolean()),
        showCloseButton: optional(boolean()),
        isMaximized: optional(boolean())
    })
});

export const groupLayoutItemDecoder: Decoder<Glue42Workspaces.GroupLayoutItem> = object({
    type: constant("group"),
    config: anyJson(),
    children: array(oneOf<Glue42Workspaces.WindowLayoutItem>(
        windowLayoutItemDecoder
    ))
});

export const columnLayoutItemDecoder: Decoder<Glue42Workspaces.ColumnLayoutItem> = object({
    type: constant("column"),
    config: anyJson(),
    children: array(oneOf<Glue42Workspaces.RowLayoutItem | Glue42Workspaces.ColumnLayoutItem | Glue42Workspaces.GroupLayoutItem | Glue42Workspaces.WindowLayoutItem>(
        groupLayoutItemDecoder,
        windowLayoutItemDecoder,
        lazy(() => columnLayoutItemDecoder),
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        lazy(() => rowLayoutItemDecoder)
    ))
});

export const rowLayoutItemDecoder: Decoder<Glue42Workspaces.RowLayoutItem> = object({
    type: constant("row"),
    config: anyJson(),
    children: array(oneOf<Glue42Workspaces.RowLayoutItem | Glue42Workspaces.ColumnLayoutItem | Glue42Workspaces.GroupLayoutItem | Glue42Workspaces.WindowLayoutItem>(
        columnLayoutItemDecoder,
        groupLayoutItemDecoder,
        windowLayoutItemDecoder,
        lazy(() => rowLayoutItemDecoder)
    ))
});

export const workspaceLayoutComponentStateDecoder: Decoder<Glue42Workspaces.WorkspaceLayoutComponentState> = object({
    config: anyJson(),
    context: anyJson(),
    children: array(oneOf<Glue42Workspaces.RowLayoutItem | Glue42Workspaces.ColumnLayoutItem | Glue42Workspaces.GroupLayoutItem | Glue42Workspaces.WindowLayoutItem>(
        rowLayoutItemDecoder,
        columnLayoutItemDecoder,
        groupLayoutItemDecoder,
        windowLayoutItemDecoder
    ))
});

export const workspaceLayoutComponentDecoder: Decoder<Glue42Workspaces.WorkspaceComponent> = object({
    type: constant("Workspace"),
    application: optional(nonEmptyStringDecoder),
    state: workspaceLayoutComponentStateDecoder
});

export const workspaceFrameComponentStateDecoder: Decoder<Glue42Web.Layouts.WorkspaceFrameComponentState> = object({
    bounds: windowBoundsDecoder,
    instanceId: nonEmptyStringDecoder,
    selectedWorkspace: nonNegativeNumberDecoder,
    workspaces: array(workspaceLayoutComponentStateDecoder),
    windowState: optional(nonEmptyStringDecoder),
    restoreState: optional(nonEmptyStringDecoder),
    context: optional(anyJson())
});

export const workspaceFrameComponentDecoder: Decoder<Glue42Web.Layouts.WorkspaceFrameComponent> = object({
    type: constant<"workspaceFrame">("workspaceFrame"),
    application: nonEmptyStringDecoder,
    componentType: optional(componentTypeDecoder),
    state: workspaceFrameComponentStateDecoder
});

export const glueLayoutDecoder: Decoder<Glue42Web.Layouts.Layout> = object({
    name: nonEmptyStringDecoder,
    type: layoutTypeDecoder,
    components: array(oneOf<Glue42Web.Layouts.WindowComponent | Glue42Web.Layouts.WorkspaceFrameComponent | Glue42Workspaces.WorkspaceComponent>(
        windowLayoutComponentDecoder,
        workspaceLayoutComponentDecoder,
        workspaceFrameComponentDecoder
    )),
    context: optional(anyJson()),
    metadata: optional(anyJson()),
    version: optional(number())
});

export const newLayoutOptionsDecoder: Decoder<Glue42Web.Layouts.NewLayoutOptions> = object({
    name: nonEmptyStringDecoder,
    context: optional(anyJson()),
    metadata: optional(anyJson()),
    instances: optional(array(nonEmptyStringDecoder)),
    ignoreInstances: optional(array(nonEmptyStringDecoder))
});

export const restoreOptionsDecoder: Decoder<Glue42Web.Layouts.RestoreOptions> = object({
    name: nonEmptyStringDecoder,
    context: optional(anyJson()),
    closeRunningInstance: optional(boolean()),
    closeMe: optional(boolean()),
    timeout: optional(nonNegativeNumberDecoder)
});

export const layoutSummaryDecoder: Decoder<Glue42Web.Layouts.LayoutSummary> = object({
    name: nonEmptyStringDecoder,
    type: layoutTypeDecoder,
    context: optional(anyJson()),
    metadata: optional(anyJson())
});

export const simpleLayoutConfigDecoder: Decoder<SimpleLayoutConfig> = object({
    name: nonEmptyStringDecoder,
    type: layoutTypeDecoder
});

export const saveLayoutConfigDecoder: Decoder<SaveLayoutConfig> = object({
    layout: newLayoutOptionsDecoder
});

export const restoreLayoutConfigDecoder: Decoder<RestoreLayoutConfig> = object({
    layout: restoreOptionsDecoder
});

export const getAllLayoutsConfigDecoder: Decoder<GetAllLayoutsConfig> = object({
    type: layoutTypeDecoder
});

export const allLayoutsFullConfigDecoder: Decoder<AllLayoutsFullConfig> = object({
    layouts: array(glueLayoutDecoder)
});

export const importModeDecoder: Decoder<"replace" | "merge"> = oneOf<"replace" | "merge">(
    constant("replace"),
    constant("merge")
);

export const layoutsImportConfigDecoder: Decoder<LayoutsImportConfig> = object({
    layouts: array(glueLayoutDecoder),
    mode: importModeDecoder
});

export const allLayoutsSummariesResultDecoder: Decoder<AllLayoutsSummariesResult> = object({
    summaries: array(layoutSummaryDecoder)
});

export const simpleLayoutResultDecoder: Decoder<SimpleLayoutResult> = object({
    layout: glueLayoutDecoder
});

export const optionalSimpleLayoutResult: Decoder<OptionalSimpleLayoutResult> = object({
    layout: optional(glueLayoutDecoder)
});

export const intentsOperationTypesDecoder: Decoder<IntentsOperationTypes> = oneOf<"findIntent" | "getIntents" | "raiseIntent" | "raise">(
    constant("findIntent"),
    constant("getIntents"),
    constant("raiseIntent"),
    constant("raise")
);

const intentHandlerDecoder: Decoder<Glue42Web.Intents.IntentHandler> = object({
    applicationName: nonEmptyStringDecoder,
    applicationTitle: string(),
    applicationDescription: optional(string()),
    applicationIcon: optional(string()),
    type: oneOf<"app" | "instance">(constant("app"), constant("instance")),
    displayName: optional(string()),
    contextTypes: optional(array(nonEmptyStringDecoder)),
    instanceId: optional(string()),
    instanceTitle: optional(string()),
    resultType: optional(string())
});

export const resolverIntentHandlerDecoder = object({
    applicationName: string(),
    applicationIcon: optional(string()),
    instanceId: optional(string()),
});

export const intentResolverResponseDecoder: Decoder<IntentResolverResponse> = object({
    intent: nonEmptyStringDecoder,
    handler: intentHandlerDecoder
});

const intentDecoder: Decoder<Glue42Web.Intents.Intent> = object({
    name: nonEmptyStringDecoder,
    handlers: array(intentHandlerDecoder)
});

const intentTargetDecoder: Decoder<"startNew" | "reuse" | { app?: string; instance?: string }> = oneOf<"startNew" | "reuse" | { app?: string; instance?: string }>(
    constant("startNew"),
    constant("reuse"),
    object({
        app: optional(nonEmptyStringDecoder),
        instance: optional(nonEmptyStringDecoder)
    })
);

const intentContextDecoder: Decoder<Glue42Web.Intents.IntentContext> = object({
    type: optional(nonEmptyStringDecoder),
    data: optional(anyJson())
});

export const intentsDecoder: Decoder<Glue42Web.Intents.Intent[]> = array(intentDecoder);

export const wrappedIntentsDecoder: Decoder<WrappedIntents> = object({
    intents: intentsDecoder
});

export const intentFilterDecoder: Decoder<Glue42Web.Intents.IntentFilter> = object({
    name: optional(nonEmptyStringDecoder),
    contextType: optional(nonEmptyStringDecoder),
    resultType: optional(nonEmptyStringDecoder)
});

export const findFilterDecoder: Decoder<string | Glue42Web.Intents.IntentFilter> = oneOf<string | Glue42Web.Intents.IntentFilter>(
    nonEmptyStringDecoder,
    intentFilterDecoder
);

export const wrappedIntentFilterDecoder: Decoder<WrappedIntentFilter> = object({
    filter: optional(intentFilterDecoder)
});

export const intentRequestDecoder: Decoder<Glue42Web.Intents.IntentRequest> = object({
    intent: nonEmptyStringDecoder,
    target: optional(intentTargetDecoder),
    context: optional(intentContextDecoder),
    options: optional(windowOpenSettingsDecoder),
    handlers: optional(array(intentHandlerDecoder))
});

export const raiseRequestDecoder: Decoder<string | Glue42Web.Intents.IntentRequest> = oneOf<string | Glue42Web.Intents.IntentRequest>(
    nonEmptyStringDecoder,
    intentRequestDecoder
);

export const intentRequestResolverConfigDecoder: Decoder<IntentRequestResolverConfig> = object({
    enabled: boolean(),
    appName: nonEmptyStringDecoder,
    waitResponseTimeout: number()
});

export const raiseIntentRequestDecoder: Decoder<IntentRequestWithResolverInfo> = object({
    intentRequest: intentRequestDecoder,
    resolverConfig: intentRequestResolverConfigDecoder
});

export const intentResultDecoder: Decoder<Glue42Web.Intents.IntentResult> = object({
    request: intentRequestDecoder,
    handler: intentHandlerDecoder,
    result: anyJson()
});

export const AddIntentListenerRequestDecoder: Decoder<Glue42Web.Intents.AddIntentListenerRequest> = object({
    intent: nonEmptyStringDecoder,
    contextTypes: optional(array(nonEmptyStringDecoder)),
    displayName: optional(string()),
    icon: optional(string()),
    description: optional(string()),
    resultType: optional(string())
});

export const AddIntentListenerDecoder: Decoder<string | Glue42Web.Intents.AddIntentListenerRequest> = oneOf<string | Glue42Web.Intents.AddIntentListenerRequest>(
    nonEmptyStringDecoder,
    AddIntentListenerRequestDecoder
);

export const channelNameDecoder = (channelNames: string[]): Decoder<string> => {
    return nonEmptyStringDecoder.where(s => channelNames.includes(s), "Expected a valid channel name");
};

export const interopActionSettingsDecoder: Decoder<Glue42Web.Notifications.InteropActionSettings> = object({
    method: nonEmptyStringDecoder,
    arguments: optional(anyJson()),
    target: optional(oneOf<"all" | "best">(
        constant("all"),
        constant("best")
    ))
});

export const glue42NotificationActionDecoder: Decoder<Glue42Web.Notifications.NotificationAction> = object({
    action: string(),
    title: nonEmptyStringDecoder,
    icon: optional(string()),
    interop: optional(interopActionSettingsDecoder)
});

export const notificationDefinitionDecoder: Decoder<Glue42Web.Notifications.NotificationDefinition> = object({
    badge: optional(string()),
    body: optional(string()),
    data: optional(anyJson()),
    dir: optional(oneOf<"auto" | "ltr" | "rtl">(
        constant("auto"),
        constant("ltr"),
        constant("rtl")
    )),
    icon: optional(string()),
    image: optional(string()),
    lang: optional(string()),
    renotify: optional(boolean()),
    requireInteraction: optional(boolean()),
    silent: optional(boolean()),
    tag: optional(string()),
    timestamp: optional(nonNegativeNumberDecoder),
    vibrate: optional(array(number()))
});

export const glue42NotificationOptionsDecoder: Decoder<Glue42Web.Notifications.RaiseOptions> = object({
    title: nonEmptyStringDecoder,
    clickInterop: optional(interopActionSettingsDecoder),
    actions: optional(array(glue42NotificationActionDecoder)),
    focusPlatformOnDefaultClick: optional(boolean()),
    badge: optional(string()),
    body: optional(string()),
    data: optional(anyJson()),
    dir: optional(oneOf<"auto" | "ltr" | "rtl">(
        constant("auto"),
        constant("ltr"),
        constant("rtl")
    )),
    icon: optional(string()),
    image: optional(string()),
    lang: optional(string()),
    renotify: optional(boolean()),
    requireInteraction: optional(boolean()),
    silent: optional(boolean()),
    tag: optional(string()),
    timestamp: optional(nonNegativeNumberDecoder),
    vibrate: optional(array(number())),
    severity: optional(oneOf<"Low" | "Medium" | "High" | "Critical" | "None">(
        constant("Low"),
        constant("None"),
        constant("Medium"),
        constant("High"),
        constant("Critical")
    )),
    showToast: optional(boolean()),
    showInPanel: optional(boolean())
});

export const channelContextDecoder: Decoder<Glue42Web.Channels.ChannelContext> = object({
    name: nonEmptyStringDecoder,
    meta: object({
        color: nonEmptyStringDecoder
    }),
    data: optional(object()),
});


export const raiseNotificationDecoder: Decoder<RaiseNotification> = object({
    settings: glue42NotificationOptionsDecoder,
    id: nonEmptyStringDecoder
});

export const permissionRequestResultDecoder: Decoder<PermissionRequestResult> = object({
    permissionGranted: boolean()
});

export const permissionQueryResultDecoder: Decoder<PermissionQueryResult> = object({
    permission: oneOf<"default" | "granted" | "denied">(
        constant("default"),
        constant("granted"),
        constant("denied")
    )
});

export const notificationEventPayloadDecoder: Decoder<NotificationEventPayload> = object({
    definition: notificationDefinitionDecoder,
    action: optional(string()),
    id: optional(nonEmptyStringDecoder)
});

export const platformSaveRequestConfigDecoder: Decoder<PlatformSaveRequestConfig> = object({
    layoutType: oneOf<"Global" | "Workspace">(
        constant("Global"),
        constant("Workspace")
    ),
    layoutName: nonEmptyStringDecoder,
    context: optional(anyJson())
});

export const saveRequestClientResponseDecoder: Decoder<SaveRequestClientResponse> = object({
    windowContext: optional(anyJson()),
});

export const permissionStateResultDecoder: Decoder<PermissionStateResult> = object({
    state: oneOf<"prompt" | "granted" | "denied">(
        constant("prompt"),
        constant("denied"),
        constant("granted")
    )
});

export const simpleAvailabilityResultDecoder: Decoder<SimpleAvailabilityResult> = object({
    isAvailable: boolean()
});

export const simpleItemIdDecoder: Decoder<SimpleItemIdRequest> = object({
    itemId: nonEmptyStringDecoder
});

export const operationCheckResultDecoder: Decoder<OperationCheckResult> = object({
    isSupported: boolean()
});

export const operationCheckConfigDecoder: Decoder<OperationCheckConfig> = object({
    operation: nonEmptyStringDecoder
});

export const workspaceFrameBoundsResultDecoder: Decoder<WorkspaceFrameBoundsResult> = object({
    bounds: windowBoundsDecoder
});

export const themeDecoder: Decoder<Glue42Web.Themes.Theme> = object({
    displayName: nonEmptyStringDecoder,
    name: nonEmptyStringDecoder
});

export const simpleThemeResponseDecoder: Decoder<SimpleThemeResponse> = object({
    theme: themeDecoder
});

export const allThemesResponseDecoder: Decoder<AllThemesResponse> = object({
    themes: array(themeDecoder)
});

export const selectThemeConfigDecoder: Decoder<SelectThemeConfig> = object({
    name: nonEmptyStringDecoder
});

export const notificationsDataDecoder: Decoder<Glue42Web.Notifications.NotificationData> = object({
    id: nonEmptyStringDecoder,
    title: nonEmptyStringDecoder,
    clickInterop: optional(interopActionSettingsDecoder),
    actions: optional(array(glue42NotificationActionDecoder)),
    focusPlatformOnDefaultClick: optional(boolean()),
    badge: optional(string()),
    body: optional(string()),
    data: optional(anyJson()),
    dir: optional(oneOf<"auto" | "ltr" | "rtl">(
        constant("auto"),
        constant("ltr"),
        constant("rtl")
    )),
    icon: optional(string()),
    image: optional(string()),
    lang: optional(string()),
    renotify: optional(boolean()),
    requireInteraction: optional(boolean()),
    silent: optional(boolean()),
    tag: optional(string()),
    timestamp: optional(nonNegativeNumberDecoder),
    vibrate: optional(array(number())),
    severity: optional(oneOf<"Low" | "Medium" | "High" | "Critical" | "None">(
        constant("Low"),
        constant("None"),
        constant("Medium"),
        constant("High"),
        constant("Critical")
    )),
    showToast: optional(boolean()),
    showInPanel: optional(boolean())
});

export const simpleNotificationDataDecoder: Decoder<SimpleNotificationData> = object({
    notification: notificationsDataDecoder
});

export const allNotificationsDataDecoder: Decoder<AllNotificationsData> = object({
    notifications: array(notificationsDataDecoder)
});

export const simpleNotificationSelectDecoder: Decoder<SimpleNotificationSelect> = object({
    id: nonEmptyStringDecoder
});
