const {
    crypto,
    error,
    is,
    fast,
    fs,
    std,
    realm: { BaseTask },
    runtime: { cli: { theme } },
    util
} = adone;

const { path: { join } } = std;

const REQUIRED_DIRS = ["bin", "lib", "etc", "share"];
const COMPRESS_FORMATS = ["zip", "tar.gz", "tar.xz"];

export default class extends BaseTask {
    get arch() {
        const arch = process.arch;
        switch (arch) {
            case "ia32": return "x86";
            default: return arch;
        }
    }

    get os() {
        const platform = process.platform;
        switch (platform) {
            case "win32": return "win";
            default: return platform;
        }
    }

    async run({ basePath, name, bits = 2048, withSrc = false, clean = false, compress = false, keys = false } = {}) {        
        this.manager.notify(this, "progress", {
            message: "checking"
        });

        if (!is.string(basePath)) {
            throw new error.NotValidException(`Invalid type of 'basePath': ${adone.typeOf(basePath)}`);
        }

        if (!is.string(name)) {
            throw new error.NotValidException(`Invalid type of 'name': ${adone.typeOf(name)}`);
        }

        this.destPath = compress ? basePath : std.path.resolve(basePath, name);

        if (await fs.exists(this.destPath) && !compress) {
            throw new error.ExistsException(`Path '${this.destPath}' already exists`);
        }

        this.manager.notify({
            message: `initializing realm at ${theme.accent(this.destPath)}`
        });

        await fs.mkdirp(this.destPath);

        if (compress) {
            const tmpPath = await adone.fs.tmpName({
                prefix: "realm-"
            });
            await fs.mkdirp(tmpPath);
            this.destPath = tmpPath;
        }

        const CWD = this.destPath;
        // const RUNTIME_PATH = join(CWD, "runtime");
        const VAR_PATH = join(CWD, "var");
        const ADONE_SPECIAL_PATH = join(CWD, ".adone");
        const ETC_PATH = join(CWD, "etc");
        const ETC_ADONE_PATH = join(ETC_PATH, "adone");
        const LOGS_PATH = join(VAR_PATH, "logs");
        const KEYS_PATH = join(CWD, "keys");
        const PACKAGES_PATH = join(CWD, "packages");
        // const LOCKFILE_PATH = join(CWD, "realm.lock");

        // runtime dir + lockfile
        // if (!(await fs.exists(LOCKFILE_PATH))) {
        //     // Create lockfile
        //     await fs.writeFile(LOCKFILE_PATH, "");
        // }

        // var dir
        if (!(await fs.exists(VAR_PATH))) {
            await fs.mkdirp(VAR_PATH);
        }

        // logs dir
        if (!(await fs.exists(LOGS_PATH))) {
            await fs.mkdirp(LOGS_PATH);
        }

        // packages dir
        if (!(await fs.exists(PACKAGES_PATH))) {
            await fs.mkdirp(PACKAGES_PATH);
        }

        // keys dir
        if (keys) {
            if (!(await fs.exists(KEYS_PATH))) {
                // Create realm identity
                await fs.mkdirp(KEYS_PATH);
            }
        }

        if (!clean) {
            const identityConfig = new adone.configuration.Generic({
                cwd: ETC_ADONE_PATH
            });

            try {
                await identityConfig.load("identity.json");
            } catch (err) {
                const serverIdentity = crypto.Identity.create({
                    bits
                });

                const clientIdentity = crypto.Identity.create({
                    bits
                });

                identityConfig.raw = {
                    server: {
                        id: serverIdentity.asBase58(),
                        privKey: serverIdentity.privKey.bytes.toString("base64")
                    },
                    client: {
                        id: clientIdentity.asBase58(),
                        privKey: clientIdentity.privKey.bytes.toString("base64")
                    }
                };

                await identityConfig.save("identity.json", null, {
                    space: "    "
                });
            }
        }

        this.manager.notify(this, "progress", {
            message: "copying files"
        });

        // For production stage and if clean-mode is enabled '.adone' directory should be empty
        const dirs = REQUIRED_DIRS;
        if (clean) {
            await fs.mkdir(ADONE_SPECIAL_PATH);
        } else {
            dirs.push(".adone");
        }

        const targets = [
            "!**/*.map",
            "package.json",
            "adone.json",
            "README.md",
            "LICENSE",
            ...dirs.map((x) => util.globize(x, { recursive: true }))
        ];

        if (withSrc) {
            targets.push("src");
            targets.push("!src/**/native/build/**/*");
        }

        await fast.src(targets, { base: adone.ROOT_PATH }).dest(this.destPath, {
            produceFiles: true
        });

        // force transpile and build native addons

        // const targetProjManager = await project.Manager.load({
        //     cwd: destPath
        // });
        // targetProjManager.setSilent(true);

        // const entries = targetProjManager.getProjectEntries();
        // const entriesWithNative = targetProjManager.getProjectEntries({
        //     onlyNative: true
        // }).map((entry) => entry.id);

        // for (const entry of entries) {
        //     this.root.kit.updateProgress({
        //         message: `transpiling: ${entry.id}`
        //     });
        //     const entryId = new RegExp(`${entry.id}$`);
        //     /* eslint-disable */
        //     observer = await targetProjManager.build(entryId);
        //     await observer.result;

        //     if (entriesWithNative.includes(entry.id)) {
        //         this.root.kit.updateProgress({
        //             message: `addon building: ${entry.id}`
        //         });

        //         observer = await targetProjManager.nbuild(entryId, {
        //             clean: true
        //         });
        //         await observer.result;
        //     }
        //     /* eslint-enable */
        // }

        // if (!withSrc) {
        //     this.root.kit.updateProgress({
        //         message: "deleting unnecessary files"
        //     });

        //     await fs.rm(std.path.join(destPath, "src"));
        //     await fs.rm(util.globize(std.path.join(destPath, "lib"), {
        //         recursive: true,
        //         ext: ".js.map"
        //     }));
        // }

        if (compress) {
            let format;
            if (is.string(compress)) {
                format = compress;
            } else {
                format = is.windows ? "zip" : "tar.gz";
            }

            if (!COMPRESS_FORMATS.includes(format)) {
                throw new error.NotSupportedException(`Unsupported compression format: ${format}`);
            }

            this.manager.notify(this, "progress", {
                message: "compressing"
            });

            const fileName = `${name}-v${adone.package.version}-node-v${process.version.match(/^v(\d+)\./)[1]}-${this.os}-${this.arch}.${format}`;

            await fast.src(adone.util.globize(this.destPath, {
                ext: "*",
                recursive: true
            }), { base: adone.rootPath })
                .archive(format, fileName)
                .dest(basePath);

            await fs.rm(this.destPath);
            this.destPath = std.path.join(basePath, fileName);
        }

        this.manager.notify(this, "progress", {
            message: `fork ${theme.accent(this.destPath)} successfully created`,
            status: true
        });

        return this.destPath;
    }

    async undo(err) {
        this.manager.notify(this, "progress", {
            message: err.message,
            status: false
        });

        if (!(err instanceof error.ExistsException)) {
            is.string(this.destPath) && await fs.rm(this.destPath);
        }
    }
}
