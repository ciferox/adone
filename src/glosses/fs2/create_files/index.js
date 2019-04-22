const {
    error,
    path: { join }
} = adone;

const createFiles = async ({ fs, root, struct } = {}) => {
    const names = Object.getOwnPropertyNames(struct);
    for (const name of names) {
        const fullPath = join(root, name);
        const content = struct[name];
        const contentType = adone.typeOf(content);
        if (["Uint8Array", "string"]) {
            
        }
    }
};

/**
 * Create files from JSON.
 */
export default (config) => {
    const fs = config.fs || adone.std.fs;
    const struct = config.structure || config.struct || {};
    const root = config.root || config.rootPath || null;

    if (!rootPath) {
        throw new error.NotValidException(`Invalid root path: ${root}`);
    }

    return createFiles({
        fs,
        root,
        struct
    })
};
