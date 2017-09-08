const {
    database: { pouch }
} = adone;

const {
    util: { parseDesignDocFunctionName }
} = adone.private(pouch);

export default function normalizeDesignDocFunctionName(s) {
    const normalized = parseDesignDocFunctionName(s);
    return normalized ? normalized.join("/") : null;
}
