import CONSTANTS from "./constants.js";
import * as lib from "./lib.js";

Hooks.once("init", () => {
    window.AntiLagger = new AntiLaggerHandler();
});

Hooks.once("ready", () => {

    console.log("anti-lagger | Ready")

    Hooks.call("AntiLaggerReady");

    setTimeout(() => {
        window.AntiLagger.postSetup();
    }, 250);

});

class AntiLaggerHandler {

    constructor() {

        for (const [key, value] of Object.entries(foundry.utils.deepClone(CONSTANTS.SETTINGS))) {
            game.settings.register(CONSTANTS.MODULE_NAME, key, value);
        }

        game.settings.registerMenu("anti-lagger", "anti-lagger", {
            name: "anti-lagger",
            label: "Show Dialog",
            icon: "fas fa-gauge",
            type: AntiLaggerApplication,
            restricted: false
        });

        this._settings = foundry.utils.deepClone(CONSTANTS.BASE_SETTINGS);

        const quality = lib.getSetting(CONSTANTS.SETTING_KEYS.POTATO_LEVEL);
        this._quality = Number.isInteger(quality) && quality >= 0 && quality <= 2 ? quality : 1;

    }

    get current_settings() {
        return this.settings[this.quality];
    }

    set settings(settings) {
        throw new Error("You cannot set settings directly, please use AntiLagger.addSetting and AntiLagger.removeSetting");
    }

    get settings() {
        return this._settings;
    }

    _validate_quality_level(quality_level) {
        if (this.settings[quality_level] === undefined) throw new Error("quality_level must be 0, 1, or 2 - low, medium, and high settings");
    }

    _validate_module(quality_level, module) {
        this._validate_quality_level(quality_level);
        if (this.settings[quality_level][module] === undefined) throw `Module setting "${module}" not found in quality level of "${quality_level}"`;
    }

    _validate_setting(quality_level, module, setting) {
        this._validate_module(quality_level, module);
        if (this.settings[quality_level][module][setting] === undefined) throw `Setting "${setting}" in module "${module}" not found`;
    }

    get numberOfSettings() {
        let numberOfSettings = [];
        for (let i = 0; i < this.settings.length; i++) {
            numberOfSettings[i] = 0;
            for (let settings of Object.values(this.settings[i])) {
                numberOfSettings[i] += Object.keys(settings).length;
            }
        }
        return numberOfSettings;
    }

    postSetup() {

        let currentNumberOfSettings = this.numberOfSettings[this.quality];

        const hasBeenPrompted = lib.getSetting(CONSTANTS.SETTING_KEYS.HAS_BEEN_PROMPTED);
        const promptUsers = lib.getSetting(CONSTANTS.SETTING_KEYS.PROMPT_USERS);
        const numberOfSettings = lib.getSetting(CONSTANTS.SETTING_KEYS.NUMBER_OF_SETTINGS);

        if (!hasBeenPrompted && promptUsers) {
            this.showDialog();
        } else if (currentNumberOfSettings !== numberOfSettings) {
            void this.updateSettings().catch(console.error);
        }
    }

    async updateSettings() {

        let modules = Object.keys(this.current_settings);

        let currentNumberOfSettings = this.numberOfSettings[this.quality];

        const failures = [];

        for (let module of modules) {
            for (let [setting, value] of Object.entries(this.current_settings[module])) {
                try {
                    const definition = game.settings.settings.get(`${module}.${setting}`);
                    if (!definition) {
                        console.warn(`anti-lagger | Skipping unregistered setting ${module}.${setting}`);
                        continue;
                    }
                    if (definition.scope !== "client") {
                        console.warn(`anti-lagger | Skipping non-client setting ${module}.${setting}`);
                        continue;
                    }
                    await game.settings.set(module, setting, value);
                    console.log(`anti-lagger | Set ${module}.${setting} to ${value}`);
                } catch (err) {
                    failures.push(`${module}.${setting}`);
                    console.error(`anti-lagger | Could not set ${module}.${setting} to ${value}`, err);
                }
            }
        }

        if (failures.length) throw new Error(`anti-lagger | Failed to save: ${failures.join(", ")}`);
        await lib.setSetting(CONSTANTS.SETTING_KEYS.POTATO_LEVEL, this.quality);
        await lib.setSetting(CONSTANTS.SETTING_KEYS.NUMBER_OF_SETTINGS, currentNumberOfSettings);

    }

