const { is } = adone;

export const compatibleInstance = (thrown, errorLike) => {
    return errorLike instanceof Error && thrown === errorLike;
};

export const compatibleConstructor = (thrown, errorLike) => {
    if (errorLike instanceof Error) {
        // If `errorLike` is an instance of any error we compare their constructors
        return thrown.constructor === errorLike.constructor || thrown instanceof errorLike.constructor;
    } else if (errorLike.prototype instanceof Error || errorLike === Error) {
        // If `errorLike` is a constructor that inherits from Error, we compare `thrown` to `errorLike` directly
        return thrown.constructor === errorLike || thrown instanceof errorLike;
    }

    return false;
};

export const compatibleMessage = (thrown, errMatcher) => {
    const comparisonString = is.string(thrown) ? thrown : thrown.message;
    if (errMatcher instanceof RegExp) {
        return errMatcher.test(comparisonString);
    } else if (is.string(errMatcher)) {
        return comparisonString.indexOf(errMatcher) !== -1; // eslint-disable-line no-magic-numbers
    }

    return false;
};

export const getConstructorName = (errorLike) => {
    let constructorName = errorLike;
    if (errorLike instanceof Error) {
        constructorName = adone.util.functionName(errorLike.constructor);
    } else if (is.function(errorLike)) {
        // If `err` is not an instance of Error it is an error constructor itself or another function.
        // If we've got a common function we get its name, otherwise we may need to create a new instance
        // of the error just in case it's a poorly-constructed error.
        constructorName = adone.util.functionName(errorLike);
        if (constructorName === "") {
            const newConstructorName = adone.util.functionName(new errorLike()); // eslint-disable-line babel/new-cap
            constructorName = newConstructorName || constructorName;
        }
    }

    return constructorName;
};

export const getMessage = (errorLike) => {
    let msg = "";
    if (errorLike && errorLike.message) {
        msg = errorLike.message;
    } else if (is.string(errorLike)) {
        msg = errorLike;
    }

    return msg;
};
