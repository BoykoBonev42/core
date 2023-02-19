/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { libDomainDecoder } from "../shared/decoders";
import { PromisePlus } from "../shared/promise-plus";
import { systemOperations } from "../shared/systemOperations";
import { BridgeOperation, LibController, LibDomains, OperationCheckConfig, OperationCheckResult } from "../shared/types";
import { GlueClientControlName, GlueCorePlusThemesStream, GlueWebPlatformControlName, GlueWebPlatformStreamName } from "./constants";

export class GlueBridge {
    private readonly platformMethodTimeoutMs = 10000;
    private controllers!: { [key in LibDomains]: LibController };
    private sub!: Glue42Core.AGM.Subscription;

    constructor(private readonly coreGlue: Glue42Core.GlueCore, private readonly communicationId: string) {}

    public get contextLib(): Glue42Core.Contexts.API {
        return this.coreGlue.contexts;
    }

    public get interopInstance(): string | undefined {
        return this.coreGlue.interop.instance.instance;
    }

    public async start(controllers: { [key in LibDomains]: LibController }): Promise<void> {
        this.controllers = controllers;

        await Promise.all([
            this.checkWaitMethod(GlueWebPlatformControlName),
            this.checkWaitMethod(GlueWebPlatformStreamName)
        ]);

        // this systemId will be missing if the platform is older than 1.12.X
        const systemId = this.communicationId;

        const [sub] = await Promise.all([
            this.coreGlue.interop.subscribe(GlueWebPlatformStreamName, systemId ? { target: { instance: this.communicationId } } : undefined),
            this.coreGlue.interop.registerAsync(GlueClientControlName, (args, _, success, error) => this.passMessageController(args, success, error))
        ]);

        this.sub = sub;

        this.sub.onData((pkg) => this.passMessageController(pkg.data));
    }

    public getInteropInstance(windowId: string): Glue42Core.Interop.Instance {
        const result = this.coreGlue.interop.servers().find((s) => s.windowId && s.windowId === windowId);

        return {
            application: result?.application,
            applicationName: result?.applicationName,
            peerId: result?.peerId,
            instance: result?.instance,
            windowId: result?.windowId
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async send<OutBound, InBound>(domain: LibDomains, operation: BridgeOperation, operationData: OutBound, options?: Glue42Core.AGM.InvokeOptions, webOptions?: { includeOperationCheck?: boolean }): Promise<InBound> {

        if (operation.dataDecoder) {
            try {
                operation.dataDecoder.runWithException(operationData);
            } catch (error: any) {
                throw new Error(`Unexpected Web->Platform outgoing validation error: ${error.message}, for operation: ${operation.name} and input: ${JSON.stringify(error.input)}`);
            }
        }

        const operationSupported = webOptions?.includeOperationCheck ? 
            (await this.checkOperationSupported(domain, operation)).isSupported :
            true;

        if (!operationSupported) {
            throw new Error(`Cannot complete operation: ${operation.name} for domain: ${domain} because this client is connected to a platform which does not support it`);
        }

        try {
            const operationResult = await this.transmitMessage(domain, operation, operationData, options);

            if (operation.resultDecoder) {
                operation.resultDecoder.runWithException(operationResult);
            }

            return operationResult;

        } catch (error: any) {
            if (error.kind) {
                throw new Error(`Unexpected Web<-Platform incoming validation error: ${error.message}, for operation: ${operation.name} and input: ${JSON.stringify(error.input)}`);
            }
            throw new Error(error.message);
        }
    }

    public async createNotificationsSteam(): Promise<Glue42Core.AGM.Subscription> {
        const streamExists = this.coreGlue.interop.methods().some((method) => method.name === GlueCorePlusThemesStream);

        if (!streamExists) {
            throw new Error("Cannot subscribe to theme changes, because the underlying interop stream does not exist. Most likely this is the case when this client is not connected to Core Plus.");
        }

        return this.coreGlue.interop.subscribe(GlueCorePlusThemesStream, this.communicationId ? { target: { instance: this.communicationId } } : undefined);
    }

    private async checkOperationSupported(domain: LibDomains, operation: BridgeOperation): Promise<OperationCheckResult> {
        try {
            const result = await this.send<OperationCheckConfig, OperationCheckResult>(domain, systemOperations.operationCheck, { operation: operation.name });

            return result;
        } catch (error) {
            return { isSupported: false };
        }
    }

    private checkWaitMethod(name: string): Promise<void> {
        return PromisePlus<void>((resolve) => {

            const hasMethod = this.coreGlue.interop.methods().some((method) => {
                const nameMatch = method.name === name;

                const serverMatch = this.communicationId ?
                    method.getServers().some((server) => server.instance === this.communicationId) :
                    true;

                return nameMatch && serverMatch;
            });

            if (hasMethod) {
                return resolve();
            }

            const unSub = this.coreGlue.interop.serverMethodAdded((data) => {
                const method = data.method;
                const server = data.server;

                const serverMatch = this.communicationId ?
                    server.instance === this.communicationId :
                    true;

                if (method.name === name && serverMatch) {
                    unSub();
                    resolve();
                }
            });

        }, this.platformMethodTimeoutMs, `Cannot initiate Glue Web, because a system method's discovery timed out: ${name}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private passMessageController(args: any, success?: (args?: any) => void, error?: (error?: string | object | undefined) => void): void {
        const decodeResult = libDomainDecoder.run(args.domain);

        if (!decodeResult.ok) {
            if (error) {
                error(`Cannot execute this client control, because of domain validation error: ${JSON.stringify(decodeResult.error)}`);
            }
            return;
        }

        const domain = decodeResult.result;

        this.controllers[domain]
            .handleBridgeMessage(args)
            .then((resolutionData: unknown) => {
                if (success) {
                    success(resolutionData);
                }
            })
            .catch((err: string | object | undefined) => {
                if (error) {
                    error(err);
                }
                console.warn(err);
            });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async transmitMessage(domain: string, operation: BridgeOperation, data: any, options?: Glue42Core.AGM.InvokeOptions): Promise<any> {

        const messageData = { domain, data, operation: operation.name };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let invocationResult: Glue42Core.Interop.InvocationResult<any>;

        const baseErrorMessage = `Internal Platform Communication Error. Attempted operation: ${JSON.stringify(operation.name)} with data: ${JSON.stringify(data)}. `;

        const systemId = this.communicationId;

        try {
            invocationResult = await this.coreGlue.interop.invoke(GlueWebPlatformControlName, messageData, systemId ? { instance: this.communicationId } : undefined, options);

            if (!invocationResult) {
                throw new Error("Received unsupported result from the platform - empty result");
            }

            if (!Array.isArray(invocationResult.all_return_values) || invocationResult.all_return_values.length === 0) {
                throw new Error("Received unsupported result from the platform - empty values collection");
            }

        } catch (error: any) {
            if (error && error.all_errors && error.all_errors.length) {
                // IMPORTANT: Do NOT change the `Inner message:` string, because it is used by other programs to extract the inner message of a communication error
                const invocationErrorMessage = error.all_errors[0].message;
                throw new Error(`${baseErrorMessage} -> Inner message: ${invocationErrorMessage}`);

            }
            // IMPORTANT: Do NOT change the `Inner message:` string, because it is used by other programs to extract the inner message of a communication error
            throw new Error(`${baseErrorMessage} -> Inner message: ${error.message}`);
        }

        return invocationResult.all_return_values[0].returned;
    }
}
