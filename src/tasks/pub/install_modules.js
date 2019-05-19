const {
    is,
    realm: { BaseTask }
} = adone;

const MANAGERS = [
    {
        name: "pnpm",
        single: {
            args: ["i"],
            dev: "-D"
        }
    },
    {
        name: "yarn",
        single: {
            args: ["add"],
            dev: "-D"
        }
    },
    {
        name: "npm",
        single: {
            args: ["install"],
            dev: "--save-dev"
        }
    }
];

@adone.task.task("installModules")
export default class extends BaseTask {
    async main({ cwd, dev = false, modules } = {}) {
        let app;
        for (const appInfo of MANAGERS) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await adone.fs.which(appInfo.name);
                app = appInfo;
                break;
            } catch (err) {
                // try next
            }
        }

        if (!app) {
            throw new adone.error.NotFoundException(`No package manager found. Inslall one of: ${MANAGERS.join(", ")}`);
        }

        if (!cwd) {
            cwd = this.manager.cwd;
        }

        if (is.plainObject(modules)) {
            for (const [name, version] of Object.entries(modules)) {
                const args = [...app.single.args];
                if (dev) {
                    args.push(app.single.dev);
                }
                args.push(`${name}@${version}`)
                await adone.process.exec(app.name, args, {
                    cwd
                });
            }
        } else {
            const args = ["install"];
            if (!dev) {
                args.push("--production");
            }

            await adone.process.exec(app.name, args, {
                cwd
            });
        }
    }
}
