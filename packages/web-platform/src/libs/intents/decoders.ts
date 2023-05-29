import { Glue42Web } from "@glue42/web";
import { Decoder, object, array, optional, anyJson, oneOf, constant, string, boolean, number } from "decoder-validate";
import { nonEmptyStringDecoder, nonNegativeNumberDecoder, windowOpenSettingsDecoder } from "../../shared/decoders";
import { IntentRequestResolverConfig, IntentResolverResponse, IntentsOperationTypes, RaiseIntentRequestWithResolverConfig, ResolverIntentHandler, WrappedIntentFilter, WrappedIntents } from "./types";

export const intentsOperationTypesDecoder: Decoder<IntentsOperationTypes> = oneOf<"findIntent" | "getIntents" | "raiseIntent" | "raise" | "operationCheck">(
    constant("findIntent"),
    constant("getIntents"),
    constant("raiseIntent"),
    constant("raise"),
    constant("operationCheck")
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
    resultType: optional(nonEmptyStringDecoder)
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
    data: optional(object())
});

export const intentsDecoder: Decoder<Glue42Web.Intents.Intent[]> = array(intentDecoder);

export const wrappedIntentsDecoder: Decoder<WrappedIntents> = object({
    intents: intentsDecoder
});

export const wrappedIntentFilterDecoder: Decoder<WrappedIntentFilter> = object({
    filter: optional(object({
        name: optional(nonEmptyStringDecoder),
        contextType: optional(nonEmptyStringDecoder),
        resultType: optional(nonEmptyStringDecoder)
    }))
});

export const resolverIntentHandlerDecoder: Decoder<ResolverIntentHandler> = object({
    applicationName: nonEmptyStringDecoder,
    applicationIcon: optional(string()),
    instanceId: optional(string()),
});

export const intentRequestDecoder: Decoder<Glue42Web.Intents.IntentRequest> = object({
    intent: nonEmptyStringDecoder,
    target: optional(intentTargetDecoder),
    context: optional(intentContextDecoder),
    options: optional(windowOpenSettingsDecoder),
    handlers: optional(array(intentHandlerDecoder)),
    timeout: optional(nonNegativeNumberDecoder),
    waitUserResponseIndefinitely: optional(boolean())
});

const intentRequestResolverConfigDecoder: Decoder<IntentRequestResolverConfig> = object({
    enabled: optional(boolean()),
    appName: string(),
    waitResponseTimeout: number()
});

export const raiseIntentRequestDecoder: Decoder<RaiseIntentRequestWithResolverConfig> = object({
    intentRequest: intentRequestDecoder,
    resolverConfig: intentRequestResolverConfigDecoder
});

export const intentResultDecoder: Decoder<Glue42Web.Intents.IntentResult> = object({
    request: intentRequestDecoder,
    handler: intentHandlerDecoder,
    result: anyJson()
});

export const intentResolverResponseDecoder: Decoder<IntentResolverResponse> = object({
    intent: nonEmptyStringDecoder,
    handler: intentHandlerDecoder
});
