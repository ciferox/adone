import { getOptions } from "../options";
import StatementParser from "./statement";

const {
    is
} = adone;

const pluginsMap = function (plugins) {
    const pluginMap = Object.create(null);
    for (const plugin of plugins) {
        const [name, options = {}] = is.array(plugin) ? plugin : [plugin, {}];
        if (!pluginMap[name]) {
            pluginMap[name] = options || {};
        }
    }
    return pluginMap;
};

export default class Parser extends StatementParser {
    constructor(options, input) {
        options = getOptions(options);
        super(options, input);

        this.options = options;
        this.inModule = this.options.sourceType === "module";
        this.input = input;
        this.plugins = pluginsMap(this.options.plugins);
        this.filename = options.sourceFilename;
    }

    parse() {
        const file = this.startNode();
        const program = this.startNode();
        this.nextToken();
        return this.parseTopLevel(file, program);
    }
}
