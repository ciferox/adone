const {
    is,
    fs,
    project
} = adone;

export default class InitializeTask extends project.generator.task.Base {
    async run() {
        if (!is.string(this.context.project.name)) {
            throw new adone.x.InvalidArgument("Invalid name of project");
        }

        if (await fs.exists(this.context.project.cwd)) {
            const files = await fs.readdir(this.context.project.cwd);
            if (files.length > 0) {
                throw new adone.x.Exists(`Path '${this.context.project.cwd}' exists and is not empty`);
            }
        } else {
            await fs.mkdirp(this.context.project.cwd);
        }
    }
}
