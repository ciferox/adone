const {
    is
} = adone;

class PouchError extends adone.x.Exception {
    constructor(status, error, reason) {
        super(reason, false);
        this.status = status;
        this.name = error;
        this.message = reason;
        this.error = true;
    }

    toString() {
        return JSON.stringify({
            status: this.status,
            name: this.name,
            message: this.message,
            reason: this.reason
        });
    }
}

export const UNAUTHORIZED = new PouchError(401, "unauthorized", "Name or password is incorrect.");
export const MISSING_BULK_DOCS = new PouchError(400, "bad_request", "Missing JSON list of 'docs'");
export const MISSING_DOC = new PouchError(404, "not_found", "missing");
export const REV_CONFLICT = new PouchError(409, "conflict", "Document update conflict");
export const INVALID_ID = new PouchError(400, "bad_request", "_id field must contain a string");
export const MISSING_ID = new PouchError(412, "missing_id", "_id is required for puts");
export const RESERVED_ID = new PouchError(400, "bad_request", "Only reserved document ids may start with underscore.");
export const NOT_OPEN = new PouchError(412, "precondition_failed", "Database not open");
export const UNKNOWN_ERROR = new PouchError(500, "unknown_error", "Database encountered an unknown error");
export const BAD_ARG = new PouchError(500, "badarg", "Some query argument is invalid");
export const INVALID_REQUEST = new PouchError(400, "invalid_request", "Request was invalid");
export const QUERY_PARSE_ERROR = new PouchError(400, "query_parse_error", "Some query parameter is invalid");
export const DOC_VALIDATION = new PouchError(500, "doc_validation", "Bad special document member");
export const BAD_REQUEST = new PouchError(400, "bad_request", "Something wrong with the request");
export const NOT_AN_OBJECT = new PouchError(400, "bad_request", "Document must be a JSON object");
export const DB_MISSING = new PouchError(404, "not_found", "Database not found");
export const NOT_FOUND = new PouchError(404, "not_found", "Not found");
export const IDB_ERROR = new PouchError(500, "indexed_db_went_bad", "unknown");
export const WSQ_ERROR = new PouchError(500, "web_sql_went_bad", "unknown");
export const LDB_ERROR = new PouchError(500, "levelDB_went_went_bad", "unknown");
export const FORBIDDEN = new PouchError(403, "forbidden", "Forbidden by design doc validate_doc_update function");
export const INVALID_REV = new PouchError(400, "bad_request", "Invalid rev format");
export const FILE_EXISTS = new PouchError(412, "file_exists", "The database could not be created, the file already exists.");
export const MISSING_STUB = new PouchError(412, "missing_stub", "A pre-existing attachment stub wasn't found");
export const INVALID_URL = new PouchError(413, "invalid_url", "Provided URL is invalid");
export const BUILT_IN = new PouchError(500, "invalid_value", "Invalid value");
BUILT_IN.builtIn = true;

export const createError = (error, reason) => {
    const err = new PouchError(undefined, undefined, reason);
    for (const p of adone.util.keys(error, { all: true })) {
        if (!is.function(error[p])) {
            err[p] = error[p];
        }
    }

    if (!is.undefined(reason)) {
        err.reason = reason;
    }

    return err;
};

export const generateErrorFromResponse = (err) => {

    if (!is.object(err)) {
        const data = err;
        err = UNKNOWN_ERROR;
        err.data = data;
    }

    if ("error" in err && err.error === "conflict") {
        err.name = "conflict";
        err.status = 409;
    }

    if (!("name" in err)) {
        err.name = err.error || "unknown";
    }

    if (!("status" in err)) {
        err.status = 500;
    }

    if (!("message" in err)) {
        err.message = err.message || err.reason;
    }

    return err;
};

