import { Channel } from '@finos/fdc3';

export class ChannelsStateStore {
    private _currentChannel: Channel | null = null;
    private _userChannels: { [name: string]: Channel } = {}; /* { fdc3.channel.1: {}, fdc3.channel.2: {}} */
    private _fdc3ChannelIdsToGlueChannelNames: { [ key: string ]: string } = {}; /* { "fdc3.channel.1": "Red" } */

    public get currentChannel(): Channel | null {
        return this._currentChannel;
    }

    public get userChannels(): { [name: string]: Channel } {
        return this._userChannels;
    }

    public set currentChannel(newChannelValue: Channel | null) {
        this._currentChannel = newChannelValue;
    }

    public addUserChannel(channel: Channel) {
        this._userChannels[channel.id] = channel;
    }

    public addFdc3IdToGlueChannelName(fdc3Id: string, glueChannelName: string): void {
        this._fdc3ChannelIdsToGlueChannelNames[fdc3Id] = glueChannelName;
    }

    public getGlueChannelNameByFdc3ChannelId(fdc3Id: string): string {
        return this._fdc3ChannelIdsToGlueChannelNames[fdc3Id];
    }

    public getFdc3ChannelIdByGlueChannelName(glueChannelName: string): string {
        const [ key ] = Object.entries(this._fdc3ChannelIdsToGlueChannelNames).find(([ _, value ]) => value === glueChannelName)!;

        return key;
    }
}