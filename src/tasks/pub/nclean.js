const {
    cmake,
    fs,
    is,
    std
} = adone;

const clean = async function (manager, entry) {
    if (is.string(entry.native.type) && entry.native.type === "gyp") {
        await fs.rm(entry.native.dst, {
            cwd: manager.cwd,
            glob: {
                nodir: true
            }
        });

        await fs.rmEmpty(adone.glob.parent(entry.native.dst), {
            cwd: manager.cwd
        });
    } else {
        // Remove build directory from src
        const cwd = process.cwd();
        const nativePath = std.path.join(manager.cwd, entry.native.src);
        process.chdir(nativePath);
        const buildSystem = new cmake.BuildSystem();
        try {
            await buildSystem.clean();
        } finally {
            process.chdir(cwd);
        }

        // Remove dst
        await fs.rm(entry.native.dst, {
            cwd: manager.cwd,
            glob: {
                nodir: true
            }
        });

        await fs.rmEmpty(adone.glob.parent(entry.native.dst), {
            cwd: manager.cwd
        });
    }
};

@adone.task.task("nclean")
export default class extends adone.realm.BaseTask {
    async main({ path } = {}) {
        const entries = this.manager.getEntries({
            path,
            onlyNative: true
        });

        if (entries.length === 0) {
            return null;
        }

        const observer = await adone.task.runParallel(this.manager, entries.map((entry) => ({
            task: clean,
            args: [this.manager, entry]
        })));

        return observer.result;
    }
}
