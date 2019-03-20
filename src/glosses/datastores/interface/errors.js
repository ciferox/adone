const errcode = require("err-code");

export const dbOpenFailedError = (err) => {
    err = err || new Error("Cannot open database");
    return errcode(err, "ERR_DB_OPEN_FAILED");
};

export const dbDeleteFailedError = (err) => {
    err = err || new Error("Delete failed");
    return errcode(err, "ERR_DB_DELETE_FAILED");
};

export const dbWriteFailedError = (err) => {
    err = err || new Error("Write failed");
    return errcode(err, "ERR_DB_WRITE_FAILED");
};

export const notFoundError = (err) => {
    err = err || new Error("Not Found");
    return errcode(err, "ERR_NOT_FOUND");
};
