import { boolean, constant, Decoder, number, object, oneOf, optional, string } from "decoder-validate";
import { nonEmptyStringDecoder, nonNegativeNumberDecoder, windowBoundsDecoder, windowOpenSettingsDecoder } from "../../shared/decoders";
import { FrameWindowBoundsResult, OpenWindowConfig, OpenWindowSuccess, SimpleWindowCommand, WindowBoundsResult, WindowChannelConfig, WindowMoveResizeConfig, WindowOperationsTypes, WindowTitleConfig, WindowUrlResult } from "./types";

export const windowOperationDecoder: Decoder<WindowOperationsTypes> = oneOf<"openWindow" | "windowHello" | "getUrl" | "getTitle" | "setTitle" | "moveResize" | "focus" | "close" | "getBounds" | "getFrameBounds" | "registerWorkspaceWindow" | "unregisterWorkspaceWindow" | "operationCheck" | "focusChange" | "setChannel">(
    constant("openWindow"),
    constant("windowHello"),
    constant("getUrl"),
    constant("getTitle"),
    constant("setTitle"),
    constant("moveResize"),
    constant("focus"),
    constant("close"),
    constant("getBounds"),
    constant("getFrameBounds"),
    constant("registerWorkspaceWindow"),
    constant("unregisterWorkspaceWindow"),
    constant("operationCheck"),
    constant("focusChange"),
    constant("setChannel")
);

export const openWindowConfigDecoder: Decoder<OpenWindowConfig> = object({
    name: nonEmptyStringDecoder,
    url: nonEmptyStringDecoder,
    options: optional(windowOpenSettingsDecoder)
});

export const openWindowSuccessDecoder: Decoder<OpenWindowSuccess> = object({
    windowId: nonEmptyStringDecoder,
    name: nonEmptyStringDecoder
});

export const simpleWindowDecoder: Decoder<SimpleWindowCommand> = object({
    windowId: nonEmptyStringDecoder
});

export const windowBoundsResultDecoder: Decoder<WindowBoundsResult> = object({
    windowId: nonEmptyStringDecoder,
    bounds: windowBoundsDecoder
});

export const frameWindowBoundsResultDecoder: Decoder<FrameWindowBoundsResult> = object({
    bounds: windowBoundsDecoder
});

export const windowUrlResultDecoder: Decoder<WindowUrlResult> = object({
    windowId: nonEmptyStringDecoder,
    url: nonEmptyStringDecoder
});

export const windowMoveResizeConfigDecoder: Decoder<WindowMoveResizeConfig> = object({
    windowId: nonEmptyStringDecoder,
    top: optional(number()),
    left: optional(number()),
    width: optional(nonNegativeNumberDecoder),
    height: optional(nonNegativeNumberDecoder),
    relative: optional(boolean())
});

export const windowTitleConfigDecoder: Decoder<WindowTitleConfig> = object({
    windowId: nonEmptyStringDecoder,
    title: string()
});

export const windowChannelConfigDecoder: Decoder<WindowChannelConfig> = object({
    windowId: nonEmptyStringDecoder,
    channel: string()
});

