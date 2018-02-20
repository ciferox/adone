const {
    is,
    database: { pouch },
    std: { vm }
} = adone;

const {
    error,
    plugin: { mapreduce }
} = pouch;

const createBuiltInError = (name) => {
    const message = `builtin ${name} function requires map values to be numbers or number arrays`;
    return error.createError(error.BUILT_IN, message);
};

// Inside of 'vm' for Node, we need a way to translate a pseudo-error
// back into a real error once it's out of the VM.
const createBuiltInErrorInVm = (name) => {
    return {
        builtInError: true,
        name
    };
};

const convertToTrueError = (err) => {
    return createBuiltInError(err.name);
};

const isBuiltInError = (obj) => {
    return obj && obj.builtInError;
};

// All of this vm hullaballoo is to be able to run arbitrary code in a sandbox
// for security reasons.
const evalFunction = (func, emit) => {
    return function (arg1, arg2, arg3) {
        const code = `${'(function() {"use strict";' +
            "var createBuiltInError = "}${createBuiltInErrorInVm.toString()};` +
            `var sum = ${sum.toString()};` +
            "var log = function () {};" +
            "var isArray = Array.isArray;" +
            "var toJSON = JSON.parse;" +
            "var __emitteds__ = [];" +
            "var emit = function (key, value) {__emitteds__.push([key, value]);};" +
            `var __result__ = (${func.replace(/;\s*$/, "")})` + `(${JSON.stringify(arg1)},${JSON.stringify(arg2)},${JSON.stringify(arg3)});` +
            "return {result: __result__, emitteds: __emitteds__};" +
            "})()";

        const output = vm.runInNewContext(code);

        output.emitteds.forEach((emitted) => {
            emit(emitted[0], emitted[1]);
        });
        if (isBuiltInError(output.result)) {
            output.result = convertToTrueError(output.result);
        }
        return output.result;
    };
};

const sum = (values) => {
    /* eslint-disable */
    var result = 0;
    for (var i = 0, len = values.length; i < len; i++) {
        var num = values[i];
        if (typeof num !== 'number') {
            if (Array.isArray(num)) {
                // lists of numbers are also allowed, sum them separately
                result = typeof result === 'number' ? [result] : result;
                for (var j = 0, jLen = num.length; j < jLen; j++) {
                    var jNum = num[j];
                    if (typeof jNum !== 'number') {
                        throw createBuiltInError('_sum');
                    } else if (typeof result[j] === 'undefined') {
                        result.push(jNum);
                    } else {
                        result[j] += jNum;
                    }
                }
            } else { // not array/number
                throw createBuiltInError('_sum');
            }
        } else if (typeof result === 'number') {
            result += num;
        } else { // add number to array
            result[0] += num;
        }
    }
    return result;
    /* eslint-enable */
};

const builtInReduce = {
    _sum(keys, values) {
        return sum(values);
    },

    _count(keys, values) {
        return values.length;
    },

    _stats(keys, values) {
        // no need to implement rereduce=true, because Pouch
        // will never call it
        const sumsqr = (values) => {
            let _sumsqr = 0;
            for (let i = 0, len = values.length; i < len; i++) {
                const num = values[i];
                _sumsqr += (num * num);
            }
            return _sumsqr;
        };
        return {
            sum: sum(values),
            min: Math.min.apply(null, values),
            max: Math.max.apply(null, values),
            count: values.length,
            sumsqr: sumsqr(values)
        };
    }
};

const getBuiltIn = (reduceFunString) => {
    if (/^_sum/.test(reduceFunString)) {
        return builtInReduce._sum;
    } else if (/^_count/.test(reduceFunString)) {
        return builtInReduce._count;
    } else if (/^_stats/.test(reduceFunString)) {
        return builtInReduce._stats;
    } else if (/^_/.test(reduceFunString)) {
        throw new Error(`${reduceFunString} is not a supported reduce function.`);
    }
};

const mapper = (mapFun, emit) => {
    // for temp_views one can use emit(doc, emit), see #38
    if (is.function(mapFun) && mapFun.length === 2) {
        const origMap = mapFun;
        return function (doc) {
            return origMap(doc, emit);
        };
    }
    return evalFunction(mapFun.toString(), emit);

};

const reducer = (reduceFun) => {
    const reduceFunString = reduceFun.toString();
    const builtIn = getBuiltIn(reduceFunString);
    if (builtIn) {
        return builtIn;
    }
    return evalFunction(reduceFunString);
};

const ddocValidator = (ddoc, viewName) => {
    const fun = ddoc.views && ddoc.views[viewName];
    if (!is.string(fun.map)) {
        throw error.createError(error.NOT_FOUND, `ddoc ${ddoc._id} has no string view named ${viewName}, instead found object of type: ${typeof fun.map}`);
    }
};

const localDocName = "mrviews";
const abstract = mapreduce.createAbstract(localDocName, mapper, reducer, ddocValidator);

const query = function (fun, opts, callback) {
    return abstract.query.call(this, fun, opts, callback);
};

const viewCleanup = function (callback) {
    return abstract.viewCleanup.call(this, callback);
};

export default {
    query,
    viewCleanup
};
