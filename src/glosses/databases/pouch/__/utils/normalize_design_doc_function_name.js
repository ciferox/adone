const { database: { pouch: { __: { util: { parseDesignDocFunctionName } } } } } = adone;

export default function normalizeDesignDocFunctionName(s) {
    const normalized = parseDesignDocFunctionName(s);
    return normalized ? normalized.join("/") : null;
}
