import adone from "adone";

let home = "";

if (process.env.OMNITRON_TEST_HOME) {
    home = process.env.OMNITRON_TEST_HOME;
} else if (process.env.HOME && !process.env.HOMEPATH) {
    home = adone.std.path.resolve(process.env.HOME, ".adone_test");
} else if (process.env.HOME || process.env.HOMEPATH) {
    home = adone.std.path.resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, ".adone_test");
} else {
    home = adone.std.path.resolve("/etc", ".adone_test");
}

function isAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        return false;
    }
}

async function killProcess(pid) {
    if (isAlive(pid)) {
        process.kill(pid, "SIGKILL");
        do {
            await adone.promise.delay(50);
        } while (isAlive(pid));
    }
}

async function killProcessChildren(pid) {
    const children = (await adone.metrics.system.getProcesses()).filter((x) => x.getParentPID() === pid);
    await Promise.all(children.map(async (child) => {
        await killProcessChildren(child.getPID());
        await killProcess(child.getPID());
    }));
}

export default class OmnitronRunner extends adone.Application {
    constructor() {
        const defaultConfigsPath = adone.std.path.resolve(__dirname, "./configs");
        super({ defaultConfigsPath });

        this.netron = null;
        this.omnitronPeer = null;
        this.helper = adone.omnitron.helper;
        this.descriptors = {
            stodut: null,
            stderr: null
        };
    }

    run() {
        return adone.fs.rm(home).then(() => {
            return super.run({ ignoreArgs: true });
        });
    }

    startOmnitron() {
        return new Promise((resolve, reject) => {
            this.descriptors.stdout = adone.std.fs.openSync(this.config.adone.omnitron.logFilePath, "a");
            this.descriptors.stderr = adone.std.fs.openSync(this.config.adone.omnitron.errorLogFilePath, "a");
            const child = adone.std.child_process.spawn(process.execPath || "node", [adone.std.path.resolve(__dirname, "../../lib/omnitron/index.js")], {
                detached: true,
                cwd: process.cwd(),
                env: Object.assign({ "ADONE_DEFAULT_CONFIG_PATH": this.defaultConfigsPath, "HOME": process.env.ADONE_HOME || process.env.HOME || process.env.HOMEPATH }, process.env),
                stdio: ["ipc", this.descriptors.stdout, this.descriptors.stderr]
            });
            child.unref();
            child.once("error", reject);
            child.once("message", (msg) => {
                child.removeListener("error", reject);
                child.disconnect();
                // adone.log(`omnitron successfully started (pid: ${msg.pid})`);
                resolve(msg.pid);
            });
        });
    }

    async stopOmnitron({ clean = true, killChildren = true } = {}) {
        const isOnline = await this.helper.isOmnitronAvailable();
        if (isOnline) {
            this.netron && await this.netron.disconnect();
            try {
                const pid = parseInt(adone.std.fs.readFileSync(this.config.adone.omnitron.pidFilePath).toString());
                if (killChildren) {
                    await killProcessChildren(pid);
                }
                await killProcess(pid);
            } catch (err) {
                adone.log("omnitron is offline");
            }
        } else {
            adone.log("omnitron is offline");
        }
        if (this.descriptors.stdout !== null) {
            await adone.std.fs.closeAsync(this.descriptors.stdout);
            this.descriptors.stdout = null;
        }
        if (this.descriptors.stderr !== null) {
            await adone.std.fs.closeAsync(this.descriptors.stderr);
            this.descriptors.stderr = null;
        }
        if (clean) {
            await new FS.Directory(this.config.adone.home).clean();
        }
    }

    async restartOmnitron({ options, forceStart = false, killChildren = false } = {}) {
        await this.stopOmnitron({ clean: false, killChildren });
        await this.startOmnitron();
        await this.connectOmnitron({ options, forceStart });
    }

    async connectOmnitron({ options, forceStart = false } = {}) {
        const { netron, peer } = await this.helper.connectLocal(options, forceStart);
        this.netron = netron;
        this.omnitronPeer = peer;
    }

    getInterface(name) {
        return this.omnitronPeer.getInterfaceByName(name);
    }
}
