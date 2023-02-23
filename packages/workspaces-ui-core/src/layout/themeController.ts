import { Glue42Web } from "@glue42/web";
import { WorkspacesUIExecutor } from "../uiExecutor";

export class ThemeController {
    constructor(private readonly _glue: Glue42Web.API, private readonly _uiExecutor: WorkspacesUIExecutor) { }

    public async applyTheme() {
        const isThemesAPISupported = await this.isThemesAPISupported();
        if (!isThemesAPISupported) {
            return;
        }

        this._glue.themes.onChanged(async (theme) => {
            this.changeTheme(theme.name);
        });

        const currentTheme = await this._glue.themes.getCurrent();
        this.changeTheme(currentTheme.name);
    }

    private async isThemesAPISupported() {
        if (!this._glue.themes) {
            return false;
        }

        try {
            await this._glue.themes.getCurrent();
            return true;
        } catch (error) {
            return false;
        }
    }

    private async changeTheme(newThemeName: string) {
        const allThemes = await this._glue.themes.list();
        const allThemeNames = allThemes.map(t => t.name);

        this._uiExecutor.changeTheme(newThemeName, allThemeNames);
    }
}