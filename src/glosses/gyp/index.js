const log = require("npmlog");
const osenv = require("osenv");

const {
    is,
    std: { fs, path, child_process }
} = adone;

adone.lazify({
    command: () => adone.lazify({
        build: "./commands/build",
        clean: "./commands/clean",
        configure: "./commands/configure",
        rebuild: "./commands/rebuild",
        install: "./commands/install",
        list: "./commands/list",
        remove: "./commands/remove"
    }, null, require)
}, adone.asNamespace(exports), require);

adone.lazifyPrivate({
    processRelease: "./process-release"
}, exports, require);

// differentiate node-gyp's logs from npm's
log.heading = "gyp";

export class Gyp extends adone.event.EventEmitter {
    constructor() {
        super();

        this.installVersion = 9;
        this.devDir = "";
    }

    /**
     * Parses the given argv array and sets the 'opts',
     * 'argv' and 'command' properties.
     */
    run(commands, opts = {}) {
        this.todo = adone.util.arrify(commands);

        for (let i = 0; i < this.todo.length; i++) {
            let cmd = this.todo[i];
            if (is.string(cmd)) {
                cmd = {
                    name: cmd,
                    args: []
                };
            } else if (!is.array(cmd.args)) {
                cmd.args = [];
            } else {
                continue;
            }

            this.todo[i] = cmd;
        }

        this.opts = opts;
        this.devDir = this.opts.devdir;

        const homeDir = osenv.home();
        if (this.devDir) {
            this.devDir = this.devDir.replace(/^~/, homeDir);
        } else if (homeDir) {
            this.devDir = path.resolve(homeDir, ".node-gyp");
        } else {
            throw new Error(
                "node-gyp requires that the user's home directory is specified " +
                "in either of the environmental variables HOME or USERPROFILE. " +
                "Overide with: --devdir /path/to/.node-gyp");
        }

        const dir = this.opts.directory;
        if (dir) {
            try {
                const stat = fs.statSync(dir);
                if (stat.isDirectory()) {
                    log.info("chdir", dir);
                    process.chdir(dir);
                } else {
                    log.warn("chdir", `${dir} is not a directory`);
                }
            } catch (e) {
                if (e.code === "ENOENT") {
                    log.warn("chdir", `${dir} is not a directory`);
                } else {
                    log.warn("chdir", 'error during chdir() "%s"', e.message);
                }
            }
        }

        if (this.opts.loglevel) {
            log.level = this.opts.loglevel;
        }
        log.resume();

        let completed = false;

        const errorMessage = function () {
            // copied from npm's lib/util/error-handler.js
            const os = require("os");
            log.error("System", `${os.type()} ${os.release()}`);
            log.error("command", process.argv
                .map(JSON.stringify).join(" "));
            log.error("cwd", process.cwd());
            log.error("node -v", process.version);
            log.error("node-gyp -v", `v${adone.package.version}`);
        };

        const run = async () => {
            const command = this.todo.shift();
            if (!command) {
                // done!
                completed = true;
                log.info("ok");
                return;
            }

            try {
                await adone.gyp.command[command.name](this, command.args);
                // if (command.name === "list") {
                //     const versions = arguments[1];
                //     if (versions.length > 0) {
                //         versions.forEach((version) => {
                //             console.log(version);
                //         });
                //     } else {
                //         console.log("No node development files installed. Use `node-gyp install` to install a version.");
                //     }
                // } else if (arguments.length >= 2) {
                //     console.log.apply(console, [].slice.call(arguments, 1));
                // }

                // now run the next command in the queue
                return run();
            } catch (err) {
                log.error(`${command.name} error`);
                log.error("stack", err.stack);
                errorMessage();
                log.error("not ok");
                throw err;
            }
        };

        const issueMessage = function () {
            errorMessage();
            log.error("", ["This is a bug in `node-gyp`.",
                "Try to update node-gyp and file an Issue if it does not help:",
                "    <https://github.com/nodejs/node-gyp/issues>"
            ].join("\n"));
        };

        process.on("exit", (code) => {
            if (!completed && !code) {
                log.error("Completion callback never invoked!");
                issueMessage();
                adone.runtime.app.exit(6);
            }
        });

        process.on("uncaughtException", (err) => {
            log.error("UNCAUGHT EXCEPTION");
            log.error("stack", err.stack);
            issueMessage();
            adone.runtime.app.exit(7);
        });

        // start running the given commands!
        return run();
    }

    /**
     * Spawns a child process and emits a 'spawn' event.
     */
    spawn(command, args, opts) {
        if (!opts) {
            opts = {};
        }
        if (!opts.silent && !opts.stdio) {
            opts.stdio = [0, 1, 2];
        }
        const cp = child_process.spawn(command, args, opts);
        log.info("spawn", command);
        log.info("spawn args", args);
        return cp;
    }
}

Gyp.prototype.configDefs = {
    help: Boolean, // everywhere
    arch: String, // 'configure'
    cafile: String, // 'install'
    debug: Boolean, // 'build'
    directory: String, // bin
    make: String, // 'build'
    msvs_version: String, // 'configure'
    ensure: Boolean, // 'install'
    solution: String, // 'build' (windows only)
    proxy: String, // 'install'
    devdir: String, // everywhere
    nodedir: String, // 'configure'
    loglevel: String, // everywhere
    python: String, // 'configure'
    "dist-url": String, // 'install'
    "tarball": String, // 'install'
    jobs: String, // 'build'
    thin: String // 'configure'
};
