import VimYankHighlightPlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";

export interface Settings {
    highlightDuration: number
}

export const DEFAULT_SETTINGS: Partial<Settings> = {
    highlightDuration: 500
}

export class SettingsTab extends PluginSettingTab {
    plugin: VimYankHighlightPlugin;

    constructor(app: App, plugin: VimYankHighlightPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;

        containerEl.empty();

    new Setting(containerEl)
        .setName("Date duration")
        .setDesc("Duration in milliseconds for the highlights")
        .addText((text) =>
            text
                .setPlaceholder("500")
                .setValue(this.plugin.settings.highlightDuration.toString())
                .onChange(async (durationString) => {
                    const duration = parseInt(durationString);
                    if (isNaN(duration)) {
                        this.plugin.settings.highlightDuration = DEFAULT_SETTINGS.highlightDuration!;
                        await this.plugin.saveSettings();
                        return;
                    }
                    this.plugin.settings.highlightDuration = duration;
                    await this.plugin.saveSettings();
                })
        );
    }
}
