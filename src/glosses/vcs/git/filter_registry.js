const {
    is,
    promise: { promisifyAll },
    vcs: { git }
} = adone;

const { native } = git;

const FilterRegistry = native.FilterRegistry;

const asyncRegister = promisifyAll(FilterRegistry.register);
const asyncUnregister = promisifyAll(FilterRegistry.unregister);

// register should add filter by name to dict and return
// Override FilterRegistry.register to normalize Filter
FilterRegistry.register = function (name, filter, priority, callback) {
    // setting default value of attributes
    if (is.undefined(filter.attributes)) {
        filter.attributes = "";
    }

    filter = git.Utils.normalizeOptions(filter, git.Filter);

    if (!filter.check || !filter.apply) {
        return callback(new Error(
            "ERROR: please provide check and apply callbacks for filter"
        ));
    }

    return asyncRegister(name, filter, priority).then((result) => {
        if (is.function(callback)) {
            callback(null, result);
        }
        return result;
    }, callback);
};

FilterRegistry.unregister = function (name, callback) {
    return asyncUnregister(name).then((result) => {
        if (is.function(callback)) {
            callback(null, result);
        }
        return result;
    }, callback);
};

export default FilterRegistry;
