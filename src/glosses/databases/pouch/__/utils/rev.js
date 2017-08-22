const { database: { pouch: { __: { util } } } } = adone;

export default function rev() {
    return util.uuid().replace(/-/g, "").toLowerCase();
}
