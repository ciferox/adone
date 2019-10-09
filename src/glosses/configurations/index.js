
const lazy = adone.lazify({
    BaseConfig: "./base",
    GenericConfig: "./generic",
    NpmConfig: "./npm"
}, adone.asNamespace(exports), require);

export const load = async (path, options) => {
    const config = new lazy.Generic(options);
    await config.load(path, options);
    return config;
};

export const loadSync = (path, options) => {
    const config = new lazy.Generic(options);
    config.loadSync(path, options);
    return config;
};
