const {
    stream: { pull }
} = adone;

export default function collect(cb) {
    return pull.reduce((arr, item) => {
        arr.push(item);
        return arr;
    }, [], cb);
}
