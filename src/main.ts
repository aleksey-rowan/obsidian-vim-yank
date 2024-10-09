import { MarkdownView, Plugin } from "obsidian";

import { EditorView } from "@codemirror/view";

import { MarkViewPlugin, markViewPlugin } from "./markViewPlugin";
import { Vim, MarkdownViewExtended, vimEvents } from "./types";

import { Settings, SettingsTab, DEFAULT_SETTINGS } from "./settings"

// TODO: option to change highlight duration
// TODO: option to change the colour of highlight
// TODO: option to supress in visual mode

/* The `VimYankHighlightPlugin` class is a TypeScript plugin that highlights yanked text in the
Obsidian editor when using the Vim keybindings. */
export default class VimYankHighlightPlugin extends Plugin {
    initialized: boolean;

    vimCommand: string[] = [];
    vimCommandDone = false;

    codeMirrorVimObject: Vim;
    timeoutHandle: number;

    settings: Settings;

    private get activeView() {
        return this.app.workspace.getActiveViewOfType(
            MarkdownView
        ) as MarkdownViewExtended;
    }

    /**
     * Returns the CodeMirror instance of the active editor view.
     * @returns an object of type `EditorView` or `undefined`.
     */
    private get activeEditorView(): EditorView | undefined {
        return (<{ editor?: { cm: EditorView } }>this.activeView?.leaf.view)
            .editor?.cm;
    }

    // CodeMirror editor from the active view
    // the one you can set event listeners on
    private get codeMirror() {
        return this.activeView?.editMode?.editor?.cm?.cm;
    }

    async onload() {
        await this.loadSettings()
        this.addSettingTab(new SettingsTab(this.app, this))

        this.registerEditorExtension([markViewPlugin]);

        this.registerEvent(
            this.app.workspace.on("active-leaf-change", () => {
                if (!this.initialized) this.initialize();
            })
        );
    }

    private initialize() {
        if (this.activeView && this.codeMirror) {
            this.codeMirrorVimObject = window.CodeMirrorAdapter?.Vim;

            const cmV = this.codeMirror;

            cmV.off(vimEvents.keypress, this.onVimKeypress);
            cmV.on(vimEvents.keypress, this.onVimKeypress);
            cmV.off(vimEvents.commanddone, this.onVimCommandDone);
            cmV.on(vimEvents.commanddone, this.onVimCommandDone);
        }
    }

    // for some reason, done fires before keypress
    // and you need the next key after done to figure out the full command
    private onVimKeypress = (vimKey: string) => {
        // Push the key to the command
        this.vimCommand.push(vimKey);

        // Check if the command is done;
        // if it is, it means the current key is the last one in that command
        if (!this.vimCommandDone) return;

        // FIXME: implement proper yank command snooping if possible; see #3
        if (this.vimCommand.contains("y") || this.vimCommand.contains("Y")) {
            this.highlightYank();
        }

        this.vimCommandDone = false;
        this.vimCommand.splice(0, this.vimCommand.length);
    };

    /**
     * The function sets a boolean variable to true when a Vim command is done.
     * @param {any} reason - The "reason" parameter is a variable that can hold any value. It is used
     * to indicate the reason or result of the Vim command being done.
     */
    private onVimCommandDone = () => {
        this.vimCommandDone = true;
    };

    /**
     * The `highlightYank()` function retrieves the yank buffer from the Vim controller, sets the yank
     * text in the MarkView plugin, and then cleans the yank text after a delay of 0.5 seconds.
     */
    highlightYank() {
        // TODO: check if it's possible to get the selected text from the selection event; it will simplify the whole thing
        const yankRegister = this.codeMirrorVimObject
            .getRegisterController()
            .getRegister("yank");
        const currentYankBuffer = yankRegister.keyBuffer[0];

        if (!this.activeEditorView) return;

        const plugin = this.activeEditorView.plugin(
            markViewPlugin
        ) as MarkViewPlugin;

        // TODO: account for visual block mode since it requires multipl disjointed highlights
        plugin.setYankText(currentYankBuffer, this.activeEditorView);

        const timeoutEditorView = this.activeEditorView;
        clearTimeout(this.timeoutHandle);
        this.timeoutHandle = window.setTimeout(() => {
            plugin.cleanYankText(timeoutEditorView);
        }, this.settings.highlightDuration);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        const cmV = this.codeMirror;
        if (!cmV) return;

        cmV.off(vimEvents.keypress, this.onVimKeypress);
        cmV.off(vimEvents.commanddone, this.onVimCommandDone);
    }
}
