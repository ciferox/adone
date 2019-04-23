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
            if (["Uint8Array", "string"]) {
                await fs.writeFile(fullPath, content);
            } else if (contentType === "Object") {
                createFiles({
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
        const fs = config.fs || adone.fs2.base;
        const struct = config.structure || config.struct || {};
        const root = config.root || config.rootPath || "/";

        return createFiles({
            fs,
            root,
            struct
        });
    };
};
