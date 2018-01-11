const {
    fs
} = adone;

export default class NCleanTask extends adone.project.task.Base {
    async main(params) {
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
    }
}
