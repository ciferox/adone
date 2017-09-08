const {
    database: { pouch }
} = adone;

const {
    plugin: { mapreduce }
} = pouch;

const {
    util: {
        selector: { parseField }
    }
} = adone.private(pouch);

//
// One thing about these mappers:
//
// Per the advice of John-David Dalton (http://youtu.be/NthmeLEhDDM),
// what you want to do in this case is optimize for the smallest possible
// function, since that's the thing that gets run over and over again.
//
// This code would be a lot simpler if all the if/elses were inside
// the function, but it would also be a lot less performant.
//

const createDeepMultiMapper = (fields, emit) => {
    return function (doc) {
        const toEmit = [];
        for (let i = 0, iLen = fields.length; i < iLen; i++) {
            const parsedField = parseField(fields[i]);
            let value = doc;
            for (let j = 0, jLen = parsedField.length; j < jLen; j++) {
                const key = parsedField[j];
                value = value[key];
                if (!value) {
                    return; // don't emit
                }
            }
            toEmit.push(value);
        }
        emit(toEmit);
    };
};

const createDeepSingleMapper = (field, emit) => {
    const parsedField = parseField(field);
    return function (doc) {
        let value = doc;
        for (let i = 0, len = parsedField.length; i < len; i++) {
            const key = parsedField[i];
            value = value[key];
            if (!value) {
                return; // do nothing
            }
        }
        emit(value);
    };
};

const createShallowSingleMapper = (field, emit) => {
    return function (doc) {
        emit(doc[field]);
    };
};

const createShallowMultiMapper = (fields, emit) => {
    return function (doc) {
        const toEmit = [];
        for (let i = 0, len = fields.length; i < len; i++) {
            toEmit.push(doc[fields[i]]);
        }
        emit(toEmit);
    };
};

const checkShallow = (fields) => {
    for (let i = 0, len = fields.length; i < len; i++) {
        const field = fields[i];
        if (field.indexOf(".") !== -1) {
            return false;
        }
    }
    return true;
};

const createMapper = (fields, emit) => {
    const isShallow = checkShallow(fields);
    const isSingle = fields.length === 1;

    // notice we try to optimize for the most common case,
    // i.e. single shallow indexes
    if (isShallow) {
        if (isSingle) {
            return createShallowSingleMapper(fields[0], emit);
        } // multi
        return createShallowMultiMapper(fields, emit);

    } // deep
    if (isSingle) {
        return createDeepSingleMapper(fields[0], emit);
    } // multi
    return createDeepMultiMapper(fields, emit);
};

const mapper = (mapFunDef, emit) => {
    // mapFunDef is a list of fields

    const fields = Object.keys(mapFunDef.fields);

    return createMapper(fields, emit);
};

/* istanbul ignore next */
const reducer = (/*reduceFunDef*/) => {
    throw new Error("reduce not supported");
};

const ddocValidator = (ddoc, viewName) => {
    const view = ddoc.views[viewName];
    // This doesn't actually need to be here apparently, but
    // I feel safer keeping it.
    /* istanbul ignore if */
    if (!view.map || !view.map.fields) {
        throw new Error(`ddoc ${ddoc._id} with view ${viewName
        } doesn't have map.fields defined. ` +
            "maybe it wasn't created by this plugin?");
    }
};

const abstractMapper = mapreduce.createAbstract(
    /* localDocName */ "indexes",
    mapper,
    reducer,
    ddocValidator
);

export default abstractMapper;
