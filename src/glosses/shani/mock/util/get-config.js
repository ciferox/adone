import defaultConfig from "./default-config";

export default function getConfig(custom) {
    const config = {};

    custom = custom || {};

    for (const prop in defaultConfig) {
        if (defaultConfig.hasOwnProperty(prop)) {
            config[prop] = custom.hasOwnProperty(prop) ? custom[prop] : defaultConfig[prop];
        }
    }

    return config;
}
