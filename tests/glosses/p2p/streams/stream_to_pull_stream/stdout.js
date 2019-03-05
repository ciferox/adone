const {
    p2p: { stream: { pull, streamToPullStream } }
} = adone;

pull(
    pull.count(150),
    pull.map(() => {
        return {
            okay: true,
            date: new Date(),
            array: [1, 3, 4, 6, 7498, 49, 837, 9],
            nest: { foo: { bar: { baz: null } } },
            pkg: require("../package")
        };
    }),
    pull.map((e) => {
        return `${JSON.stringify(e, null, 2)}\n\n`;
    }),
    streamToPullStream.sink(process.stdout, (err) => {
        if (err) {
            throw err;
        }
        //    console.log('VALID END')
        process.exit();
    })
);