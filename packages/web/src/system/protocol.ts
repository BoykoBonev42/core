import { anyDecoder } from "../shared/decoders";
import { BridgeOperation } from "../shared/types";

export type SystemOperationTypes = "getEnvironment" | "getBase" | "platformShutdown";

export const operations: { [key in SystemOperationTypes]: BridgeOperation } = {
    getEnvironment: { name: "getEnvironment", resultDecoder: anyDecoder },
    getBase: { name: "getBase", resultDecoder: anyDecoder },
    platformShutdown: { name: "platformShutdown" }
};
