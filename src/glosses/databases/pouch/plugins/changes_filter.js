const {
    is,
    std: { vm },
    database: { pouch }
} = adone;

const {
    x
} = pouch;

const {
    util: {
        isRemote,
        parseDesignDocFunctionName,
        normalizeDesignDocFunctionName
    },
    selector: {
        matchesSelector
    }
} = adone.private(pouch);

const evalFilter = (input) => {
    const code = `(function() {\n"use strict";\nreturn ${input}\n})()`;

    return vm.runInNewContext(code);
};

const evalView = (input) => {
    const code = [
        '"use strict";',
        "var emitted = false;",
        "var emit = function (a, b) {",
        "  emitted = true;",
        "};",
        `var view = ${input};`,
        "view(doc);",
        "if (emitted) {",
        "  return true;",
        "}"
    ].join("\n");

    return vm.runInNewContext(`(function(doc) {\n${code}\n})`);
};

const validate = (opts, callback) => {
    if (opts.selector) {
        if (opts.filter && opts.filter !== "_selector") {
            const filterName = is.string(opts.filter) ?
                opts.filter : "function";
            return callback(new Error(`selector invalid for filter "${filterName}"`));
        }
    }
    callback();
};

const normalize = (opts) => {
    if (opts.view && !opts.filter) {
        opts.filter = "_view";
    }

    if (opts.selector && !opts.filter) {
        opts.filter = "_selector";
    }

    if (opts.filter && is.string(opts.filter)) {
        if (opts.filter === "_view") {
            opts.view = normalizeDesignDocFunctionName(opts.view);
        } else {
            opts.filter = normalizeDesignDocFunctionName(opts.filter);
        }
    }
};

const shouldFilter = (changesHandler, opts) => {
    return opts.filter && is.string(opts.filter) &&
    !opts.doc_ids && !isRemote(changesHandler.db);
};

const filter = (changesHandler, opts) => {
    const callback = opts.complete;
    if (opts.filter === "_view") {
        if (!opts.view || !is.string(opts.view)) {
            const err = x.createError(x.BAD_REQUEST,
                "`view` filter parameter not found or invalid.");
            return callback(err);
        }
        // fetch a view from a design doc, make it behave like a filter
        const viewName = parseDesignDocFunctionName(opts.view);
        changesHandler.db.get(`_design/${viewName[0]}`, (err, ddoc) => {
            /* istanbul ignore if */
            if (changesHandler.isCancelled) {
                return callback(null, { status: "cancelled" });
            }
            /* istanbul ignore next */
            if (err) {
                return callback(x.generateErrorFromResponse(err));
            }
            const mapFun = ddoc && ddoc.views && ddoc.views[viewName[1]] &&
        ddoc.views[viewName[1]].map;
            if (!mapFun) {
                return callback(x.createError(x.MISSING_DOC,
                    (ddoc.views ? `missing json key: ${viewName[1]}` :
                        "missing json key: views")));
            }
            opts.filter = evalView(mapFun);
            changesHandler.doChanges(opts);
        });
    } else if (opts.selector) {
        opts.filter = function (doc) {
            return matchesSelector(doc, opts.selector);
        };
        changesHandler.doChanges(opts);
    } else {
    // fetch a filter from a design doc
        const filterName = parseDesignDocFunctionName(opts.filter);
        changesHandler.db.get(`_design/${filterName[0]}`, (err, ddoc) => {
            /* istanbul ignore if */
            if (changesHandler.isCancelled) {
                return callback(null, { status: "cancelled" });
            }
            /* istanbul ignore next */
            if (err) {
                return callback(x.generateErrorFromResponse(err));
            }
            const filterFun = ddoc && ddoc.filters && ddoc.filters[filterName[1]];
            if (!filterFun) {
                return callback(x.createError(x.MISSING_DOC,
                    ((ddoc && ddoc.filters) ? `missing json key: ${filterName[1]}`
                        : "missing json key: filters")));
            }
            opts.filter = evalFilter(filterFun);
            changesHandler.doChanges(opts);
        });
    }
};

export const plugin = (PouchDB) => {
    PouchDB._changesFilterPlugin = {
        validate,
        normalize,
        shouldFilter,
        filter
    };
};
