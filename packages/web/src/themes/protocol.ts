import { Glue42Web } from "../../web";
import { allThemesResponseDecoder, selectThemeConfigDecoder, simpleThemeResponseDecoder } from "../shared/decoders";
import { BridgeOperation } from "../shared/types";

export type ThemesOperationTypes = "getCurrent" | "list" | "select";

export const operations: { [key in ThemesOperationTypes]: BridgeOperation } = {
    getCurrent: { name: "getCurrent", resultDecoder: simpleThemeResponseDecoder },
    list: { name: "list", resultDecoder: allThemesResponseDecoder },
    select: { name: "select", dataDecoder: selectThemeConfigDecoder }
};

export interface SimpleThemeResponse {
    theme: Glue42Web.Themes.Theme;
}

export interface AllThemesResponse {
    themes: Glue42Web.Themes.Theme[];
}

export interface SelectThemeConfig {
    name: string;
}
