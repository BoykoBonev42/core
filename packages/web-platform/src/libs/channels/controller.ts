/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Web } from "@glue42/web";
import { Glue42Core } from "@glue42/core";
import { Glue42WebPlatform } from "../../../platform";
import { BridgeOperation, InternalPlatformConfig, LibController, OperationCheckConfig, OperationCheckResult } from "../../common/types";
import { GlueController } from "../../controllers/glue";
import logger from "../../shared/logger";
import { ChannelContextPrefix } from "../../common/constants";
import { channelContextDecoder, channelOperationDecoder, ChannelOperationTypes, GetWindowOnChannelInfoDecoder, windowWithChannelFilterDecoder } from "./decoders";
import { operationCheckConfigDecoder, operationCheckResultDecoder } from "../../shared/decoders";
import { WindowsController } from "../windows/controller";

export class ChannelsController implements LibController {
    private operations: { [key in ChannelOperationTypes]: BridgeOperation } = {
        addChannel: { name: "addChannel", execute: this.addChannel.bind(this), dataDecoder: channelContextDecoder },
        operationCheck: { name: "operationCheck", dataDecoder: operationCheckConfigDecoder, resultDecoder: operationCheckResultDecoder, execute: this.handleOperationCheck.bind(this) },
        getWindowsWithChannels: {name: "getWindowsWithChannels", execute: this.getWindowsWithChannels.bind(this), dataDecoder: windowWithChannelFilterDecoder, resultDecoder: GetWindowOnChannelInfoDecoder}
    };

    constructor(
        private readonly glueController: GlueController,
        private readonly windowsController: WindowsController
    ) { }

    private get logger(): Glue42Core.Logger.API | undefined {
        return logger.get("channels.controller");
    }

    public async start(config: InternalPlatformConfig): Promise<void> {
        const channelDefinitions = config.channels.definitions;

        this.logger?.trace("initializing channels");

        await this.setupChannels(channelDefinitions);

        this.logger?.trace("initialization is completed");
    }

    public async handleControl(args: any): Promise<any> {
        const channelsData = args.data;

        const commandId = args.commandId;

        const operationValidation = channelOperationDecoder.run(args.operation);
        
        if (!operationValidation.ok) {
            throw new Error(`This channels request cannot be completed, because the operation name did not pass validation: ${JSON.stringify(operationValidation.error)}`);
        }

        const operationName: ChannelOperationTypes = operationValidation.result;

        const incomingValidation = this.operations[operationName].dataDecoder?.run(channelsData);
        
        if (incomingValidation && !incomingValidation.ok) {
            throw new Error(`Channels request for ${operationName} rejected, because the provided arguments did not pass the validation: ${JSON.stringify(incomingValidation.error)}`);
        }

        this.logger?.debug(`[${commandId}] ${operationName} command is valid with data: ${JSON.stringify(channelsData)}`);

        const result = await this.operations[operationName].execute(channelsData, commandId);

        const resultValidation = this.operations[operationName].resultDecoder?.run(result);

        if (resultValidation && !resultValidation.ok) {
            throw new Error(`Channels request for ${operationName} could not be completed, because the operation result did not pass the validation: ${JSON.stringify(resultValidation.error)}`);
        }

        this.logger?.trace(`[${commandId}] ${operationName} command was executed successfully`);

        return result;
    }

    private async handleOperationCheck(config: OperationCheckConfig): Promise<OperationCheckResult> {
        const operations = Object.keys(this.operations);

        const isSupported = operations.some((operation) => operation.toLowerCase() === config.operation.toLowerCase());

        return { isSupported };
    }

    private async getWindowsWithChannels(filter: Glue42Web.Channels.WindowWithChannelFilter): Promise<{windows: Glue42Web.Channels.WindowIdOnChannelInfo[]}> {
        let result: Glue42Web.Channels.WindowIdOnChannelInfo[];

        const windowsList  = this.glueController.clientGlue.windows.list();

        const windowsWithChannels = (await Promise.all(windowsList.map(async (w) => {
            const channel = await this.windowsController.getChannel({ windowId: w.id});

            if (channel) {
                return {
                    application: w.name,
                    windowId: w.id,
                    channel
                };
            }
        }))).filter((w): w is Glue42Web.Channels.WindowIdOnChannelInfo => !!w);

        if (filter) {
            result = windowsWithChannels.filter(w => {
                let match = true;

                if (filter.application) {
                    match = filter.application === w.application;
                } else if (filter.windowIds) {
                    match = filter.windowIds.indexOf(w.windowId) !== -1;
                } else if (filter.channels) {
                    match = filter.channels.indexOf(w.channel) !== -1;
                }

                return match;
            });
        } else {
            result = windowsWithChannels;
        }

        return { windows: result };
    }

    private async setupChannels(channels: Glue42WebPlatform.Channels.ChannelDefinition[]): Promise<void> {
        await Promise.all(channels.map((channel) => this.addChannel(channel)));
    }

    private async addChannel(info: Glue42WebPlatform.Channels.ChannelDefinition, commandId?: string): Promise<void> {
        this.trace(`[${commandId}] handling addChannel command with a valid name: ${info.name}, color: ${info.meta.color} and data: ${JSON.stringify(info.data)}`, commandId);
        
        const context: Glue42Web.Channels.ChannelContext = {
            name: info.name,
            meta: info.meta,
            data: info.data || {}
        };

        const contextName = this.createContextName(context.name);

        this.trace(`[${commandId}] setting a new channel context with name: ${contextName}`, commandId);

        await this.glueController.setContext(contextName, context);

        this.trace(`[${commandId}] channel context with name: ${contextName} created successfully`, commandId);
    }

    private createContextName(channelName: string): string {
        return `${ChannelContextPrefix}${channelName}`;
    }

    private trace(msg: string, commandId?: string): void {
        if (commandId) {
            this.logger?.trace(msg);
        }
    }
}
