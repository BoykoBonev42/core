import { anyJson, constant, Decoder, object, oneOf, optional, array } from 'decoder-validate';
import { nonEmptyStringDecoder } from '../../shared/decoders';
import { Glue42Web } from "@glue42/web";

type ChannelContext = { name: string, meta: { color: string }, data?: any };

export type ChannelOperationTypes = "addChannel" | "operationCheck" | "getWindowsWithChannels";

export const channelOperationDecoder: Decoder<ChannelOperationTypes> = oneOf<"addChannel" | "operationCheck" | "getWindowsWithChannels">(
    constant("addChannel"),
    constant("operationCheck"),
    constant("getWindowsWithChannels")
);

export const channelContextDecoder: Decoder<ChannelContext> = object({
    name: nonEmptyStringDecoder,
    meta: object({
        color: nonEmptyStringDecoder
    }),
    data: optional(anyJson()),
});

export const windowsWithChannelsDecoder: Decoder<Glue42Web.Channels.WindowIdOnChannelInfo[]> = array(object({
    windowId: nonEmptyStringDecoder,
    channel: nonEmptyStringDecoder,
    application: nonEmptyStringDecoder
}));

export const windowWithChannelFilterDecoder: Decoder<Glue42Web.Channels.WindowWithChannelFilter | undefined> = optional(object({
    application: optional(nonEmptyStringDecoder),
    windowIds: optional(array(nonEmptyStringDecoder)),
    channels: optional(array(nonEmptyStringDecoder))
}));

export const WindowIdOnChannelInfoDecoder: Decoder<Glue42Web.Channels.WindowIdOnChannelInfo> = object({
    windowId: nonEmptyStringDecoder,
    channel: nonEmptyStringDecoder,
    application: nonEmptyStringDecoder
});

export const WindowIdOnChannelInfoArrayDecoder: Decoder<Glue42Web.Channels.WindowIdOnChannelInfo[]> = array(WindowIdOnChannelInfoDecoder);

export const GetWindowOnChannelInfoDecoder: Decoder<{windows: Glue42Web.Channels.WindowIdOnChannelInfo[]}> = object({
    windows: WindowIdOnChannelInfoArrayDecoder
});
