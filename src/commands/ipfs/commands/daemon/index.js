import { commonOptions } from "../common";
const { isTest } = require("ipfs-utils/src/env");

const {
    app: { Subsystem, mainCommand },
    fs,
    ipfs: { cli: { Daemon, util: { getRepoPath, print } } },
    multiformat: { multiaddrToUri: toUri },
    std: { os }
} = adone;

export default class extends Subsystem {
    @mainCommand({
        options: [
            ...commonOptions,
            {
                name: "--init-config",
                type: String,
                help: "Path to existing configuration file to be loaded during --init."
            },
            {
                name: "--init-profile",
                help: "Configuration profiles to apply for --init. See 'adone ipfs init --help' for more.",
                coerce: (value) => {
                    return (value || "").split(",");
                }
            },
            {
                name: "--offline",
                help: "Run offline. Do not connect to the rest of the network but provide local API."
            },
            {
                name: "--enable-preload",
                default: !isTest,
                help: ""
            },
            {
                name: "--enable-sharding-experiment",
                help: ""
            },
            {
                name: "--enable-namesys-pubsub",
                help: ""
            },
            {
                name: "--enable-dht-experiment",
                help: ""
            }
        ]
    })
    async daemon(args, opts) {
        try {
            print("Initializing IPFS daemon...");
            print(`js-ipfs version: ${adone.ipfs.VERSION}`);
            print(`System version: ${os.arch()}/${os.platform()}`);
            print(`Node.js version: ${process.versions.node}`);

            const repoPath = getRepoPath();

            let config = {};
            // read and parse config file
            if (opts.initConfig) {
                try {
                    const raw = fs.readFileSync(opts.initConfig);
                    config = JSON.parse(raw);
                } catch (error) {
                    throw new Error("Default config couldn't be found or content isn't valid JSON.");
                }
            }

            // Required inline to reduce startup time
            const daemon = new Daemon({
                config,
                silent: opts.silent,
                repo: process.env.IPFS_PATH,
                repoAutoMigrate: opts.migrate,
                offline: opts.offline,
                pass: opts.pass,
                preload: { enabled: opts.enablePreload },
                EXPERIMENTAL: {
                    ipnsPubsub: opts.enableNamesysPubsub,
                    dht: opts.enableDhtExperiment,
                    sharding: opts.enableShardingExperiment
                },
                init: opts.initProfile ? { profiles: opts.initProfile } : true
            });

            try {
                await daemon.start();
                daemon._httpApi._apiServers.forEach((apiServer) => {
                    print(`API listening on ${apiServer.info.ma}`);
                });
                daemon._httpApi._gatewayServers.forEach((gatewayServer) => {
                    print(`Gateway (read only) listening on ${gatewayServer.info.ma}`);
                });
                daemon._httpApi._apiServers.forEach((apiServer) => {
                    print(`Web UI available at ${toUri(apiServer.info.ma)}/webui`);
                });
            } catch (err) {
                if (err.code === "ERR_REPO_NOT_INITIALIZED" || err.message.match(/uninitialized/i)) {
                    err.message = `no initialized ipfs repo found in ${repoPath}\nplease run: jsipfs init`;
                }
                throw err;
            }

            print("Daemon is ready");

            const cleanup = async () => {
                print("Received interrupt signal, shutting down...");
                await daemon.stop();
                process.exit(0);
            };

            // listen for graceful termination
            process.on("SIGTERM", cleanup);
            process.on("SIGINT", cleanup);
            process.on("SIGHUP", cleanup);
        } catch (err) {
            console.error(adone.pretty.error(err));
            return 1;
        }
    }
}
