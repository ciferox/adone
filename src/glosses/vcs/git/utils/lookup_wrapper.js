const { is } = adone;
/**
* Wraps a method so that you can pass in either a string, OID or the object
* itself and you will always get back a promise that resolves to the object.
* @param {Object} objectType The object type that you're expecting to receive.
* @param {Function} lookupFunction  The function to do the lookup for the
*                                   object. Defaults to `objectType.lookup`.
* @return {Function}
*/
export default function lookupWrapper(objectType, lookupFunction) {
    lookupFunction = lookupFunction || objectType.lookup;

    return function (repo, id, callback) {
        if (id instanceof objectType) {
            return Promise.resolve(id).then((obj) => {
                obj.repo = repo;

                if (is.function(callback)) {
                    callback(null, obj);
                }

                return obj;
            }, callback);
        }

        return lookupFunction(repo, id).then((obj) => {
            obj.repo = repo;

            if (is.function(callback)) {
                callback(null, obj);
            }

            return obj;
        }, callback);
    };
}
