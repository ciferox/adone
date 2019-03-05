const {
    stream: { pull2: pull }
} = adone;
const { pushable: Pushable, stringify, split } = pull;

const values = [
    { name: "air" },
    { name: "box" },
    { name: "cat" }
];

describe("stream", "pull", "stringify", () => {
    const testValues = function (done, through, expected) {
        pull(
            pull.values(values.slice()),
            through,
            pull.concat((err, actual) => {
                if (err) {
                    return done(err);
                }
                assert.equal(actual, expected);
                done();
            })
        );
    };

    it("stringify as default", (done) => {
        const expected = `{
  "name": "air"
}

{
  "name": "box"
}

{
  "name": "cat"
}

`;

        testValues(done, stringify(), expected);
    });

    it("stringify as array", (done) => {
        const expected = `[{
  "name": "air"
},
{
  "name": "box"
},
{
  "name": "cat"
}]
`;

        testValues(done, stringify.array(), expected);
    });

    it("stringify as ldjson", (done) => {
        const expected = `{"name":"air"}
{"name":"box"}
{"name":"cat"}
`;

        testValues(done, stringify.ldjson(), expected);
    });

    it("stringify delimits after value", (done) => {
        const pushable = Pushable();

        let i = 0;
        pull(
            pushable,
            stringify(),
            split("\n\n", (value) => {
                return value ? JSON.parse(value) : null;
            }),
            pull.drain((actual) => {
                const expected = values[i++];
                assert.deepEqual(actual, expected);

                if (i === values.length) {
                    pushable.end();
                    done();
                }
            })
        );

        Object.keys(values).forEach((index) => {
            pushable.push(values[index]);
        });
    });
});
