import { join, resolve } from "path";

let home = "";

if (process.env.OMNITRON_TEST_HOME)
    home = process.env.OMNITRON_TEST_HOME;
else if (process.env.HOME && !process.env.HOMEPATH)
    home = resolve(process.env.HOME, ".adone_test");
else if (process.env.HOME || process.env.HOMEPATH)
    home = resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, ".adone_test");
else {
    home = resolve("/etc", ".adone_test");
}

// ---==== Omnitron Service ====--- //

const omnitron = {
    id: "omnitron",
    enabled: true, // for compatibility only (this value is not affected real state of omnitron-service, because it should be alive anyway).
    loggerMarker: "OMNITRON",
    options: {
    }
};

// ---==== Database Service ====--- //

const database = {
    id: "database",
    enabled: true,
    loggerMarker: "DB",
    options: {
        base: join(home, "database")
    }
};

// ---==== System & Hardware Information Service ====--- //

const shi = {
    id: "shi",
    enabled: true,
    loggerMarker: "SHI",
};

// ---==== Task manager Service ====--- //

const taskmanager = {
    id: "taskmanager",
    enabled: true,
    loggerMarker: "TM",
    options: {
        datastore: {
            filename: "taskmanager"
        },
        transpiler: {
            plugins: [
                "transform.flowStripTypes",
                "transform.classProperties",
                "transform.asyncToGenerator",
                "transform.ESModules",
                "transform.functionBind"
            ],
            compact: false
        }
    }
};

// ---==== Process manager Service ====--- //
const pm = {
    id: "pm",
    enabled: true,
    loggerMarker: "PM",
    options: {
        basePath: join(home, "apps"),
        datastore: {
            applications: {
                filename: "pm-applications"
            },
            runtime: {
                filename: "pm-runtime"
            }
        },
        defaultProcessConfig: {
            args: [],
            env: {},
            mode: "single",
            startup: false,
            autorestart: false,
            maxRestarts: 3,
            restartDelay: 0,
            killTimeout: 1600,
            normalStart: 1000
        }
    }
};

// ---==== Authentication Service ====--- //

const schemas = {
    group: {
        name: {
            type: "string",
            unique: true,
            required: true
        },
        description: {
            type: "string",
            default: ""
        },
        contexts: {
            type: "array",
            required: true
        }
    },
    user: {
        name: {
            type: "string",
            required: true,
            register: true
        },
        group: {
            type: "string",
            required: true
        },
        description: {
            type: "string",
            default: ""
        },
        status: {
            type: "enum",
            default: "Disabled",
            values: ["Disabled", "Enabled", "Unconfirmed"]
        },
        email: {
            type: "email",
            unique: true,
            required: true,
            login: true,
            register: true,
        },
        password: {
            type: "password",
            required: true,
            login: true,
            register: true,
            options: {
                type: "hash", // plain, hash
                min_length: 5,
                max_length: Infinity,
                required: {
                    lc_letters: Infinity,
                    uc_letters: Infinity,
                    numbers: 0,
                    specials: 0,
                }
            }
        }
    }
};

const authOptions = {
    schemas,
    userGroup: {
        name: "User",
        description: "Default group for users",
        contexts: ["auth"]
    },
    adminGroup: {
        name: "Admin",
        description: "Default group for admins",
        contexts: []
    },
    datastore: {
        filename: "auth"
    }
};

const auth = {
    id: "auth",
    enabled: true,
    loggerMarker: "AUTH",
    options: authOptions
};

const $auth = {
    id: "$auth",
    enabled: true,
    loggerMarker: "$AUTH",
    options: authOptions
};

const services = {
    omnitron,
    database,
    shi,
    taskmanager,
    pm,
    auth,
    $auth
};

const gates = [
    {
        type: "socket",
        enabled: true,
        options: {
            id: "local",
            port: (process.platform === "win32" ? "\\\\.\\pipe\\omnitron_test.sock" : join(home, "omnitron_test.sock")),
            access: {
                contexts: ["omnitron", "database", "shi", "taskmanager", "pm", "auth", "$auth"]
            }
        }
    },
    {
        type: "websocket",
        enabled: false,
        options: {
            id: "ws",
            port: 8080,
            access: {
                contexts: ["auth"],
                ip_policy: "allow",
                ip_list: ["127.0.0.1"]
            },
        }
    }
];

const templates_dir = "templates";

export default {
    home,
    configsPath: join(home, "configs"),
    templates_dir,
    templates_path: join(home, templates_dir),
    
    omnitron: {
        logFilePath: join(home, "omnitron.log"),
        errorLogFilePath: join(home, "omnitron-err.log"),
        pidFilePath: join(home, "omnitron.pid"),
        services,
        gates,
        getGate(opts) {
            if (opts.id !== undefined) {
                for (const gate of this.omnitron.gates) {
                    if (opts.id === gate.options.id) {
                        return gate;
                    }
                }
                return;
            }
            const gates = [];
            for (const gate of this.omnitron.gates) {
                if ((opts.type === undefined || opts.type === gate.type) && (opts.enabled === undefined || opts.enabled === gate.enabled)) {
                    if (!Array.isArray(opts.contexts) || gate.options.access === undefined || !Array.isArray(gate.options.access.contexts)) {
                        gates.push(gate);
                    } else {
                        const contexts = gate.options.access.contexts;
                        for (const svcName of opts.contexts) {
                            if (contexts.includes(svcName)) {
                                gates.push(gate);
                            }
                        }
                    }
                }
            }

            return gates;
        }
    }
};
