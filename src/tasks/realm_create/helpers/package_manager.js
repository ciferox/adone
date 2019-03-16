const {
    is,
    fs,
    system: { process: { exec } }
} = adone;

const MANAGERS = ["pnpm", "yarn", "npm"];

export const runInstall = async ({ cwd } = {}) => {
    let pkgName;
    for (const name of MANAGERS) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await fs.which(name);
            pkgName = name;
            break;
        } catch (err) {
            // try next
        }
    }

    if (!is.string(pkgName)) {
        throw new adone.error.NotFoundException(`No package manager found. Inslall one of: ${MANAGERS.join(" or ")}`);
    }

    await exec(pkgName, ["install"], {
        cwd
    });
};
