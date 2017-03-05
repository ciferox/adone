import adone from "adone";
const { is } = adone;

export default class OmnitronHelpers {
    // Should be same as Omnitron._loadServiceConfigs()
    static get services() {
        let configs;
        try {
            configs = require(adone.std.path.join(this.config.adone.configsPath, "services.js"));
        } catch (err) {
            configs = [];
        } finally {
            // Add omnitron service
            configs.push({
                id: "omnitron",
                enabled: true,
                loggerMarker: "OMNITRON"
            }); 
        }
        return configs;
    }

    static async loadOmnitronConfig() {
        const app = adone.appinstance;
        if (is.undefined(app.config.omnitron)) {
            await app.loadAdoneConfig("omnitron");
        }
        return app.config.omnitron;
    }

    static async connectLocal(options, forceStart = true, _secondTime = false) {
        const omnitronConfig = await OmnitronHelpers.loadOmnitronConfig();
        const localGate = omnitronConfig.getGate({ id: "local" });
        if (is.nil(localGate)) {
            throw new adone.x.NotExists("Configuration for gate 'local' is not found");
        }
        if (!localGate.enabled) {
            throw new adone.x.IllegalState("Gate 'local' is disabled");
        }
        let netron = null;
        let peer = null;
        try {
            if (is.netron(options)) {
                netron = options;
            } else {
                netron = new adone.netron.Netron(null, options);    
            }
            peer = await netron.connect(localGate.option);
        } catch (err) {
            if (_secondTime) {
                return null;
            }
            if (!forceStart) {
                throw err;
            }

            const pid = await OmnitronHelpers.runOmnitron();
            if (is.number(pid)) {
                adone.log(`Omnitron successfully started (pid: ${pid})`);
                return OmnitronHelpers.connectLocal(options, forceStart, true);
            }
        }
        return { netron, peer };
    }

    static runOmnitron(spiritualWay = true) {
        const omnitronPath = adone.std.path.resolve(adone.appinstance.adoneRootPath, "lib/omnitron/index.js");
        if (spiritualWay) {
            return new Promise((resolve, reject) => {
                OmnitronHelpers.loadOmnitronConfig().then((omnitronConfig) => {
                    const out = adone.std.fs.openSync(omnitronConfig.logFilePath, "a");
                    const err = adone.std.fs.openSync(omnitronConfig.errorLogFilePath, "a");
                    const child = adone.std.child_process.spawn(process.execPath || "node", [omnitronPath], {
                        detached: true,
                        cwd: process.cwd(),
                        env: Object.assign({ HOME: process.env.ADONE_HOME || process.env.HOME || process.env.HOMEPATH }, process.env),
                        stdio: ["ipc", out, err]
                    });
                    child.unref();
                    child.once("error", reject);
                    child.once("message", (msg) => {
                        child.removeListener("error", reject);
                        child.disconnect();
                        resolve(msg.pid);
                    });
                });
            });
        } else {
            const Omnitron = require(omnitronPath).Omnitron;
            const omnitron = new Omnitron();
            return omnitron.run(true);
        }
    }

    static async isOmnitronAvailable(options, checkAttempts = 1) {
        const n = new adone.netron.Netron(null, { checkAttempts });
        let isOK = false;
        try {
            if (is.nil(options) || !options.port) {
                const omnitronConfig = await OmnitronHelpers.loadOmnitronConfig();
                const localGate = omnitronConfig.getGate({ id: "local" });
                if (is.nil(localGate)) {
                    throw new adone.x.NotExists("Configuration for gate 'local' is not found");
                }
                if (!localGate.enabled) {
                    throw new adone.x.IllegalState("Gate 'local' is disabled");
                }
                await n.connect(localGate.option);
                await n.disconnect();
                isOK = true;
            }
        } catch (err) { }
        
        return isOK;    
    }
}
