import loadFullConfig from "./full";
export { loadFullConfig as default };
export { loadPartialConfig } from "./partial";

export const loadOptions = function (opts) {
    const config = loadFullConfig(opts);

    return config ? config.options : null;
}
