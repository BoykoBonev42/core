import { Context } from "@finos/fdc3";
import { glueChannelNamePrefix } from "../shared/constants";

export class ChannelsParser {
    private readonly fdc3Delimiter = "&";
    private readonly channelsFdc3DataPrefix = "fdc3_";

    public mapChannelNameToContextName(channelName: string): string {
        return `${glueChannelNamePrefix}${channelName}`;
    }

    public parseContextsDataToInitialFDC3Data (context: { data: any, latest_fdc3_type: string }): Context {
        const { data, latest_fdc3_type } = context;

        const parsedType = this.mapChannelsDelimiterToFDC3Type(latest_fdc3_type);

        return { type: parsedType, ...data[`${this.channelsFdc3DataPrefix}${latest_fdc3_type}`] };
    }

    public revertGlueParsedTypeToInitialFDC3Type(string: string): string {
        const withoutPrefix = string.replace(this.channelsFdc3DataPrefix, "");

        return this.mapChannelsDelimiterToFDC3Type(withoutPrefix);
    }

    public parseFDC3ContextToGlueContexts(context: Context) {
        const { type, ...rest } = context;

        const parsedType = this.mapFDC3TypeToChannelsDelimiter(type);

        return { [`${this.channelsFdc3DataPrefix}${parsedType}`]: rest };
    }

    public mapFDC3TypeToChannelsDelimiter(type: string): string {
        return type.split(".").join(this.fdc3Delimiter);
    }

    public isFdc3DataKey(key: string): boolean {
        return !!key.startsWith(this.channelsFdc3DataPrefix);
    }

    private mapChannelsDelimiterToFDC3Type(type: string): string {
        return type.split(this.fdc3Delimiter).join(".");
    }
}