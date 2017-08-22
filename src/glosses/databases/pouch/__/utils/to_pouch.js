const { is } = adone;

export default function toPouch(db, opts) {
    const PouchConstructor = opts.PouchConstructor;
    if (is.string(db)) {
        return new PouchConstructor(db, opts);
    }
    return db;
}
