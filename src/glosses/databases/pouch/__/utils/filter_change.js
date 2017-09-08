const {
    is,
    database: { pouch }
} = adone;

const {
    x: {
        createError,
        BAD_REQUEST
    }
} = pouch;

const tryFilter = (filter, doc, req) => {
    try {
        return !filter(doc, req);
    } catch (err) {
        const msg = `Filter function threw: ${err.toString()}`;
        return createError(BAD_REQUEST, msg);
    }
};

export default function filterChange(opts) {
    const req = {};
    const hasFilter = opts.filter && is.function(opts.filter);
    req.query = opts.query_params;

    return function filter(change) {
        if (!change.doc) {
            // CSG sends events on the changes feed that don't have documents,
            // this hack makes a whole lot of existing code robust.
            change.doc = {};
        }

        const filterReturn = hasFilter && tryFilter(opts.filter, change.doc, req);

        if (is.object(filterReturn)) {
            return filterReturn;
        }

        if (filterReturn) {
            return false;
        }

        if (!opts.include_docs) {
            delete change.doc;
        } else if (!opts.attachments) {
            for (const att in change.doc._attachments) {
                /* istanbul ignore else */
                if (change.doc._attachments.hasOwnProperty(att)) {
                    change.doc._attachments[att].stub = true;
                }
            }
        }
        return true;
    };
}
