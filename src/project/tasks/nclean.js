const {
    cmake,
    fs,
    is,
    std
} = adone;

export default class NCleanTask extends adone.project.task.Base {
    async main(params) {
        if (is.string(params.native.type) && params.native.type === "gyp") {
            await fs.rm(params.native.dst, {
                cwd: this.manager.cwd,
                glob: {
                    nodir: true
                }
            });

            await fs.rmEmpty(adone.util.globParent(params.native.dst), {
                cwd: this.manager.cwd
            });

            if (!this.manager.silent) {
                adone.info(`[${params.id}] nclean`);
            }
        } else {
            // Remove build directory from src
            const cwd = process.cwd();
            const nativePath = std.path.join(this.manager.cwd, params.native.src);
            process.chdir(nativePath);
            const buildSystem = new cmake.BuildSystem();
            try {
                await buildSystem.clean();
            } finally {
                process.chdir(cwd);
            }

            // Remove dst
            await fs.rm(params.native.dst, {
                cwd: this.manager.cwd,
                glob: {
                    nodir: true
                }
            });

            await fs.rmEmpty(adone.util.globParent(params.native.dst), {
                cwd: this.manager.cwd
            });
        }
    }
}
