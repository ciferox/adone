const {
    is,
    realm: { BaseTask }
} = adone;

const MANAGERS = ["pnpm", "yarn", "npm"];

@adone.task.task("installModules")
export default class extends BaseTask {
    async main({ cwd } = {}) {
        let pkgName;
        for (const name of MANAGERS) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await adone.fs.which(name);
                pkgName = name;
                break;
            } catch (err) {
                // try next
            }
        }

        if (!is.string(pkgName)) {
            throw new adone.error.NotFoundException(`No package manager found. Inslall one of: ${MANAGERS.join(", ")}`);
        }

        if (!cwd) {
            cwd = this.manager.cwd;
        }

        await adone.process.exec(pkgName, ["install"], {
            cwd
        });
    }
}
