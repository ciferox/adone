const { assertion: $assert } = adone;

export default function isProxyEnabled() {
    return $assert.config.useProxy && typeof Proxy !== "undefined" && typeof Reflect !== "undefined";
}
