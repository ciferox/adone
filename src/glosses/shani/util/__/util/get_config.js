const { shani: { util: { __ } } } = adone;

export default function getConfig(custom) {
    return Object.assign({}, __.util.defaultConfig, custom);
}
