const { is, lazify, x } = adone;

export const _ = lazify({
    helper: "./helpers",
    Reader: "./reader",
    Decoder: "./decoder",
    Metadata: "./metadata"
}, null, require);

export const open = async (filepath, opts) => {
    const database = await adone.fs.readFile(filepath);
    // if (is.null(database)) {
    //     throw new x.InvalidArgument("Invalid database file");
    // }
    return new _.Reader(database, opts);
};

export const openSync = (filepath, opts) => {
    const database = adone.fs.readFileSync(filepath);
    if (is.null(database)) {
        throw new x.InvalidArgument("Invalid database file");
    }
    return new _.Reader(database, opts);
};
