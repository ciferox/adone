const { is, error } = adone;

export const __ = adone.lazify({
    helper: "./helpers",
    Reader: "./reader",
    Decoder: "./decoder",
    Metadata: "./metadata"
}, null, require);

adone.lazify({
    Generator: "./generator"
}, exports, require);


export const open = async (filepath, opts) => {
    const database = await adone.fs.readFile(filepath);
    return new __.Reader(database, opts);
};

export const openSync = (filepath, opts) => {
    const database = adone.fs.readFileSync(filepath);
    if (is.null(database)) {
        throw new error.InvalidArgument("Invalid database file");
    }
    return new __.Reader(database, opts);
};
