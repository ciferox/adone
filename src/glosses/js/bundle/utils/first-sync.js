const {
    is
} = adone;

// Return the first non-null or -undefined result from an array of
// sync functions
export default function firstSync(candidates) {
    return function (...args) {
        return candidates.reduce((result, candidate) => {
            return !is.nil(result) ? result : candidate(...args);
        }, null);
    };
}
