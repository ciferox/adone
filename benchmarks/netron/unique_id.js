const {
    math: { Long },
    netron: { UniqueId, FastUniqueId }
} = adone;

let fastUniq;
let uniq;

export const init = () => {
    fastUniq = new FastUniqueId();
    uniq = new UniqueId();

    console.log("Maximum value of integer sequencer:", Number.MAX_SAFE_INTEGER >>> 0);
    console.log("Maximum value of long sequencer:", Long.MAX_UNSIGNED_VALUE.toString());
};

export default {
    "FastUniqueId"() {
        return fastUniq.get();
    },
    "UniqueId"() {
        return uniq.get();
    }
};
