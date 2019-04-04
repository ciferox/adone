adone.lazify({
    a: "./a",
    b: ["./b", (mod) => mod.b],
    bb: ["./b", (mod) => mod.bb]
}, exports, require, {
    mapper(key, mod) {
        require("d");
    }
});
