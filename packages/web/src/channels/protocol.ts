import { GetWindowOnChannelInfoDecoder, channelContextDecoder, windowChannelConfigDecoder, windowWithChannelFilterDecoder } from '../shared/decoders';
import { BridgeOperation } from '../shared/types';

export type ChannelOperationTypes = "addChannel" | "getWindowsWithChannels" | "setChannel";

export const operations: { [key in ChannelOperationTypes]: BridgeOperation } = {
    addChannel: { name: "addChannel", dataDecoder: channelContextDecoder },
    getWindowsWithChannels: { name: "getWindowsWithChannels", dataDecoder: windowWithChannelFilterDecoder, resultDecoder: GetWindowOnChannelInfoDecoder },
    setChannel: { name: "setChannel", dataDecoder: windowChannelConfigDecoder },
};
