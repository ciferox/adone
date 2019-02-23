const {
    is,
    configuration,
} = adone;

const _updateList = (config, listName, values) => {
    if (!config.has(listName)) {
        config.set(listName, []);
    }
    for (const item of values) {
        if (!config.raw[listName].includes(item)) {
            config.raw[listName].push(item);
        }
    }
}

export const create = async ({ cwd, include, exclude, skipNpm } = {}) => {
    const config = new configuration.Jsconfig({
        cwd
    });

    config.raw = {
        compilerOptions: {
            target: "es6",
            experimentalDecorators: true
        }
    };

    if (!skipNpm) {
        config.raw.exclude = [
            "node_modules"
        ];
    }

    if (is.array(include)) {
        _updateList(config, "include", include);
    }

    if (is.array(exclude)) {
        _updateList(config, "exclude", include);
    }

    return config.save();
}
