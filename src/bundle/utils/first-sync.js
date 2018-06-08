// Return the first non-null or -undefined result from an array of
// sync functions
export default function firstSync(candidates) {
    return function (...args) {
        return candidates.reduce((result, candidate) => {
            return result != null ? result : candidate(...args);
        }, null);
    };
}
