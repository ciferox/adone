const pino = require("pino");
const extend = require("extend");
const clone = require("clone");
const jsonschema = require("jsonschema");
import * as serializers from "./serializers";

export const defaultsLegacy = () => ({
    port: 1883,
    host: null,
    maxConnections: 10000000,
    backend: {
        json: false,
        wildcardOne: "+",
        wildcardSome: "#"
    },
    stats: false,
    publishNewClient: true,
    publishClientDisconnect: true,
    publishSubscriptions: true,
    maxInflightMessages: 1024,
    onQoS2publish: "noack",
    logger: {
        name: "mosca",
        level: "warn",
        serializers: {
            client: serializers.clientSerializer,
            packet: serializers.packetSerializer,
            req: pino.stdSerializers.req,
            res: pino.stdSerializers.res
        }
    }
});

export const defaultsModern = () => ({
    host: null,
    interfaces: [
        { type: "mqtt", port: 1883, maxConnections: 10000000 }
    ],
    backend: {
        json: false,
        wildcardOne: "+",
        wildcardSome: "#"
    },
    stats: false,
    publishNewClient: true,
    publishClientDisconnect: true,
    publishSubscriptions: true,
    maxInflightMessages: 1024,
    onQoS2publish: "noack",
    logger: {
        name: "mosca",
        level: "warn",
        serializers: {
            client: serializers.clientSerializer,
            packet: serializers.packetSerializer,
            req: pino.stdSerializers.req,
            res: pino.stdSerializers.res
        }
    }
});


export function modernize(legacy = {}) {
    const modernized = {};

    // "plain copyable" conserved options
    const conserved = [
        "id",
        "host",
        "maxInflightMessages",
        "stats",
        "publishNewClient",
        "publishClientDisconnect",
        "publishSubscriptions",
        "onQoS2publish"
    ];

    // copy all conserved options
    conserved.forEach((name) => {
        if (legacy.hasOwnProperty(name)) {
            modernized[name] = legacy[name];
        }
    });

    // TODO: copy `backend` carefully
    if (legacy.hasOwnProperty("backend")) {
        modernized.backend = legacy.backend;
    }

    // TODO: copy `ascoltatore` carefully
    if (legacy.hasOwnProperty("ascoltatore")) {
        modernized.ascoltatore = legacy.ascoltatore;
    }

    // TODO: copy `persistence` carefully
    if (legacy.hasOwnProperty("persistence")) {
        modernized.persistence = legacy.persistence;
    }

    // TODO: copy `logger` carefully
    if (legacy.hasOwnProperty("logger")) {
        modernized.logger = legacy.logger;
    }

    // construct `credentials`
    if (legacy.hasOwnProperty("credentials")) {
        // copy as is
        modernized.credentials = clone(legacy.credentials);
    } else if (legacy.hasOwnProperty("secure")) {
        // construct from `secure`
        modernized.credentials = {};
        if (legacy.secure.hasOwnProperty("keyPath")) {
            modernized.credentials.keyPath = legacy.secure.keyPath;
        }
        if (legacy.secure.hasOwnProperty("certPath")) {
            modernized.credentials.certPath = legacy.secure.certPath;
        }
    } // else no credentials were provided

    // construct `interfaces`
    if (legacy.hasOwnProperty("interfaces")) {
        // cloning
        modernized.interfaces = clone(legacy.interfaces);
    } else {
        // construct from legacy keys
        modernized.interfaces = [];

        // translate mqtt options
        const mqtt_enabled = !legacy.onlyHttp && (typeof legacy.secure === "undefined" || legacy.allowNonSecure);
        if (mqtt_enabled) {
            const mqtt_interface = { type: "mqtt" };

            if (legacy.hasOwnProperty("port")) {
                mqtt_interface.port = legacy.port;
            }

            if (legacy.hasOwnProperty("maxConnections")) {
                mqtt_interface.maxConnections = legacy.maxConnections;
            }

            modernized.interfaces.push(mqtt_interface);
        }

        // translate mqtts options
        const mqtts_enabled = !legacy.onlyHttp && legacy.secure;
        if (mqtts_enabled) {
            const mqtts_interface = { type: "mqtts" };

            if (legacy.secure.hasOwnProperty("port")) {
                mqtts_interface.port = legacy.secure.port;
            }

            modernized.interfaces.push(mqtts_interface);
        }

        // translate http options
        if (legacy.http) {
            const httpInterface = { type: "http" };

            if (legacy.http.hasOwnProperty("port")) {
                httpInterface.port = legacy.http.port;
            }

            if (legacy.http.hasOwnProperty("bundle")) {
                httpInterface.bundle = legacy.http.bundle;
            }

            if (legacy.http.hasOwnProperty("static")) {
                httpInterface.static = legacy.http.static;
            }

            modernized.interfaces.push(httpInterface);
        }

        // translate https options
        if (legacy.https) {
            const httpsInterface = { type: "https" };

            if (legacy.https.hasOwnProperty("port")) {
                httpsInterface.port = legacy.https.port;
            }

            if (legacy.https.hasOwnProperty("bundle")) {
                httpsInterface.bundle = legacy.https.bundle;
            }

            if (legacy.https.hasOwnProperty("static")) {
                httpsInterface.static = legacy.https.static;
            }

            modernized.interfaces.push(httpsInterface);
        }

        // NOTE: there are ways end up with no interfaces at all, for example
        // `httpOnly: true` with undefined http and https
    }

    return modernized;
}

