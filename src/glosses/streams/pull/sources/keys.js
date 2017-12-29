const {
    stream: { pull }
} = adone;

export default function (object) {
    return pull.values(Object.keys(object));
}
