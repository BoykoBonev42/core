export type ExtensionOperationTypes = "clientHello" | "operationCheck";

export interface ClientHello {
    windowId?: string;
}

export interface ClientHelloResponse {
    widget: {
        inject: boolean;
    };
}
