const {
    is
} = adone;

// Return the first non-null or -undefined result from an array of
// maybe-sync, maybe-promise-returning functions
export default function first(candidates) {
    return function (...args) {
        return candidates.reduce((promise, candidate) => {
            return promise.then((result) => !is.nil(result) ? result : Promise.resolve(candidate(...args)));
        }, Promise.resolve());
    };
}
