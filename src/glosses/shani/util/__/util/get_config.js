const { shani: { util: {
    __: {
        util: {
            defaultConfig
        }
    }
} } } = adone;

export default function getConfig(custom) {
    return Object.assign({}, defaultConfig, custom);
}
