import { AppIdentifier, Context, ContextHandler, DesktopAgent, DisplayMetadata, IntentHandler, IntentResolution, IntentResult, Listener } from "@finos/fdc3";
import { PrivateChannelEventMethods } from "../channels/privateChannelConstants";
import { ChannelContext, GlueIntent } from "./glue42Types";

export interface ChannelMetadata {
    id?: string;
    type?: "user" | "app" | "private";
    displayMetadata?: any;
    isChannel: true;
}

export interface PrivateChannelListener {
    id: string;
    listener: Listener
}

export interface ExtendedDisplayMetadata extends DisplayMetadata {
    glueChannel: ChannelContext
}

export interface ContextListenerInvokedPromise {
    methodName: string;
    promise: Promise<any>;
    resolve: (args?: any) => void;
    reject: (reason?: any) => void;
}

export interface CommandIdConfig {
    commandId: string;
}

export interface OpenConfig extends CommandIdConfig {
    target: string | AppIdentifier;
    context?: Context;  
}

export interface AppIdentifierConfig extends CommandIdConfig {
    appIdentifier: AppIdentifier
}

export interface AddContextListenerConfig extends CommandIdConfig {
    handler: ContextHandler;
    contextType?: string;
    channelId?: string;
}

export interface DeprecatedAddContextListenerConfig extends CommandIdConfig {
    contextType: string | undefined | ContextHandler;
    handler: ContextHandler,
    channelId?: string;
}

export interface FindIntentConfig extends CommandIdConfig {
    intent: string;
    context?: Context;
    resultType?: string;
}

export interface FindIntentsByContextConfig extends CommandIdConfig {
    context: Context;
    resultType?: string;
}

export interface RaiseIntentConfig extends CommandIdConfig {
    intent: string;
    context: Context;
    target?: string | AppIdentifier;
}

export interface CheckRaiseIntentRequestArgs extends CommandIdConfig {
    intent: GlueIntent;
    context: Context;
    target?: string | AppIdentifier;
}

export interface CheckIntentHandlersTargetArgs extends CommandIdConfig {
    intent: GlueIntent;
    target: string | AppIdentifier;
}

export interface RaiseIntentForContextConfig extends CommandIdConfig {
    context: Context;
    target?:  string | AppIdentifier;
}

export interface AddIntentListenerConfig extends CommandIdConfig {
    intent: string;
    handler: IntentHandler;
}

export interface ChannelsConfig extends CommandIdConfig {
    channelId: string;
}

export interface GetContextForChannelConfig extends ChannelsConfig {
    contextType?: string;
}

export interface AddPrivateChannelEventConfig extends CommandIdConfig {
    channelId: string;
    action: PrivateChannelEventMethods;
    handler: (contextType?: string) => void;
}

export interface AddCallbackInRegistryConfig {
    action: string;
    channelId: string;
    handler: (contextType?: string) => void;
    replayArgs?: string[]
}

export interface GlueStartContextOnOpen {
    meta: {
        responseMethodName: string;
        instance: string;
    },
    context: Context;
}

export interface ExtendedIntentResolution extends Omit<IntentResolution, "getResult"> {
    getResult: () => Promise<IntentResult | undefined>;
}

export interface ExtendedFDC3DesktopAgent extends Omit<DesktopAgent, "raiseIntent" | "raiseIntentForContext"> {
    raiseIntent(intent: string, context: Context, app?: string | AppIdentifier): Promise<ExtendedIntentResolution>;
    raiseIntentForContext(context: Context, app?: string | AppIdentifier): Promise<ExtendedIntentResolution>
}
