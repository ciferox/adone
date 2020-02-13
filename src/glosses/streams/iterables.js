const core = {
    ...require("streaming-iterables")
};

adone.lazify({
    lengthPrefixed: "it-length-prefixed",
    pipe: "it-pipe",
    pushable: "it-pushable"
}, core, require);

export default adone.asNamespace(core);
