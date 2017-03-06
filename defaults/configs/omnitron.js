// adone-dont-transpile

const { join } = require("path");

const adoneConfig = adone.appinstance.config.adone;
const home = adoneConfig.home;

const gates = [
    {
        type: "socket",
        enabled: true,
        option: {
            id: "local",
            port: (process.platform === "win32" ? "\\\\.\\pipe\\omnitron.sock" : join(home, "omnitron.sock")),
            access: {
                contexts: ["omnitron", "database", "shi", "taskmanager", "pm", "auth", "$auth"]
            }
        }
    },
    {
        type: "websocket",
        enabled: false,
        option: {
            id: "ws",
            port: 8080,
            access: {
                contexts: ["auth"],
                ip_policy: "allow",
                ip_list: ["127.0.0.1"]
            }
        }
    }
];

module.exports = {
    logFilePath: join(home, "omnitron.log"),
    errorLogFilePath: join(home, "omnitron-err.log"),
    pidFilePath: join(home, "omnitron.pid"),
    servicesConfigFilePath: join(adoneConfig.configsPath, "services.json"),
    servicesPath: join(home, "services"),
    gates,
    getGate(opts) {
        if (opts.id !== undefined) {
            for (const gate of this.gates) {
                if (opts.id === gate.option.id) {
                    return gate;
                }
            }
            return;
        }
        const gates = [];
        for (const gate of this.gates) {
            if ((opts.type === undefined || opts.type === gate.type) && (opts.enabled === undefined || opts.enabled === gate.enabled)) {
                if (!Array.isArray(opts.contexts) || gate.option.access === undefined || !Array.isArray(gate.option.access.contexts)) {
                    gates.push(gate);
                } else {
                    const contexts = gate.option.access.contexts;
                    for (const svcName of opts.contexts) {
                        if (contexts.includes(svcName)) {
                            gates.push(gate);
                        }
                    }
                }
            }
        }

        return gates;
    },
    getServicePath(serviceName, dirName) {
        let fullPath;
        if (typeof(dirType) === "string") {            
            fullPath = join(this.servicesPath, serviceName, dirName);
        } else {
            fullPath = join(this.servicesPath, serviceName);
        }

        return adone.fs.mkdir(fullPath).then(() => fullPath);
    }
};