    /**
     * Locally prompts the settings dialog
     *
     * @return {FormApplication}    The potato FormApplication
     */
    showDialog() {
        return new AntiLaggerApplication().render(true);
    }

    get quality() {
        return this._quality;
    }

    /**
     * Sets the graphic quality of the client
     * @param {number}     quality_level  The quality level which to apply
     *
     * @return {boolean}          If the quality level was applied succeeded
     */
    set quality(quality_level) {

        if (typeof quality_level !== 'number') throw new Error("quality must be of type number");
        if (!Number.isInteger(quality_level) || !(quality_level >= 0 && quality_level <= 2)) throw new Error("quality must be 0, 1, or 2");

        this._quality = quality_level;

        void this.updateSettings().catch(console.error);
    }

    /**
     * Gets the value of a setting of a module at a quality level
     * @param {number} quality_level  The quality level which to get the setting from
     * @param {string} module      The module the setting belongs to
     * @param {string} setting      The setting to get the value from
     *
     * @return {any}          The value of the setting
     */
    getSetting(quality_level = 1, module = "", setting = "") {

        this._validate_setting(quality_level, module, setting);

        return this.settings[quality_level][module][setting];

    }

    /**
     * Adds a setting to be applied on a quality level
     * @param {number}     quality_level  The quality level which to apply the setting to
     * @param {string}     module      The module the setting belongs to
     * @param {string}     setting      The setting to modify
     * @param {any}      value      The value to set
     * @param {boolean}  force      Whether to force-apply the setting right away should the client have the same quality level
     *
     * @return {boolean}          If setting was applied succeeded
     */
    addSetting(quality_level = 1, module = "", setting = "", value = "", force = false) {

        this._validate_quality_level(quality_level);

        if (this.settings[quality_level][module] === undefined) {
            this.settings[quality_level][module] = {};
        }

        this.settings[quality_level][module][setting] = value;

        if (force && this.quality === quality_level) {
            try {
                game.settings.set(module, setting, value);
                return true;
            } catch (err) {
                console.error(`anti-lagger | Could not set ${module}.${setting} to ${value} - please see log below`);
                throw err;
            }
        }

        return true;

    }

    /**
     * Removes a setting from a quality level
     * @param {number}     quality_level  The quality level which to apply the setting to
     * @param {string}     module      The module the setting belongs to
     * @param {string}     setting      The setting to modify
     *
     * @return {boolean}          If setting was removed successfully
     */
    removeSetting(quality_level = 1, module = "", setting = "") {

        this._validate_setting(quality_level, module, setting);

        try {
            delete this.settings[quality_level][module][setting];
        } catch (err) {
            console.error(`anti-lagger | Could not remove ${module}.${setting} - please see log below`);
            throw err;
        }

        return true;

    }

}

class AntiLaggerApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: "anti-lagger",
        window: {
            contentClasses: ["standard-form"],
            icon: "fa-solid fa-gauge"
        },
        position: { width: 680 },
        tag: "form",
        form: {
            handler: AntiLaggerApplication.myFormHandler,
            submitOnChange: false,
            closeOnSubmit: true
        }
    }

    get title() {
        return game.i18n.localize("AntiLagger.Title");
    }

    static PARTS = {
        form: {
            template: `modules/anti-lagger/templates/potato-template.hbs`
        },
    }

    static async myFormHandler(event, form, formData) {
        const level = form.querySelector(`.potato-level-container[active]`)
        if(!level) return;
        const quality = Number(level.getAttribute("level"));
        window.AntiLagger._validate_quality_level(quality);
        window.AntiLagger._quality = quality;
        await window.AntiLagger.updateSettings();
        await lib.setSetting(CONSTANTS.SETTING_KEYS.HAS_BEEN_PROMPTED, true);
    }

    /** @override */
    async _onRender(context, options) {
        await super._onRender(context, options);
        const elements = this.element.querySelectorAll(".potato-level-container")
        for(let element of elements) {
            element.addEventListener("click", this._selectedPotatoLevel.bind(this));
        }

    }

    _selectedPotatoLevel(event) {
        event.preventDefault();
        for(let element of this.element.querySelectorAll(".potato-level-container")){
            element.removeAttribute('active', false);
        }
        const btn = event.currentTarget;
        btn.setAttribute('active', true);
    }

    async _prepareContext() {
        return {
            potato_quality: window.AntiLagger.quality,
        }
    }

}
