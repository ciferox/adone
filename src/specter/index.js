const { is } = adone;

import Host from "./host";

const PROTOCOLS = ["ssh:", "netron:"];

class Specter {
    constructor() {
        this._ = {
            hosts: []
        };
    }

    async addHost(hostInfo) {
        let host;

        if (is.string(hostInfo)) {
            if (["local", "localhost", "127.0.0.1"].includes(hostInfo)) {
                host = new Host();
            } else {
                const url = new adone.std.url.URL(hostInfo);
                if (!PROTOCOLS.includes(url.protocol)) {
                    throw new adone.error.NotSupported(`Not supported protocol: ${url.protocol}`);
                }
                const hostname = await adone.net.ip.lookup(url.hostname);

                let port;
                if (url.port === "") {
                    switch (url.protocol) {
                        case "ssh:": port = 22; break;
                        case "netron:": port = adone.netron.DEFAULT_PORT; break;
                    }
                }

                const access = {
                    protocol: url.protocol,
                    hostname,
                    port
                };

                if (url.username !== "") {
                    access.username = url.username;
                }
                if (url.password !== "") {
                    access.password = url.password;
                }

                const privateKeyPath = adone.std.path.join(adone.fs.homeDir(), ".ssh", "id_rsa");
                if (await adone.fs.exists(privateKeyPath)) {
                    access.privateKey = await adone.fs.readFile(privateKeyPath);
                }
                host = new Host(access);
            }
        } else if (is.plainObject(hostInfo)) {
            host = new Host(hostInfo);
        } else {
            throw new adone.error.NotValid(`Invalid type of host: ${adone.meta.typeOf(host)}`);
        }

        this._.hosts.push(host);
    }

    async addMethodsPath(basePath) {
        const fileNames = adone.std.fs.readdirSync(basePath).filter((path) => path.endsWith(".js"));
        const methods = fileNames.map((path) => adone.std.path.basename(path, ".js"));

        for (let i = 0; i < fileNames.length; i++) {
            const method = methods[i];
            const filePath = adone.std.path.join(basePath, fileNames[i]);
            const content = await adone.fs.readFile(filePath, { encoding: "utf8" });
            const code = adone.js.compiler.core.transform(content, adone.require.options).code;
            // Single context for all methods
            const sandbox = Object.assign({
                specter: this,
                exports: {}
            }, global);

            const context = adone.std.vm.createContext(sandbox);
            adone.std.vm.runInContext(code, context, {
                displayErrors: true,
                breakOnSigint: false,
                filename: filePath
            });

            
            const fn = sandbox.exports.default;

            this[`${method}Raw`] = fn;
            this[method] = async function (...args) {
                const results = [];
                for (const host of this._.hosts) {
                    const result = await fn(host, ...args);
                    results.push({
                        host,
                        result
                    });
                }

                return results;
            };
        }
    }
}

// TODO:
// readFile
// writeFile
// exec
// spawn
// put
// get
// install
// uninstall
// sysuptate

export default async function () {
    const specter = new Specter();
    await specter.addMethodsPath(adone.std.path.join(__dirname, "methods"));
    return specter;
}
