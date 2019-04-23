export default (fs) => {
    const {
        error,
        path: { join }
    } = adone;

    const createFiles = async ({ root, struct } = {}) => {
        const names = Object.getOwnPropertyNames(struct);
        await fs.mkdirp(root);
        for (const name of names) {
            const fullPath = join(root, name);
            const content = struct[name];
            const contentType = adone.typeOf(content);
            if (["Uint8Array", "string"].includes(contentType)) {
                await fs.writeFile(fullPath, content);
            } else if (contentType === "Array") {
                const targetPath = join(root, content[1]);
                await fs.symlink(targetPath, fullPath);
            } else if (contentType === "Object") {
                return createFiles({
                    fs,
                    root: fullPath,
                    struct: content
                });
            }
        }
    };

    /**
     * Create files from JSON.
     */
    return (config) => {
        const struct = config.structure || config.struct || {};
        const root = config.root || config.rootPath || "/";

        return createFiles({
            root,
            struct
        });
    };
};
