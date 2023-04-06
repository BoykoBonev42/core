/* eslint-disable @typescript-eslint/no-explicit-any */
import { GlueSearchFactoryFunction, Glue42Search } from "../search.d";
import { Glue42Core } from "@glue42/core";
import { IoC } from "./shared/ioc";

const factoryFunction: GlueSearchFactoryFunction = async (glue: Glue42Core.GlueCore, config?: Glue42Search.Config): Promise<void> => {

    const ioc = new IoC(glue, config);

    (glue as any).search = ioc.facade.exposeApi();
};

// attach to window object
if (typeof window !== "undefined") {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (window as any).GlueSearch = factoryFunction;
}

export default factoryFunction;
