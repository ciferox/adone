// @flow

const {
    is
} = adone;

export default class Plugin {
    constructor(plugin: {}, key?: string) {
        if (!is.nil(plugin.name) && !is.string(plugin.name)) {
            throw new Error("Plugin .name must be a string, null, or undefined");
        }
        if (
            !is.nil(plugin.manipulateOptions) &&
            !is.function(plugin.manipulateOptions)
        ) {
            throw new Error(
                "Plugin .manipulateOptions must be a function, null, or undefined",
            );
        }
        if (!is.nil(plugin.post) && !is.function(plugin.post)) {
            throw new Error("Plugin .post must be a function, null, or undefined");
        }
        if (!is.nil(plugin.pre) && !is.function(plugin.pre)) {
            throw new Error("Plugin .pre must be a function, null, or undefined");
        }
        if (!is.nil(plugin.visitor) && !is.object(plugin.visitor)) {
            throw new Error("Plugin .visitor must be an object, null, or undefined");
        }

        this.key = plugin.name || key;

        this.manipulateOptions = plugin.manipulateOptions;
        this.post = plugin.post;
        this.pre = plugin.pre;
        this.visitor = plugin.visitor;
    }

    key: ?string;
    manipulateOptions: ?Function;
    post: ?Function;
    pre: ?Function;
    visitor: ?{};
}
