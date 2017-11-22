const { is } = adone;

const defaultOptions = {
    protocols: ["http", "https", "ftp"],
    requireTld: true,
    requireProtocol: false,
    requireHost: true,
    requireValidProtocol: true,
    allowUnderscores: false,
    allowTrailingDot: false,
    allowProtocolRelativeUrls: false
};

const wrappedIpv6 = /^\[([^\]]+)\](?::([0-9]+))?$/;

const checkHost = (host, matches) => {
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        if (host === match || (is.regexp(match) && match.test(host))) {
            return true;
        }
    }
    return false;
};

export default function isURL(url, options) {
    if (!url || url.length >= 2083 || /[\s<>]/.test(url)) {
        return false;
    }
    if (url.indexOf("mailto:") === 0) {
        return false;
    }
    options = {
        ...defaultOptions,
        ...options
    };
    let protocol;
    let auth;
    let host;
    let port;
    let portStr;
    let split;
    let ipv6;

    split = url.split("#");
    url = split.shift();

    split = url.split("?");
    url = split.shift();

    split = url.split("://");
    if (split.length > 1) {
        protocol = split.shift();
        if (options.requireValidProtocol && options.protocols.indexOf(protocol) === -1) {
            return false;
        }
    } else if (options.requireProtocol) {
        return false;
    } else if (options.allowProtocolRelativeUrls && url.substr(0, 2) === "//") {
        split[0] = url.substr(2);
    }
    url = split.join("://");

    if (url === "") {
        return false;
    }

    split = url.split("/");
    url = split.shift();

    if (url === "" && !options.requireHost) {
        return true;
    }

    split = url.split("@");
    if (split.length > 1) {
        auth = split.shift();
        if (auth.indexOf(":") >= 0 && auth.split(":").length > 2) {
            return false;
        }
    }
    const hostname = split.join("@");

    portStr = null;
    ipv6 = null;
    const ipv6Match = hostname.match(wrappedIpv6);
    if (ipv6Match) {
        host = "";
        ipv6 = ipv6Match[1];
        portStr = ipv6Match[2] || null;
    } else {
        split = hostname.split(":");
        host = split.shift();
        if (split.length) {
            portStr = split.join(":");
        }
    }

    if (!is.null(portStr)) {
        port = parseInt(portStr, 10);
        if (!/^[0-9]+$/.test(portStr) || port <= 0 || port > 65535) {
            return false;
        }
    }

    if (!is.ip(host) && !is.fqdn(host, options) && (!ipv6 || !is.ip(ipv6, 6))) {
        return false;
    }

    host = host || ipv6;

    if (options.hostWhitelist && !checkHost(host, options.hostWhitelist)) {
        return false;
    }
    if (options.hostBlacklist && checkHost(host, options.hostBlacklist)) {
        return false;
    }

    return true;
}
