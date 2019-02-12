const {
    fs,
    is,
    std,
    task,
    error
} = adone;

export default class MountTask extends task.Task {
    async run({ name, path } = {}) {
        try {
            this.manager.notify(this, "progress", {
                message: "mounting"
            });
            const devmntPath = adone.realm.config.devmntPath;

            if (!is.string(name)) {
                throw new error.NotValidException(`Name of namespace is not valid: ${name}`);
            }

            name = adone.text.toCamelCase(name);

            if (!is.string(path)) {
                throw new error.NotValidException(`Path is not valid: ${path}`);
            }

            if (!std.path.isAbsolute(path)) {
                throw new error.NotValidException("Path should be absolute");
            }

            // It's not necessary to do more strict check...
            // if (!(await fs.exists(path))) {
            //     throw new error.NotExistsException(`Path '${path}' is not exist`);
            // }

            let config;
            if (await fs.exists(devmntPath)) {
                config = await adone.configuration.load(devmntPath);
            } else {
                config = new adone.configuration.Generic();
            }

            if (is.string(config.raw[name])) {
                throw new error.ExistsException(`Namespace 'adone.dev.${name}' is already exist`);
            }

            config.raw[name] = path;

            await config.save(devmntPath, null, {
                space: "    "
            });

            this.manager.notify(this, "progress", {
                message: `{green-fg}{bold}adone.dev.${name}{/} successfully mounted`,
                result: true
            });
        } catch (err) {
            this.manager.notify(this, "progress", {
                message: err.message,
                result: false
            });

            throw err;
        }
    }
}
