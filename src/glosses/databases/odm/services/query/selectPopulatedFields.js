const {
    is
} = adone;

module.exports = function selectPopulatedFields(query) {
    const opts = query._mongooseOptions;

    if (!is.nil(opts.populate)) {
        const paths = Object.keys(opts.populate);
        let i;
        const userProvidedFields = query._userProvidedFields || {};
        if (query.selectedInclusively()) {
            for (i = 0; i < paths.length; ++i) {
                if (!isPathInFields(userProvidedFields, paths[i])) {
                    query.select(paths[i]);
                }
            }
        } else if (query.selectedExclusively()) {
            for (i = 0; i < paths.length; ++i) {
                if (is.nil(userProvidedFields[paths[i]])) {
                    delete query._fields[paths[i]];
                }
            }
        }
    }
};

/*!
 * ignore
 */

function isPathInFields(userProvidedFields, path) {
    const pieces = path.split(".");
    const len = pieces.length;
    let cur = pieces[0];
    for (let i = 1; i < len; ++i) {
        if (!is.nil(userProvidedFields[cur])) {
            return true;
        }
        cur += `.${  pieces[i]}`;
    }
    return !is.nil(userProvidedFields[cur]);
}
