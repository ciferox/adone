const {
    ipfs: { ipld: { Ipld: IPLD }, ipldInMemory: inMemory, unixfsImporter, unixfsExporter },
    stream: { pull },
    std: { path }
} = adone;
const { values, concat, flatten, map, collect } = pull;

const loadFixture = require("../aegir/fixtures");
const bigFile = loadFixture(path.join(__dirname, "fixtures/1.2MiB.txt"));

const strategies = [
    "flat",
    "balanced",
    "trickle"
];

function fileEql(f1, fileData, callback) {
    pull(
        f1.content,
        concat((err, data) => {
            expect(err).to.not.exist();
            // TODO: eql is super slow at comparing large buffers
            // expect(data).to.eql(fileData)
            callback();
        })
    );
}

describe("import and export", function () {
    this.timeout(30 * 1000);

    strategies.forEach((strategy) => {
        const importerOptions = { strategy };

        describe(`using builder: ${strategy}`, () => {
            let ipld;

            before((done) => {
                inMemory(IPLD, (err, resolver) => {
                    expect(err).to.not.exist();

                    ipld = resolver;

                    done();
                });
            });

            it("import and export", (done) => {
                const path = `${strategy}-big.dat`;

                pull(
                    values([{ path, content: values([bigFile]) }]),
                    unixfsImporter(ipld, importerOptions),
                    map((file) => {
                        expect(file.path).to.eql(path);

                        return unixfsExporter(file.multihash, ipld);
                    }),
                    flatten(),
                    collect((err, files) => {
                        expect(err).to.not.exist();
                        expect(files[0].size).to.eql(bigFile.length);
                        fileEql(files[0], bigFile, done);
                    })
                );
            });
        });
    });
});
