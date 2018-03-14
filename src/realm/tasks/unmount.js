const {
    fs,
    is,
    task,
    error
} = adone;

export default class MountTask extends task.Task {
    async run({ name, path } = {}) {
        try {
            this.manager.notify(this, "progress", {
                message: "unmounting"
            });
            const devmntPath = adone.realm.config.devmntPath;

            if (!is.string(name)) {
                throw new error.NotValid(`Name of namespace is not valid: ${name}`);
            }

            name = adone.text.toCamelCase(name);

            if (await fs.exists(devmntPath)) {
                const config = await adone.configuration.load(devmntPath);

                if (!is.string(config.raw[name])) {
                    throw new error.NotExists(`Namespace 'adone.dev.${name}' is not exist`);
                }

                delete config.raw[name];

                await config.save(devmntPath, null, {
                    space: "    "
                });

                this.manager.notify(this, "progress", {
                    message: `{green-fg}{bold}adone.dev.${name}{/} successfully unmounted`,
                    result: true
                });
            } else {
                throw new error.NotExists(`Namespace 'adone.dev.${name}' is not exist`);
            }
        } catch (err) {
            this.manager.notify(this, "progress", {
                message: err.message,
                result: false
            });

            throw err;
        }
    }
}
