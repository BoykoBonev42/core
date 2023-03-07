import { AppMetadata, Context, Icon, Image, AppIdentifier } from "@finos/fdc3";
import { Decoder, string, object, optional, array, anyJson, number, DecoderError, oneOf, constant, boolean } from "decoder-validate";
import { PrivateChannelEventMethods } from "../channels/privateChannelConstants";
import { SystemMethodEventArgument, SystemMethodEventPayload } from "../types/glue42Types";

export const nonEmptyStringDecoder: Decoder<string> = string().where((s) => s.length > 0, "Expected a non-empty string");

export const nonNegativeNumberDecoder: Decoder<number> = number().where((num) => num >= 0, "Expected a non-negative number");

export const iconDecoder: Decoder<Icon> = object({
    src: nonEmptyStringDecoder,
    size: optional(string()),
    type: optional(string())
});

export const imageDecoder: Decoder<Image> = object({
    src: nonEmptyStringDecoder,
    size: optional(string()),
    type: optional(string()),
    label: optional(string())
});

export type decodeResult = { 
    ok: boolean,
    result?: any,
    error?: DecoderError
};

export const appMetadataDecoder: Decoder<AppMetadata> = object({
    appId: nonEmptyStringDecoder,
    instanceId: optional(string()),
    name: optional(string()),
    version: optional(string()),
    title: optional(string()),
    tooltip: optional(string()),
    description: optional(string()),
    icons: optional(array(iconDecoder)),
    images: optional(array(imageDecoder)),
});

export const appIdentifierDecoder: Decoder<AppIdentifier> = object({
    appId: nonEmptyStringDecoder,
    instanceId: optional(string())
});

export const targetAppDecoder: Decoder<string | AppIdentifier> = oneOf<string | AppIdentifier> (
    nonEmptyStringDecoder,
    appIdentifierDecoder
);

export const contextDecoder: Decoder<Context> = object<Context>({
    type: nonEmptyStringDecoder,
    name: optional(nonEmptyStringDecoder),
    id: optional(anyJson()),
});

export const optionalContextDecoder: Decoder<Context | undefined> = optional(contextDecoder);

export const optionalTargetApp: Decoder<AppIdentifier | undefined> = optional(appIdentifierDecoder);

export const optionalAppIdentifier: Decoder<string | AppIdentifier | undefined> = optional(targetAppDecoder);

export const optionalNonEmptyStringDecoder: Decoder<string | undefined> = optional(nonEmptyStringDecoder);

export const SystemMethodActionDecider: Decoder<string> = oneOf(
    constant(PrivateChannelEventMethods.OnAddContextListener),
    constant(PrivateChannelEventMethods.OnUnsubscribe),
    constant(PrivateChannelEventMethods.OnDisconnect),
);

export const SystemMethodEventPayloadDecoder: Decoder<SystemMethodEventPayload> = object({
    channelId: nonEmptyStringDecoder,
    clientId: nonEmptyStringDecoder,
    contextType: optional(string()),
    replayContextTypes: optional(array(string()))
});

export const SystemMethodInvocationArgumentDecoder: Decoder<SystemMethodEventArgument> = object({
    action: SystemMethodActionDecider,
    payload: SystemMethodEventPayloadDecoder
});

export const ContextListenerResponseDecoder = object({
    listenerInvoked: optional(boolean())
});

export const StartUpContextDecoder = object({
    meta: object({
        responseMethodName: nonEmptyStringDecoder
    }),
    context: contextDecoder
});
