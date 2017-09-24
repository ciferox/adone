const {
    fs,
    std,
    util
} = adone;

export default class DeleteTask extends adone.project.task.Base {
    async main(params) {
        return fs.rm(std.path.join(params.$dst, std.path.relative(util.globParent(params.$src), params.$src)), {
            cwd: this.manager.path
        });
    }
}
