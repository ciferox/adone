adone.lazify({
    adapter: "./adapter",
    md5: "./md5",
    ChangesHandler: "./changes_handler",
    filterChange: "./filter_change",
    merge: "./merge",
    rev: "./rev",
    binary: "./binary",
    invalidIdError: "./invalid_id_error",
    parseAdapter: "./parse_adapter",
    isRemote: "./is_remote",
    upsert: "./upsert",
    bulkGetShim: "./bulk_get_shim",
    toPromise: "./to_promise",
    parseDesignDocFunctionName: "./parse_design_doc_function_name",
    normalizeDesignDocFunctionName: "./normalize_design_doc_function_name",
    selector: "./selector",
    defaultBackOff: "./default_backoff",
    toPouch: "./to_pouch"
}, exports, require);

export const uuid = adone.util.uuid.v4;
