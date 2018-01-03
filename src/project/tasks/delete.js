const {
    fs,
    is,
    std,
    util
} = adone;

export default class DeleteTask extends adone.project.task.Base {
    async main(params) {
        let srcGlob;

        if (is.exist(params.dstClean)) {
            await fs.rm(params.dstClean, {
                cwd: this.manager.cwd,
                glob: {
                    nodir: true
                }
            });
        } else {
            if (is.array(params.src)) {
                // It is assumed that for one project's entry only one glob is specified, the remaining globs are exclusive.
                for (const s of params.src) {
                    if (!s.startsWith("!")) {
                        srcGlob = s;
                        break;
                    }
                }
            } else {
                srcGlob = params.src;
            }

            await fs.rm(std.path.join(params.dst, std.path.relative(util.globParent(srcGlob), srcGlob)), {
                cwd: this.manager.cwd,
                glob: {
                    nodir: true
                }
            });
        }

        // TODO: remove empty folders

        if (!this.manager.silent) {
            adone.info(`[${params.id}] ${params.task}`);
        }
    }
}
