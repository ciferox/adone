const __ = adone.lazify({
    a: "./a",
    b: ["./b", (mod) => mod.b],
    c: ["./c", (mod) => mod.c]
}, exports, require, {
    mapper(key, mod) {
        require("./d");
    }
});
