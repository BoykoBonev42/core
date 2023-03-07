import { Channel } from "@finos/fdc3";
import { ChannelTypes } from "../shared/constants";
import { ChannelMetadata } from "../types/fdc3Types";
import { ChannelContext } from "../types/glue42Types";

export class ChannelsFactory {
    constructor(
        private readonly createUserChannelFn: (glueChannel: ChannelContext) => Channel,
        private readonly createAppChannel: (id: string) => Channel,
        private readonly createPrivateChannel:(channelId?: string) => Channel
    ) { }

    public buildModel(data: ChannelMetadata): Channel {
        const { type } = data;

        if (type === ChannelTypes.User) {
            return this.buildUserChannel(data.displayMetadata.glueChannel);
        } else if (type === ChannelTypes.App) {
            return this.buildAppChannel(data.id!);
        } else if (type === ChannelTypes.Private) {
            return this.buildPrivateChannel(data.id!);
        } else {
            throw new Error("Pass one of the supported channel types: user, app, private");
        }
    }

    private buildUserChannel(data: ChannelContext): Channel {
        return this.createUserChannelFn(data);
    }

    private buildAppChannel(channelId: string): Channel {
        return this.createAppChannel(channelId);
    }

    private buildPrivateChannel(channelId: string): Channel {
        return this.createPrivateChannel(channelId);
    }
}