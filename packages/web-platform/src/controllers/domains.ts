import { Glue42WebPlatform } from "../../platform";
import { CoreClientData, InternalPlatformConfig, PlatformDomain } from "../common/types";
import { libDomainDecoder } from "../shared/decoders";
import { Glue42Web } from "@glue42/web";
import logger from "../shared/logger";
import { SystemController } from "./system";
import { WindowsController } from "../libs/windows/controller";
import { ApplicationsController } from "../libs/applications/controller";
import { LayoutsController } from "../libs/layouts/controller";
import { WorkspacesController } from "../libs/workspaces/controller";
import { IntentsController } from "../libs/intents/controller";
import { ChannelsController } from "../libs/channels/controller";
import { NotificationsController } from "../libs/notifications/controller";
import { ExtensionController } from "../libs/extension/controller";

export class DomainsController {
    private readonly defaultDomainNames = ["system", "windows", "appManager", "layouts", "workspaces", "intents", "channels", "notifications", "extension"];

    private readonly domains: { [key in string]: PlatformDomain } = {
        system: { name: "system", libController: this.systemController },
        windows: { name: "windows", libController: this.windowsController },
        appManager: { name: "appManager", libController: this.applicationsController },
        layouts: { name: "layouts", libController: this.layoutsController },
        workspaces: { name: "workspaces", libController: this.workspacesController },
        intents: { name: "intents", libController: this.intentsController },
        channels: { name: "channels", libController: this.channelsController },
        notifications: { name: "notifications", libController: this.notificationsController },
        extension: { name: "extension", libController: this.extensionController }
    };

    constructor(
        private readonly systemController: SystemController,
        private readonly windowsController: WindowsController,
        private readonly applicationsController: ApplicationsController,
        private readonly layoutsController: LayoutsController,
        private readonly workspacesController: WorkspacesController,
        private readonly intentsController: IntentsController,
        private readonly channelsController: ChannelsController,
        private readonly notificationsController: NotificationsController,
        private readonly extensionController: ExtensionController
    ) { }

    private get logger(): Glue42Web.Logger.API | undefined {
        return logger.get("domains.controller");
    }

    public validateDomain(domainName: string): void {

        const domain = this.domains[domainName];

        if (!domain) {
            throw new Error(`Accessing a missing domain: ${domainName}. Mostly likely this is due to accessing Core Plus exclusive features.`);
        }

        const decoder = domain.domainNameDecoder ? domain.domainNameDecoder : libDomainDecoder;

        decoder?.runWithException(domainName);
    }

    public async startAllDomains(config: InternalPlatformConfig): Promise<void> {
        this.logger?.trace("Starting all domains lib controllers");

        await Promise.all(Object.values(this.domains).map((controller) => controller.libController.start(config)));

        this.logger?.trace("All domains have been initialized");
    }

    public notifyDomainsClientUnloaded(client: CoreClientData): void {
        this.logger?.trace(`detected unloading of client: ${client.windowId}, notifying all controllers`);

        Object.values(this.domains).forEach((domain) => {
            try {
                domain.libController.handleClientUnloaded?.(client.windowId, client.win);
            } catch (error: any) {
                const stringError = typeof error === "string" ? error : JSON.stringify(error.message);
                const controllerName = domain.name;
                this.logger?.error(`${controllerName} controller threw when handling unloaded client ${client.windowId} with error message: ${stringError}`);
            }
        });
    }

    public executeControlMessage(controlMessage: Glue42WebPlatform.ControlMessage): Promise<any> {
        const domain = this.domains[controlMessage.domain];

        if (!domain) {
            throw new Error(`Cannot process message for domain: ${controlMessage.domain} and operation ${controlMessage.operation}, because no domain can service it.`);
        }

        return domain.libController.handleControl(controlMessage);
    }

    public registerDynamicDomain(domain: PlatformDomain): void {
        const currentDomainNames = Object.values(this.domains).map((registeredDomain) => registeredDomain.name);

        if (currentDomainNames.some((domainName) => domainName === domain.name)) {
            throw new Error(`Cannot register a domain with name: ${domain.name}, because it is already registered`);
        }

        if (!domain.libController || !domain.libController.start || !domain.libController.handleControl || !domain.libController.handleClientUnloaded) {
            throw new Error(`Cannot register a domain with name: ${domain.name}, because it does not have a valid libController`);
        }

        if (!domain.domainNameDecoder) {
            throw new Error(`Cannot register a domain with name: ${domain.name}, because it does not have a domain decoder`);
        }

        this.domains[domain.name] = domain;
    }

    public unregisterDynamicDomain(domainName: string): void {
        if (this.defaultDomainNames.some((defaultDomainName) => defaultDomainName === domainName)) {
            throw new Error(`Cannot unregister a domain: ${domainName}, because it is a reserved default domain`);
        }

        delete this.domains[domainName];
    }
}