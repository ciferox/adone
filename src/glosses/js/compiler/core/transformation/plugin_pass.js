import Store from "../store";

export default class PluginPass extends Store {
    constructor(file, plugin, options = {}) {
        super();
        this.plugin = plugin;
        this.key = plugin.key;
        this.file = file;
        this.opts = options;
    }

    addHelper(...args) {
        return this.file.addHelper(...args);
    }

    addImport(...args) {
        return this.file.addImport(...args);
    }

    getModuleName(...args) {
        return this.file.getModuleName(...args);
    }

    buildCodeFrameError(...args) {
        return this.file.buildCodeFrameError(...args);
    }
}
