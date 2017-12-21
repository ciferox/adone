const {
    cli: { kit },
    fs,
    is,
    std,
    task,
    x
} = adone;

export default class MountTask extends task.Task {
    async run({ name, path } = {}) {
        try {
            kit.createProgress("unmounting");
            const devmntPath = adone.realm.config.devmntPath;

            if (!is.string(name)) {
                throw new x.NotValid(`Name of namespace is not valid: ${name}`);
            }

            name = adone.text.toCamelCase(name);

            if (await fs.exists(devmntPath)) {
                const config = await adone.configuration.load(devmntPath);

                if (!is.string(config.raw[name])) {
                    throw new x.NotExists(`Namespace 'adone.dev.${name}' is not exist`);
                }

                delete config.raw[name];

                await config.save(devmntPath, null, {
                    space: "    "
                });

                kit.updateProgress({
                    message: `{green-fg}{bold}adone.dev.${name}{/} successfully unmounted`,
                    result: true
                });
            } else {
                throw new x.NotExists(`Namespace 'adone.dev.${name}' is not exist`);
            }
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });

            throw err;
        }
    }
}
