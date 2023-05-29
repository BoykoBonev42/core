import { IoC } from "./shared/ioc";
import { ExtendedFDC3DesktopAgent } from "./types/fdc3Types";

const fdc3Factory = (): ExtendedFDC3DesktopAgent => {
    const ioc = new IoC();

    ioc.glueController.createGluePromise();

    ioc.eventReceiver.start();

    return ioc.fdc3;
};

export default fdc3Factory;
