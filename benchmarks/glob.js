import nodeglob from "glob";

const {
    fs: {
        engine: {
            StandardEngine,
            MemoryEngine
        },
        glob
    }
} = adone;


const fs = new StandardEngine()
    .mount(
        new MemoryEngine()
            .add((ctx) => ({
                a: {
                    ".abcdef/x/y/z": {
                        a: ctx.file("a")
                    },
                    "abcdef/g": {
                        h: ctx.file("a")
                    },
                    "b/c": {
                        d: ctx.file("d")
                    },
                    "bc/e": {
                        f: ctx.file("a")
                    },
                    "c/d/c": {
                        b: ctx.file("a")
                    },
                    "cb/e": {
                        f: ctx.file("a")
                    },
                    "symlink/a/b": {
                        c: ctx.symlink("../..")
                    },
                    "{x,y}/.y": {
                        b: ctx.file("hello")
                    }
                },
                b: ctx.file("hello"),
                c: ctx.file("hello"),
                "nested/{1..5}/{1..2}": {
                    "{a..f}": ctx.file("hello")
                },
                alotfilesinside: {
                    "{a..z}{1..10}": ctx.file("hello")
                }
            })),
        "/virtual"
    );

fs.mock(adone.std.fs);

const patterns = [
    "/virtual/**/*",
    "/virtual/b",
    "/virtual/e",
    "/virtual/*",
    "/virtual/alotfilesinside/*",
    "/virtual/*/",
    "/virtual/alotfilesinside/*/",
    "/virtual/**/2/**/*",
    "/virtual/*/*",
    "/virtual/**/{c*,*b}/*",
    "/virtual/{*,nested/**}/*",
    "/virtual/nested/**/{1,5}/*",
    "/virtual/nested/{1,5}/1",
    "/virtual/**/*c*",
    "/virtual/**/b/c/*"
];

export default (() => {
    const suites = {};
    for (const pattern of patterns) {
        suites[pattern] = {
            "node glob": [(defer) => {
                const g = nodeglob(pattern);
                g.on("end", () => {
                    /**
                     * nextTick because node glob uses "inflight"
                     * which cache is cleared only after the end event
                     * if we dont, nodeglob will be able to use the previous cache
                     */
                    process.nextTick(() => defer.resolve());
                });
            }, {
                defer: true
            }],
            "adone glob emitter": [(defer) => {
                const g = new glob.Glob(pattern).resume();
                g.on("end", () => {
                    process.nextTick(() => defer.resolve());
                });
            }, {
                defer: true
            }],
            "adone glob core stream": [(defer) => {
                glob(pattern).done(() => {
                    process.nextTick(() => defer.resolve());
                });
            }, {
                defer: true
            }]
        };
    }
    return suites;
})();
