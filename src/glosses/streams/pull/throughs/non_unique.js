const {
    stream: { pull }
} = adone;

//passes an item through when you see it for the second time.
export default function nonUnique(field) {
    return pull.unique(field, true);
}
