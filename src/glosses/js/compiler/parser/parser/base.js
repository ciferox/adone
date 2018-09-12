import { reservedWords } from "../util/identifier";


export default class BaseParser {
    //   // Properties set by constructor in index.js
    //   options: Options;

    //   inModule;

    //   plugins: PluginsMap;

    //   filename: ?string;

    //   sawUnambiguousESM = false;

    //   // Initialized by Tokenizer
    //   state: State;

    //   input;

    isReservedWord(word) {
        if (word === "await") {
            return this.inModule;
        }
        return reservedWords[6](word);

    }

    hasPlugin(name) {
        return Object.hasOwnProperty.call(this.plugins, name);
    }

    getPluginOption(plugin, name) {
        if (this.hasPlugin(plugin)) {
            return this.plugins[plugin][name];
        }
    }
}
