export enum IntentHandlerResultTypes {
    Context = "Context",
    Channel = "Channel"
}

export enum ChannelTypes {
    User = "user",
    App = "app",
    Private = "private"
}

export const fdc3ChannelNames = ["fdc3.channel.1", "fdc3.channel.4", "fdc3.channel.6", "fdc3.channel.3", "fdc3.channel.2", "fdc3.channel.8", "fdc3.channel.7", "fdc3.channel.5"];

export const defaultChannelsProps: string[] = ["id", "type", "broadcast", "addContextListener", "getCurrentContext"];

export const defaultContextProps: string[] = ["type"];

export const defaultGlue42APIs: string[] = ["contexts", "channels", "interop", "intents", "appManager", "windows"];

export const responseInteropMethodPrefix = "T42.FDC3.Open.Listener.Response";

export const glueChannelNamePrefix = "___channel___";

export const fdc3NothingContextType = "fdc3.nothing";

export const Glue42EnterpriseNoAppWindow = "no-app-window";

export const RaiseTimeoutMs = 75 * 1000;