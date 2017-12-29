const {
    stream: { pull }
} = adone;

export default function concat(cb) {
    return pull.reduce((a, b) => {
        return a + b;
    }, "", cb);
}
