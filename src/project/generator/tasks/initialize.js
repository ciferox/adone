const {
    is,
    fs,
    project
} = adone;

export default class InitializeTask extends project.GeneratorTask {
    async run(input) {
        if (!is.string(input.name)) {
            throw new adone.x.InvalidArgument("Invalid name of project");
        }

        if (await fs.exists(input.cwd)) {
            const files = await fs.readdir(input.cwd);
            if (files.length > 0) {
                throw new adone.x.Exists(`Path '${input.cwd}' exists and is not empty`);
            }
        } else {
            await fs.mkdirp(input.cwd);
        }
    }
}
