const {
    fs,
    is,
    std,
    util,
    realm: { BaseTask }
} = adone;

const clean = async function (manager, entry) {
    let srcGlob;

    let dstGlob;
    if (is.exist(entry.dstClean)) {
        dstGlob = entry.dstClean;
    } else {
        if (is.array(entry.src)) {
            // It is assumed that for one project's entry only one glob is specified, the remaining globs are exclusive.
            for (const s of entry.src) {
                if (!s.startsWith("!")) {
                    srcGlob = s;
                    break;
                }
            }
        } else {
            srcGlob = entry.src;
        }

        dstGlob = std.path.join(entry.dst, std.path.relative(util.globParent(srcGlob), srcGlob));
    }

    await fs.rm(dstGlob, {
        cwd: manager.cwd,
        glob: {
            nodir: true
        }
    });

    await fs.rmEmpty(util.globParent(dstGlob), {
        cwd: manager.cwd
    });
};

export default class extends BaseTask {
    async main({ path } = {}) {
        const observer = await this.manager.runInParallel(this.manager.getEntries({ path }).map((entry) => ({
            task: clean,
            args: [this.manager, entry]
        })));
        return observer.result;
    }
}
