const {
    is,
    error,
    util,
    std: {
        url: { parse: urlParse }
    },
    database: {
        mysql: { c }
    }
} = adone;

export default class ConnectionConfig {
    constructor(options) {
        if (is.string(options)) {
            options = ConnectionConfig.parseUrl(options);
        }

        this.isServer = options.isServer;
        this.stream = options.stream;

        this.host = options.host || "localhost";
        this.port = options.port || 3306;
        this.localAddress = options.localAddress;
        this.socketPath = options.socketPath;
        this.user = options.user || undefined;
        this.password = options.password || undefined;
        this.passwordSha1 = options.passwordSha1 || undefined;
        this.database = options.database;
        if (is.undefined(options.connectTimeout)) {
            this.connectTimeout = 10000;
        } else {
            this.connectTimeout = options.connectTimeout;
        }
        this.insecureAuth = options.insecureAuth || false;
        this.supportBigNumbers = options.supportBigNumbers || false;
        this.bigNumberStrings = options.bigNumberStrings || false;
        this.decimalNumbers = options.decimalNumbers || false;
        this.dateStrings = options.dateStrings || false;
        this.debug = options.debug;
        this.trace = options.trace !== false;
        this.stringifyObjects = options.stringifyObjects || false;
        this.timezone = options.timezone || "local";
        this.queryFormat = options.queryFormat;
        this.pool = options.pool || undefined;
        if (is.string(options.ssl)) {
            this.ssl = ConnectionConfig.getSSLProfile(options.ssl);
        } else {
            this.ssl = options.ssl || false;
        }
        this.multipleStatements = options.multipleStatements || false;
        this.rowsAsArray = options.rowsAsArray || false;
        this.namedPlaceholders = options.namedPlaceholders || false;
        this.nestTables = is.undefined(options.nestTables) ? undefined : options.nestTables;
        this.typeCast = is.undefined(options.typeCast) ? true : options.typeCast;

        if (this.timezone[0] === " ") {
            // "+" is a url encoded char for space so it
            // gets translated to space when giving a
            // connection string..
            this.timezone = `+${this.timezone.substr(1)}`;
        }

        if (this.ssl) {
            // Default rejectUnauthorized to true
            this.ssl.rejectUnauthorized = this.ssl.rejectUnauthorized !== false;
        }

        this.maxPacketSize = 0;
        if (options.charset) {
            this.charsetNumber = ConnectionConfig.getCharsetNumber(options.charset);
        } else {
            this.charsetNumber = options.charsetNumber || c.charset.UTF8MB4_UNICODE_CI;
        }

        this.compress = options.compress || false;

        this.authSwitchHandler = options.authSwitchHandler;

        this.clientFlags = ConnectionConfig.mergeFlags(
            ConnectionConfig.getDefaultFlags(options),
            options.flags || ""
        );

        this.connectAttributes = options.connectAttributes;
        this.maxPreparedStatements = options.maxPreparedStatements || 16000;
    }

    static mergeFlags(defaultFlags, userFlags) {
        let flags = 0x00;

        userFlags = (userFlags || "").toUpperCase().split(/\s*,+\s*/);

        // add default flags unless "blacklisted"
        for (const i of defaultFlags) {
            if (userFlags.includes(`-${i}`)) {
                continue;
            }

            flags |= c.client[i] || 0x00;
        }
        // add user flags unless already already added
        for (const i of userFlags) {
            if (i[0] === "-") {
                continue;
            }

            if (defaultFlags.includes(userFlags)) {
                continue;
            }

            flags |= c.client[i] || 0x0;
        }

        return flags;
    }

    static getDefaultFlags(options) {
        const defaultFlags = ["LONG_PASSWORD", "FOUND_ROWS", "LONG_FLAG",
            "CONNECT_WITH_DB", "ODBC", "LOCAL_FILES",
            "IGNORE_SPACE", "PROTOCOL_41", "IGNORE_SIGPIPE",
            "TRANSACTIONS", "RESERVED", "SECURE_CONNECTION",
            "MULTI_RESULTS", "TRANSACTIONS", "SESSION_TRACK"];

        if (options && options.multipleStatements) {
            defaultFlags.push("MULTI_STATEMENTS");
        }

        if (options && options.authSwitchHandler) {
            defaultFlags.push("PLUGIN_AUTH");
            defaultFlags.push("PLUGIN_AUTH_LENENC_CLIENT_DATA");
        }

        if (options && options.connectAttributes) {
            defaultFlags.push("CONNECT_ATTRS");
        }

        return defaultFlags;
    }

    static getCharsetNumber(charset) {
        const num = c.charset[charset.toUpperCase()];

        if (is.undefined(num)) {
            throw new error.UnknownException(`Unknown charset '${charset}'`);
        }

        return num;
    }

    static getSSLProfile(name) {
        const ssl = c.sslProfile[name];

        if (is.undefined(ssl)) {
            throw new error.UnknownException(`Unknown SSL profile '${name}'`);
        }

        return ssl;
    }

    static parseUrl(url) {
        url = urlParse(url, true);

        const options = {
            host: url.hostname,
            port: url.port,
            database: url.pathname.substr(1)
        };

        if (url.auth) {
            [options.user, options.password] = url.auth.split(":");
        }

        if (url.query) {
            for (const [key, value] of util.entries(url.query)) {
                try {
                    // Try to parse this as a JSON expression first
                    options[key] = JSON.parse(value);
                } catch (err) {
                    // Otherwise assume it is a plain string
                    options[key] = value;
                }
            }
        }

        return options;
    }
}
