const {
    database: { pouch }
} = adone;

const {
    util
} = adone.private(pouch);

export default function rev() {
    return util.uuid().replace(/-/g, "").toLowerCase();
}
