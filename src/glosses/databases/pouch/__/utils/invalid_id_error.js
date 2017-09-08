const {
    is,
    database: { pouch }
} = adone;

const {
    x
} = pouch;

// Determine id an ID is valid
//   - invalid IDs begin with an underescore that does not begin '_design' or
//     '_local'
//   - any other string value is a valid id
// Returns the specific error object for each case
export default function invalidIdError(id) {
    let err;
    if (!id) {
        err = x.createError(x.MISSING_ID);
    } else if (!is.string(id)) {
        err = x.createError(x.INVALID_ID);
    } else if (/^_/.test(id) && !(/^_(design|local)/).test(id)) {
        err = x.createError(x.RESERVED_ID);
    }
    if (err) {
        throw err;
    }
}
