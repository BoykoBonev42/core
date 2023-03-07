import { Channel, ContextHandler } from "@finos/fdc3";
import { defaultChannelsProps, defaultContextProps } from "../shared/constants";
import { ChannelMetadata } from "../types/fdc3Types";

export const isChannel = (data: any): boolean => {
    return defaultChannelsProps.every(prop => Object.keys(data).includes(prop));
};

export const isContext = (data: any): boolean => {
    return defaultContextProps.every(prop => Object.keys(data).includes(prop));
};

export const isChannelMetadata = (data: any): boolean => {
    return typeof data === "object" && data.isChannel;
};

export const extractChannelMetadata = (channel: Channel): ChannelMetadata => {
    return {
        id: channel.id,
        type: channel.type,
        displayMetadata: channel.displayMetadata,
        isChannel: true
    };
};

export const parseContextHandler = (handler: ContextHandler, contextType?: string): ContextHandler => {
    const subHandler = (data: any, metadata: any): void => {
        if (contextType) {
            if (data.type === contextType) {
                handler(data, metadata);
            }
            return;
        }
        handler(data, metadata);
    };

    return subHandler;
};
