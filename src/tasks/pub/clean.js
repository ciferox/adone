const {
    fs,
    is,
    path: aPath,
    realm: { BaseTask }
} = adone;

const clean = async function ({ manager, ...unit } = {}) {
    let srcGlob;

    if (unit.task === "cmake") {
        return adone.nodejs.cmake.clean({ realm: manager, path: unit.src });
    }

    let dstGlob;
    if (is.exist(unit.dstClean)) {
        dstGlob = unit.dstClean;
    } else {
        if (is.array(unit.src)) {
            // It is assumed that for one project's entry only one glob is specified, the remaining globs are exclusive.
            for (const s of unit.src) {
                if (!s.startsWith("!")) {
                    srcGlob = s;
                    break;
                }
            }
        } else {
            srcGlob = unit.src;
        }

        dstGlob = path.join(unit.dst, path.relative(adone.glob.parent(srcGlob), srcGlob));
    }

    await fs.remove(dstGlob, {
        cwd: manager.cwd,
        glob: {
            nodir: true
        }
    });

    await fs.rmEmpty(adone.glob.parent(dstGlob), {
        cwd: manager.cwd
    });
};

@adone.task.task("clean")
export default class extends BaseTask {
    async main({ path } = {}) {
        const observer = await adone.task.runParallel(this.manager, this.manager.devConfig.getUnits(path).map((unit) => ({
            task: clean,
            args: {
                manager: this.manager,
                ...unit
            }
        })));
        return observer.result;
    }
}
