const {
    is,
    fs,
    nodejs,
    std: { path: { join } },
    util
} = adone;
const { NodejsManager, NodejsCompiler } = nodejs;

// The 0-section is common and has a size of 64 bytes.
// The content of the section starting at offset 16 should be interpreted
// according to the version of EOF-data format.
//
// 0-section structure:
//
// description                    offset    size    value (default)
// ------------------------------------------------------------------
// signature                           0      12    'nodeadonekri'
// version of EOF-data format         14       2    1
// number of sections                 12       2    
//
// All other sections are data-sections and have header and body.
//
// header structure:
//
// description                    offset    size    value (default)
// ------------------------------------------------------------------
// body size                           0       8
// flags                               0       8
// fs mount point                      8    var0
//
//

// Data-section flags
const SECTION_FLAG_EP = 1 >>> 0; // Entry-point section (only one section can be an entry point)


const DEFAULT_CONFIGURE_FLAGS = new Set([
    `--dest-cpu=${process.arch}`,
    "--fully-static",
    "--without-node-options",
    "--without-npm",
    "--without-inspector",
    "--experimental-http-parser",
    //"--release-urlbase="
    ...(is.linux ? ["--enable-lto"] : [])
]);

const NODE_BIN_PATH = join("out", "Release", "node");

const normalizeArgs = (args) => {
    if (is.set(args)) {
        return [...args.values()];
    } else if (is.string(args)) {
        return args.split(";");
    }

    return util.arrify(args);
}

const useFlags = (defaults, customs) => {
    const result = new Set(normalizeArgs(defaults));
    for (const f of normalizeArgs(customs)) {
        result.add(f);
    }
    return [...result.values()];
};

const STATUSFILE = ".adonepkg.json";
class PackagerStatusFile extends adone.configuration.Generic {
    async update(config) {
        try {
            await this.load(STATUSFILE);
        } catch (err) {
            await this.save(STATUSFILE);
        }

        if (is.plainObject(config)) {
            this.assign(config);
            await this.save(STATUSFILE, null, {
                space: "    "
            });
        }
    }
}

export default class NodejsPackager {
    constructor(options = {}) {
        this.version = options.version;
        this.log = options.log;
        this.manager = options.manager || new NodejsManager();
        this.options = options;
    }

    async prepareBuild() {
        this.log({
            message: "checking version"
        });

        const version = await nodejs.checkVersion(this.version);
        const type = "sources";

        let sourcesPath = await this.manager.getCachePathFor(this.manager.cache.sources, { version, type, ext: "" });
        if (this.options.fresh) {
            await fs.rm(sourcesPath);
        }
        if (!(await fs.exists(sourcesPath))) {
            sourcesPath = await this.manager.getCachePathFor(this.manager.cache.download, { version, type });
            if (this.options.fresh) {
                await fs.rm(sourcesPath);
            }
            if (!(await fs.exists(sourcesPath))) {
                this.log({
                    message: "waiting"
                });

                await this.manager.download({
                    version,
                    type,
                    progressBar: true
                });
            }

            this.log({
                message: "extracting sources"
            });
            sourcesPath = await this.manager.extract({
                version,
                type
            });
        }

        this.statusfile = new PackagerStatusFile({
            cwd: sourcesPath
        });

        await this.statusfile.update();

        const compiler = new NodejsCompiler({
            cwd: sourcesPath
        });

        this.log({
            message: "configuring build system"
        });

        let reconfigured = false;
        const newConfigureArgs = useFlags(DEFAULT_CONFIGURE_FLAGS, this.options.configure);
        if (this.options.forceConfigure || !is.deepEqual(this.statusfile.get("configure"), newConfigureArgs)) {
            const configureResult = await compiler.configure({
                flags: newConfigureArgs
            });

            if (configureResult.code !== 0) {
                this.log({
                    stderr: configureResult.stderr
                });
                return;
            }

            await this.statusfile.update({
                configure: newConfigureArgs
            });
            reconfigured = true;
        }

        if (this.options.forceBuild || reconfigured || !(await fs.exists(join(sourcesPath, NODE_BIN_PATH)))) {
            this.log({
                message: "building Node.js"
            });

            const newMakeArgs = useFlags([], this.options.make);
            const buildResult = await compiler.build(newMakeArgs);

            if (buildResult.code !== 0) {
                this.log({
                    stderr: buildResult.stderr
                });
                return;
            }

            await this.statusfile.update({
                make: newMakeArgs
            });
        }
    }
}
