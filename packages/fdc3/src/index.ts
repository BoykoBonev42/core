import fdc3Factory from "./main";
import { checkIfInElectron } from "./shared/utils";

let globalFdc3 = window.fdc3 as any;

if (typeof globalFdc3 === "undefined") {
    globalFdc3 = fdc3Factory();

    /* If running in Glue42 Enterprise */
    checkIfInElectron(globalFdc3);

    window.fdc3 = globalFdc3;
} else {
    console.warn("Defaulting to using the auto-injected fdc3.");
}

export default globalFdc3;
