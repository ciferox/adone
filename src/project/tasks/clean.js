const {
    fs,
    is,
    std,
    util
} = adone;

export default class CleanTask extends adone.project.task.Base {
    async main(params) {
        let srcGlob;

        let dstGlob;
        if (is.exist(params.dstClean)) {
            dstGlob = params.dstClean;
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

            dstGlob = std.path.join(params.dst, std.path.relative(util.globParent(srcGlob), srcGlob));
        }

        await fs.rm(dstGlob, {
            cwd: this.manager.cwd,
            glob: {
                nodir: true
            }
        });

        await fs.rmEmpty(adone.util.globParent(dstGlob), {
            cwd: this.manager.cwd
        });

        this.logInfo(`[${params.id}] ${params.task}`);
    }
}
