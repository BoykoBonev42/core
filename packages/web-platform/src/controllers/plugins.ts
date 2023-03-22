/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42WebPlatform } from "../../platform";
import { InternalPlatformConfig, PluginsConfig } from "../common/types";
import { GlueController } from "./glue";
import { InterceptionController } from "./interception";
import logger from "../shared/logger";
import { Glue42Web } from "@glue42/web";
import { extractErrorMsg } from "../shared/utils";

export class PluginsController {

    private handlePluginMessage!: (args: Glue42WebPlatform.Plugins.BaseControlMessage, pluginName: string) => Promise<any>;
    private platformApi!: Glue42WebPlatform.API;
    private allPlugins!: Glue42WebPlatform.Plugins.PluginDefinition[];
    private corePlus?: Glue42WebPlatform.CorePlus.Config;
    public registeredPlugins: Array<{ name: string, version: string }> = [];

    constructor(
        private readonly interceptionController: InterceptionController,
        private readonly glueController: GlueController,
        private readonly startCore: (platformConfig: InternalPlatformConfig) => Promise<void>
    ) {}

    private get logger(): Glue42Web.Logger.API | undefined {
        return logger.get("plugins.controller");
    }

    public async shutdown(): Promise<void> {
        if (this.corePlus?.stop) {
            await this.corePlus.stop();
        }

        this.allPlugins.forEach((plugin) => {
            if (!plugin.stop) {
                return;
            }

            try {
                plugin.stop();
            } catch (error) {
                this.logger?.warn(`Plugin: ${plugin.name} threw while onPlatformShutdown -> ${extractErrorMsg(error)}`);
            }
        });

        this.allPlugins = [];
        this.registeredPlugins = [];

    }

    public async start(config: PluginsConfig): Promise<void> {

        if (!config.plugins) {
            return;
        }

        this.allPlugins = config.plugins;

        this.handlePluginMessage = config.handlePluginMessage;

        this.platformApi = config.api;

        if (!config.plugins || !config.plugins.length) {
            return;
        }

        const criticalPlugins: Array<Promise<void>> = [];

        for (const plugin of config.plugins) {
            const startPromise = this.startPlugin(plugin);

            if (plugin.critical) {
                criticalPlugins.push(startPromise);
            }
        }

        await Promise.all(criticalPlugins);
    }

    public async startCorePlus(platformConfig: InternalPlatformConfig): Promise<void> {
        if (!platformConfig.corePlus) {
            return;
        }

        this.corePlus = platformConfig.corePlus;

        await this.startCore(platformConfig);
    }

    private async startPlugin(definition: Glue42WebPlatform.Plugins.PluginDefinition): Promise<void> {
        try {
            const platformControls: Glue42WebPlatform.Plugins.PlatformControls = this.buildPlatformControls(definition.name, this.platformApi);

            await definition.start(this.glueController.clientGlue, definition.config, platformControls);

            this.registerPlugin(definition.name, definition.version ?? "N/A");

        } catch (error: any) {
            const stringError = typeof error === "string" ? error : JSON.stringify(error.message);
            const message = `Plugin: ${definition.name} threw while initiating: ${stringError}`;

            if (definition.critical) {
                throw new Error(message);
            } else {
                this.logger?.warn(message);
            }
        }
    }

    private buildPlatformControls(pluginName: string, api: Glue42WebPlatform.API): Glue42WebPlatform.Plugins.PlatformControls {
        return {
            // control is deprecated, but remains here for backwards compatibility 
            control: (args: Glue42WebPlatform.Plugins.BaseControlMessage): Promise<any> => this.handlePluginMessage(args, pluginName),
            logger: logger.get(pluginName),
            platformApi: api,
            interception: {
                register: (request: Glue42WebPlatform.Plugins.InterceptorRegistrationRequest) => this.interceptionController.registerInterceptor(request, pluginName)
            },
            system: {
                sendControl: (args: Glue42WebPlatform.Plugins.BaseControlMessage): Promise<any> => this.handlePluginMessage(args, pluginName)
            }
        };
    }

    private registerPlugin(name: string, version: string): void {
        if (typeof name !== "string" || !name.length) {
            return;
        }

        const existingPlugin = this.registeredPlugins.some((plugin) => plugin.name === name);

        if (existingPlugin) {
            return;
        }

        this.registeredPlugins.push({ name, version });
    }
}