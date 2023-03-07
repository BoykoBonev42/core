import { DesktopAgent as Fdc3DesktopAgent, Channel } from '@finos/fdc3';
import { GlueController } from "../controllers/glue";
import { EventDispatcher } from "../events/dispatcher"
import { DesktopAgent } from '../models/desktopAgent';
import { AppChannel } from '../models/appChannel';
import { ChannelsParser } from '../channels/parser';
import { UserChannel } from '../models/userChannel';
import { ChannelContext } from '../types/glue42Types';
import { IntentsController } from '../controllers/intents';
import { ApplicationsController } from '../controllers/applications';
import { ChannelsController } from '../channels/controller';
import { EventReceiver } from '../events/receiver';
import { ChannelsStateStore } from '../channels/stateStore';
import { PrivateChannel } from '../models/privateChannel';
import { ChannelsFactory } from '../channels/factory';
import { ChannelsCallbackRegistry } from '../channels/callbackRegistry';
import { GlueEventsController } from '../controllers/glueEvents';
import { ChannelsPendingListenersStore } from '../channels/pendingListenersStore';

export class IoC {
    private _eventDispatcher!: EventDispatcher;
    private _eventReceiver!: EventReceiver;
    private _desktopAgent!: DesktopAgent;
    private _glueController!: GlueController;
    private _intentsController!: IntentsController;
    private _applicationController!: ApplicationsController;
    private _channelsController!: ChannelsController;
    private _channelsParser!: ChannelsParser;
    private _channelsStateStore!: ChannelsStateStore;
    private _channelsFactory!: ChannelsFactory;
    private _fdc3!: Fdc3DesktopAgent;
    private _channelsCallbackRegistry!: ChannelsCallbackRegistry;
    private _channelsPendingListenersStore!: ChannelsPendingListenersStore;
    private _eventsController!: GlueEventsController;
    
    public get ioc(): IoC {
        return this;
    }

    public get eventReceiver(): EventReceiver {
        if (!this._eventReceiver) {
            this._eventReceiver = new EventReceiver(this.glueController, this.eventDispatcher, this.eventsController);
        }

        return this._eventReceiver;
    }

    public get glueController(): GlueController {
        if (!this._glueController) {
            this._glueController = new GlueController(this.channelsParser);
        }
        
        return this._glueController;
    }

    public get fdc3(): Fdc3DesktopAgent {
        if (!this._fdc3) {
            this._fdc3 = this.desktopAgent.toApi();
        }

        return this._fdc3;
    }

    private get eventDispatcher(): EventDispatcher {
        if (!this._eventDispatcher) {
            this._eventDispatcher = new EventDispatcher();
        }

        return this._eventDispatcher;
    }

    private get channelsFactory(): ChannelsFactory {
        if (!this._channelsFactory) {
            this._channelsFactory = new ChannelsFactory(this.createUserChannel.bind(this), this.createAppChannel.bind(this), this.createPrivateChannel.bind(this));
        }

        return this._channelsFactory;
    }

    private createUserChannel(glueChannel: ChannelContext): Channel {
        return new UserChannel(this.channelsController, glueChannel).toApi();
    }

    private createAppChannel(id: string): Channel {
        return new AppChannel(this.channelsController, id).toApi();
    }

    private createPrivateChannel(channelId?: string): Channel {
        return new PrivateChannel(this.channelsController, channelId).toApi();
    }

    private get desktopAgent(): DesktopAgent {
        if (!this._desktopAgent)  {
            this._desktopAgent = new DesktopAgent(this.intentsController, this.applicationController, this.channelsController);
        }

        return this._desktopAgent;
    }

    private get channelsParser(): ChannelsParser {
        if (!this._channelsParser) {
            this._channelsParser = new ChannelsParser();
        }

        return this._channelsParser;
    }

    private get intentsController(): IntentsController {
        if (!this._intentsController) {
            this._intentsController = new IntentsController(this.glueController, this.channelsController, this.channelsFactory);
        }

        return this._intentsController;
    }

    private get applicationController(): ApplicationsController {
        if (!this._applicationController) {
            this._applicationController = new ApplicationsController(this.glueController);
        }

        return this._applicationController;
    }

    private get channelsController(): ChannelsController {
        if (!this._channelsController) {
            this._channelsController = new ChannelsController(
                this.glueController, 
                this.channelsStateStore, 
                this.channelsParser,
                this.channelsFactory,
                this.channelsCallbackRegistry,
                this.channelsPendingListenersStore
            );
        }

        return this._channelsController;
    }

    private get channelsStateStore(): ChannelsStateStore {
        if (!this._channelsStateStore) {
            this._channelsStateStore = new ChannelsStateStore();
        }

        return this._channelsStateStore;
    }

    private get channelsPendingListenersStore(): ChannelsPendingListenersStore {
        if (!this._channelsPendingListenersStore) {
            this._channelsPendingListenersStore = new ChannelsPendingListenersStore();
        }

        return this._channelsPendingListenersStore;
    }

    private get channelsCallbackRegistry(): ChannelsCallbackRegistry {
        if (!this._channelsCallbackRegistry) {
            this._channelsCallbackRegistry = new ChannelsCallbackRegistry();
        }

        return this._channelsCallbackRegistry;
    }

    private get eventsController(): GlueEventsController {
        if (!this._eventsController) {
            this._eventsController = new GlueEventsController(this.glueController, this.channelsCallbackRegistry);
        }

        return this._eventsController;
    }
}