export function validate(opts, validationOptions) {
    const validator = new jsonschema.Validator();

    // custom function type
    validator.types.function = function testFunction(instance) {
        return instance instanceof Function;
    };

    validator.addSchema({
        id: "/Credentials",
        type: "object",
        additionalProperties: true,
        properties: {
            keyPath: { type: "string", required: true },
            certPath: { type: "string", required: true },
            caPaths: { type: "array", required: false },
            requestCert: { type: "boolean", required: false },
            rejectUnauthorized: { type: "boolean", required: false }
        }
    });

    validator.addSchema({
        id: "/Interface",
        type: "object",
        properties: {
            type: { type: ["string", "function"], required: true },
            host: { type: ["string", "null"] },
            port: { type: ["integer"] },
            credentials: { $ref: "/Credentials" }
        }
    });

    validator.addSchema({
        id: "/Options",
        type: "object",
        additionalProperties: false,
        properties: {
            id: { type: "string" },
            host: { type: ["string", "null"] },
            interfaces: {
                type: "array",
                items: { $ref: "/Interface" }
            },
            credentials: { $ref: "/Credentials" },

            backend: { type: "object" },     // TODO
            ascoltatore: { type: "object" }, // TODO
            persistence: { type: "object" }, // TODO
            logger: { type: "object" },      // TODO

            maxInflightMessages: { type: "integer" },
            stats: { type: "boolean" },
            publishNewClient: { type: "boolean" },
            publishClientDisconnect: { type: "boolean" },
            publishSubscriptions: { type: "boolean" },
            onQoS2publish: { type: "string" }
        }
    });

    const result = validator.validate(opts, "/Options", validationOptions);

    // check required credentials
    if (opts.hasOwnProperty("interfaces")) {
        const hasCredentials = opts.hasOwnProperty("credentials");
        const reqCredentials = opts.interfaces.some((iface) => {
            const req = (iface.type === "mqtts" || iface.type === "https");
            const has = iface.hasOwnProperty("credentials");
            return req && !has;
        });

        if (reqCredentials && !hasCredentials) {
            result.addError("one of the defiend interfaces requires credentials");
        }
    }

    // TODO: check conflicting backend and ascoltatore

    return result;
}

export function populate(opts) {
    const defaults = defaultsModern();

    // do not extend `interfaces`
    if (opts.hasOwnProperty("interfaces")) {
        delete defaults.interfaces;
    }
    const populated = extend(true, defaults, opts);

    populated.interfaces.forEach((iface) => {
        if (typeof iface.port === "undefined") {
            switch (iface.type) {
                case "mqtt": iface.port = 1883; break;
                case "mqtts": iface.port = 8883; break;
                case "http": iface.port = 3000; break;
                case "https": iface.port = 3001; break;
            }
        }
    });

    return populated;
}
