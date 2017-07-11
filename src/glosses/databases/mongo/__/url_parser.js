const { is, database: { mongo: { ReadPreference } }, std: { url: parser } } = adone;

export default function parseUrl(url, options) {
    let connectionPart = "";
    let authPart = "";
    let queryStringPart = "";
    let dbName = "admin";

    const result = parser.parse(url, true);

    if (result.protocol !== "mongodb:") {
        throw new Error("invalid schema, expected mongodb");
    }

    if ((is.nil(result.hostname) || result.hostname === "") && !url.includes(".sock")) {
        throw new Error("no hostname or hostnames provided in connection string");
    }

    if (result.port === "0") {
        throw new Error("invalid port (zero) with hostname");
    }

    if (!is.nan(parseInt(result.port, 10)) && parseInt(result.port, 10) > 65535) {
        throw new Error("invalid port (larger than 65535) with hostname");
    }

    if (result.path && result.path.length > 0 && result.path[0] !== "/" && !url.includes(".sock")) {
        throw new Error("missing delimiting slash between hosts and options");
    }

    if (result.query) {
        for (const name in result.query) {
            if (name.includes("::")) {
                throw new Error("double colon in host identifier");
            }

            if (result.query[name] === "") {
                throw new Error(`query parameter ${name} is an incomplete value pair`);
            }
        }
    }

    if (result.auth) {
        const parts = result.auth.split(":");
        if (url.includes(result.auth) && parts.length > 2) {
            throw new Error("Username with password containing an unescaped colon");
        }

        if (url.includes(result.auth) && result.auth.includes("@")) {
            throw new Error("Username containing an unescaped at-sign");
        }
    }

    const clean = url.split("?").shift();

    // Extract the list of hosts
    const strings = clean.split(",");
    const hosts = [];

    for (let i = 0; i < strings.length; i++) {
        const hostString = strings[i];

        if (hostString.includes("mongodb")) {
            if (hostString.includes("@")) {
                hosts.push(hostString.split("@").pop());
            } else {
                hosts.push(hostString.substr("mongodb://".length));
            }
        } else if (hostString.includes("/")) {
            hosts.push(hostString.split("/").shift());
        } else if (!hostString.includes("/")) {
            hosts.push(hostString.trim());
        }
    }

    for (let i = 0; i < hosts.length; i++) {
        const r = parser.parse(`mongodb://${hosts[i].trim()}`);
        if (r.path && r.path.includes(":")) {
            throw new Error("double colon in host identifier");
        }
    }

    // If we have a ? mark cut the query elements off
    if (url.includes("?")) {
        queryStringPart = url.substr(url.indexOf("?") + 1);
        connectionPart = url.substring("mongodb://".length, url.indexOf("?"));
    } else {
        connectionPart = url.substring("mongodb://".length);
    }

    // Check if we have auth params
    if (connectionPart.includes("@")) {
        authPart = connectionPart.split("@")[0];
        connectionPart = connectionPart.split("@")[1];
    }

    // Check if the connection string has a db
    if (connectionPart.includes(".sock")) {
        if (connectionPart.includes(".sock/")) {
            dbName = connectionPart.split(".sock/")[1];
            // Check if multiple database names provided, or just an illegal trailing backslash
            if (dbName.includes("/")) {
                if (dbName.split("/").length === 2 && dbName.split("/")[1].length === 0) {
                    throw new Error("Illegal trailing backslash after database name");
                }
                throw new Error("More than 1 database name in URL");
            }
            connectionPart = connectionPart.split("/", connectionPart.indexOf(".sock") + ".sock".length);
        }
    } else if (connectionPart.includes("/")) {
        // Check if multiple database names provided, or just an illegal trailing backslash
        if (connectionPart.split("/").length > 2) {
            if (connectionPart.split("/")[2].length === 0) {
                throw new Error("Illegal trailing backslash after database name");
            }
            throw new Error("More than 1 database name in URL");
        }
        dbName = connectionPart.split("/")[1];
        connectionPart = connectionPart.split("/")[0];
    }

    // Result object
    const object = {};

    // Pick apart the authentication part of the string
    authPart = authPart || "";
    const auth = authPart.split(":", 2);

    // Decode the URI components
    auth[0] = decodeURIComponent(auth[0]);
    if (auth[1]) {
        auth[1] = decodeURIComponent(auth[1]);
    }

    // Add auth to final object if we have 2 elements
    if (auth.length === 2) {
        object.auth = { user: auth[0], password: auth[1] };
    }

    // Variables used for temporary storage
    let hostPart;
    let servers;
    const serverOptions = { socketOptions: {} };
    const dbOptions = { read_preference_tags: [] };
    const replSetServersOptions = { socketOptions: {} };
    const mongosOptions = { socketOptions: {} };
    // Add server options to final object
    object.server_options = serverOptions;
    object.db_options = dbOptions;
    object.rs_options = replSetServersOptions;
    object.mongos_options = mongosOptions;

    // Let's check if we are using a domain socket
    if (url.match(/\.sock/)) {
        // Split out the socket part
        let domainSocket = url.substring(
            url.indexOf("mongodb://") + "mongodb://".length
            , url.lastIndexOf(".sock") + ".sock".length);
        // Clean out any auth stuff if any
        if (domainSocket.includes("@")) {
            domainSocket = domainSocket.split("@")[1];
        }
        servers = [{ domain_socket: domainSocket }];
    } else {
        // Split up the db
        hostPart = connectionPart;
        // Deduplicate servers
        const deduplicatedServers = {};

        // Parse all server results
        servers = hostPart.split(",").map((h) => {
            let _host;
            let _port;
            let ipv6match;
            //check if it matches [IPv6]:port, where the port number is optional
            if ((ipv6match = /\[([^\]]+)\](?::(.+))?/.exec(h))) {
                _host = ipv6match[1];
                _port = parseInt(ipv6match[2], 10) || 27017;
            } else {
                //otherwise assume it's IPv4, or plain hostname
                const hostPort = h.split(":", 2);
                _host = hostPort[0] || "localhost";
                _port = !is.nil(hostPort[1]) ? parseInt(hostPort[1], 10) : 27017;
                // Check for localhost?safe=true style case
                if (_host.includes("?")) {
                    _host = _host.split(/\?/)[0];
                }
            }

            // No entry returned for duplicate servr
            if (deduplicatedServers[`${_host}_${_port}`]) {
                return null;
            }
            deduplicatedServers[`${_host}_${_port}`] = 1;

            // Return the mapped object
            return { host: _host, port: _port };
        }).filter((x) => {
            return !is.nil(x);
        });
    }

    // Get the db name
    object.dbName = dbName || "admin";
    // Split up all the options
    const urlOptions = (queryStringPart || "").split(/[&;]/);
    // Ugh, we have to figure out which options go to which constructor manually.
    urlOptions.forEach((opt) => {
        if (!opt) {
            return;
        }
        const splitOpt = opt.split("=");
        const name = splitOpt[0];
        let value = splitOpt[1];
        // Options implementations
        switch (name) {
            case "slaveOk":
            case "slave_ok": {
                serverOptions.slave_ok = value === "true";
                dbOptions.slaveOk = value === "true";
                break;
            }
            case "maxPoolSize":
            case "poolSize": {
                serverOptions.poolSize = parseInt(value, 10);
                replSetServersOptions.poolSize = parseInt(value, 10);
                break;
            }
            case "appname": {
                object.appname = decodeURIComponent(value.replace(/\+/g, "%20"));
                break;
            }
            case "autoReconnect":
            case "auto_reconnect": {
                serverOptions.auto_reconnect = value === "true";
                break;
            }
            case "minPoolSize": {
                throw new Error("minPoolSize not supported");
            }
            case "maxIdleTimeMS": {
                throw new Error("maxIdleTimeMS not supported");
            }
            case "waitQueueMultiple": {
                throw new Error("waitQueueMultiple not supported");
            }
            case "waitQueueTimeoutMS": {
                throw new Error("waitQueueTimeoutMS not supported");
            }
            case "uuidRepresentation": {
                throw new Error("uuidRepresentation not supported");
            }
            case "ssl": {
                if (value === "prefer") {
                    serverOptions.ssl = value;
                    replSetServersOptions.ssl = value;
                    mongosOptions.ssl = value;
                    break;
                }
                serverOptions.ssl = value === "true";
                replSetServersOptions.ssl = value === "true";
                mongosOptions.ssl = value === "true";
                break;
            }
            case "sslValidate": {
                serverOptions.sslValidate = value === "true";
                replSetServersOptions.sslValidate = value === "true";
                mongosOptions.sslValidate = value === "true";
                break;
            }
            case "replicaSet":
            case "rs_name": {
                replSetServersOptions.rs_name = value;
                break;
            }
            case "reconnectWait": {
                replSetServersOptions.reconnectWait = parseInt(value, 10);
                break;
            }
            case "retries": {
                replSetServersOptions.retries = parseInt(value, 10);
                break;
            }
            case "readSecondary":
            case "read_secondary": {
                replSetServersOptions.read_secondary = value === "true";
                break;
            }
            case "fsync": {
                dbOptions.fsync = value === "true";
                break;
            }
            case "journal": {
                dbOptions.j = value === "true";
                break;
            }
            case "safe": {
                dbOptions.safe = value === "true";
                break;
            }
            case "nativeParser":
            case "native_parser": {
                dbOptions.native_parser = value === "true";
                break;
            }
            case "readConcernLevel": {
                dbOptions.readConcern = { level: value };
                break;
            }
            case "connectTimeoutMS": {
                serverOptions.socketOptions.connectTimeoutMS = parseInt(value, 10);
                replSetServersOptions.socketOptions.connectTimeoutMS = parseInt(value, 10);
                mongosOptions.socketOptions.connectTimeoutMS = parseInt(value, 10);
                break;
            }
            case "socketTimeoutMS": {
                serverOptions.socketOptions.socketTimeoutMS = parseInt(value, 10);
                replSetServersOptions.socketOptions.socketTimeoutMS = parseInt(value, 10);
                mongosOptions.socketOptions.socketTimeoutMS = parseInt(value, 10);
                break;
            }
            case "w": {
                dbOptions.w = parseInt(value, 10);
                if (is.nil(dbOptions.w) || is.nan(dbOptions.w)) {
                    dbOptions.w = value;
                }
                break;
            }
            case "authSource": {
                dbOptions.authSource = value;
                break;
            }
            case "gssapiServiceName": {
                dbOptions.gssapiServiceName = value;
                break;
            }
            case "authMechanism": {
                if (value === "GSSAPI") {
                    // If no password provided decode only the principal
                    if (is.nil(object.auth)) {
                        const urlDecodeAuthPart = decodeURIComponent(authPart);
                        if (!urlDecodeAuthPart.includes("@")) {
                            throw new Error("GSSAPI requires a provided principal");
                        }
                        object.auth = { user: urlDecodeAuthPart, password: null };
                    } else {
                        object.auth.user = decodeURIComponent(object.auth.user);
                    }
                } else if (value === "MONGODB-X509") {
                    object.auth = { user: decodeURIComponent(authPart) };
                }

                // Only support GSSAPI or MONGODB-CR for now
                if (
                    value !== "GSSAPI" &&
                    value !== "MONGODB-X509" &&
                    value !== "MONGODB-CR" &&
                    value !== "DEFAULT" &&
                    value !== "SCRAM-SHA-1" &&
                    value !== "PLAIN"
                ) {
                    throw new Error("only DEFAULT, GSSAPI, PLAIN, MONGODB-X509, SCRAM-SHA-1 or MONGODB-CR is supported by authMechanism");
                }

                // Authentication mechanism
                dbOptions.authMechanism = value;
                break;
            }
            case "authMechanismProperties": {
                // Split up into key, value pairs
                const values = value.split(",");
                const o = {};
                // For each value split into key, value
                values.forEach((x) => {
                    const v = x.split(":");
                    o[v[0]] = v[1];
                });

                // Set all authMechanismProperties
                dbOptions.authMechanismProperties = o;
                // Set the service name value
                if (is.string(o.SERVICE_NAME)) {
                    dbOptions.gssapiServiceName = o.SERVICE_NAME;
                }
                if (is.string(o.SERVICE_REALM)) {
                    dbOptions.gssapiServiceRealm = o.SERVICE_REALM;
                }
                if (is.string(o.CANONICALIZE_HOST_NAME)) {
                    dbOptions.gssapiCanonicalizeHostName = o.CANONICALIZE_HOST_NAME == "true" ? true : false;
                }
                break;
            }
            case "wtimeoutMS": {
                dbOptions.wtimeout = parseInt(value, 10);
                break;
            }
            case "readPreference": {
                if (!ReadPreference.isValid(value)) {
                    throw new Error("readPreference must be either primary/primaryPreferred/secondary/secondaryPreferred/nearest");
                }
                dbOptions.readPreference = value;
                break;
            }
            case "maxStalenessSeconds": {
                dbOptions.maxStalenessSeconds = parseInt(value, 10);
                break;
            }
            case "readPreferenceTags": {
                // Decode the value
                value = decodeURIComponent(value);
                // Contains the tag object
                const tagObject = {};
                if (is.nil(value) || value === "") {
                    dbOptions.read_preference_tags.push(tagObject);
                    break;
                }

                // Split up the tags
                const tags = value.split(/,/);
                for (let i = 0; i < tags.length; i++) {
                    const parts = tags[i].trim().split(/:/);
                    tagObject[parts[0]] = parts[1];
                }

                // Set the preferences tags
                dbOptions.read_preference_tags.push(tagObject);
                break;
            }
            default: {
                break;
            }
        }
    });

    // No tags: should be null (not [])
    if (dbOptions.read_preference_tags.length === 0) {
        dbOptions.read_preference_tags = null;
    }

    // Validate if there are an invalid write concern combinations
    if (
        (dbOptions.w === -1 || dbOptions.w === 0) &&
        (dbOptions.journal === true || dbOptions.fsync === true || dbOptions.safe === true)
    ) {
        throw new Error("w set to -1 or 0 cannot be combined with safe/w/journal/fsync");
    }

    // If no read preference set it to primary
    if (!dbOptions.readPreference) {
        dbOptions.readPreference = "primary";
    }

    // make sure that user-provided options are applied with priority
    Object.assign(dbOptions, options);

    // Add servers to result
    object.servers = servers;
    // Returned parsed object
    return object;
}
