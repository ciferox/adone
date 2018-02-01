const {
    cli: { kit },
    fs,
    is,
    std,
    task,
    exception
} = adone;

export default class MountTask extends task.Task {
    async run({ name, path } = {}) {
        try {
            kit.createProgress("mounting");
            const devmntPath = adone.realm.config.devmntPath;

            if (!is.string(name)) {
                throw new exception.NotValid(`Name of namespace is not valid: ${name}`);
            }

            name = adone.text.toCamelCase(name);

            if (!is.string(path)) {
                throw new exception.NotValid(`Path is not valid: ${path}`);
            }

            if (!std.path.isAbsolute(path)) {
                throw new exception.NotValid("Path should be absolute");
            }

            // It's not necessary to do more strict check...
            // if (!(await fs.exists(path))) {
            //     throw new exception.NotExists(`Path '${path}' is not exist`);
            // }

            let config;
            if (await fs.exists(devmntPath)) {
                config = await adone.configuration.load(devmntPath);
            } else {
                config = new adone.configuration.Generic();
            }

            if (is.string(config.raw[name])) {
                throw new exception.Exists(`Namespace 'adone.dev.${name}' is already exist`);
            }

            config.raw[name] = path;

            await config.save(devmntPath, null, {
                space: "    "
            });

            kit.updateProgress({
                message: `{green-fg}{bold}adone.dev.${name}{/} successfully mounted`,
                result: true
            });
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });

            throw err;
        }
    }
}
