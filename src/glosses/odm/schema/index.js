const __ = adone.lazify({
    String: "./string",
    Number: "./number",
    Boolean: "./boolean",
    DocumentArray: "./documentarray",
    Embedded: "./embedded",
    Array: "./array",
    Buffer: "./buffer",
    Date: "./date",
    ObjectId: "./objectid",
    Mixed: "./mixed",
    Decimal128: "./decimal128",
    Long: "./long",
    // alias
    Decimal: () => __.Decimal128,
    Oid: () => __.ObjectId,
    Object: () => __.Mixed,
    Bool: () => __.Boolean
}, exports, require);
