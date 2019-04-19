
const lazy = adone.lazify({
    BaseConfig: "./base",
    GenericConfig: "./generic",
    NpmConfig: "./npm"
}, adone.asNamespace(exports), require);

export const load = async (path, name, options) => {
    const config = new lazy.Generic(options);
    await config.load(path, name, options);
    return config;
};

export const loadSync = (path, name, options) => {
    const config = new lazy.Generic(options);
    config.loadSync(path, name, options);
    return config;
};
