const {
    cli,
    error,
    is,
    fast,
    fs,
    std,
    realm
} = adone;

export default class extends realm.BaseTask {
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

    async run({ srcRealm, basePath, name, exclude } = {}) {
        this.manager.notify(this, "progress", {
            message: "checking"
        });

        if (is.string(srcRealm)) {
            srcRealm = new realm.Manager({ cwd: srcRealm });
        }

        if (!srcRealm || !is.realm(srcRealm)) {
            throw new error.NotValidException(`Invalid type of srcRealm: ${adone.typeOf(srcRealm)}`);
        }

        if (!is.string(basePath) || basePath.length === 0) {
            throw new error.NotValidException(`Invalid basePath: ${adone.inspect(basePath)}`);
        }

        if (!is.string(name) || name.length === 0) {
            throw new error.NotValidException(`Invalid name: ${adone.inspect(name)}`);
        }

        this.manager.notify(this, "progress", {
            message: "connecting to source realm"
        });

        // Connect to source realm
        await srcRealm.connect();

        this.manager.notify(this, "progress", {
            message: "preparing to copy common realm files"
        });

        const cwd = std.path.resolve(basePath, name);

        if (await fs.exists(cwd)) {
            throw new error.ExistsException(`Path '${cwd}' already exists`);
        }

        await fs.mkdirp(cwd);

        this.destRealm = new realm.Manager({
            cwd
        });
        // const srcGlob = util.arrify(exclude).map((glob) => glob.startsWith("!")
        //     ? glob
        //     : `!${glob}`
        // );

        const DIRS = [
            std.path.relative(srcRealm.cwd, srcRealm.BIN_PATH),
            std.path.relative(srcRealm.cwd, srcRealm.RUNTIME_PATH),
            std.path.relative(srcRealm.cwd, srcRealm.ETC_PATH),
            std.path.relative(srcRealm.cwd, srcRealm.OPT_PATH),
            std.path.relative(srcRealm.cwd, srcRealm.VAR_PATH),
            std.path.relative(srcRealm.cwd, srcRealm.SHARE_PATH),
            std.path.relative(srcRealm.cwd, srcRealm.LIB_PATH),
            std.path.relative(srcRealm.cwd, srcRealm.SPECIAL_PATH),
            std.path.relative(srcRealm.cwd, srcRealm.SRC_PATH),
            std.path.relative(srcRealm.cwd, srcRealm.PACKAGES_PATH),
            std.path.relative(srcRealm.cwd, srcRealm.TESTS_PATH)
        ];

        const rootFileNames = (await fs.readdir(srcRealm.ROOT_PATH)).filter((name) => !DIRS.includes(name));

        this.manager.notify(this, "progress", {
            message: "copying root files"
        });


        await fast.src(rootFileNames, {
            cwd: srcRealm.ROOT_PATH,
            base: srcRealm.ROOT_PATH
        }).dest(this.destRealm.cwd, {
            produceFiles: true
        });

        for (const dir of DIRS) {
            this.manager.notify(this, "progress", {
                message: `copying ${cli.style.accent(dir)}`
            });
    
            const cwd = std.path.join(srcRealm.ROOT_PATH, dir);
            const base = cwd;
            const dstPath = std.path.join(this.destRealm.cwd, dir);
            // eslint-disable-next-line no-await-in-loop
            await fast.src("**/*", {
                cwd,
                base
            }).dest(dstPath, {
                produceFiles: true
            });
        }

        this.manager.notify(this, "progress", {
            message: `realm ${cli.style.primary(srcRealm.name)} successfully forked into ${cli.style.accent(this.destRealm.cwd)}`,
            status: true
        });

        return this.destRealm;
    }

    async undo(err) {
        this.manager.notify(this, "progress", {
            message: err.message,
            status: false
        });

        is.realm(this.destRealm) && await fs.rm(this.destRealm.cwd);
    }
}
