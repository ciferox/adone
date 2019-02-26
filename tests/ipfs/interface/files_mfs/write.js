const hat = require("hat");
const { getDescribe, getIt } = require("../utils/shani");

module.exports = (createCommon, options) => {
    const describe = getDescribe(options);
    const it = getIt(options);
    const common = createCommon();

    describe(".files.write", function () {
        this.timeout(40 * 1000);

        let ipfs;

        before(function (done) {
            // CI takes longer to instantiate the daemon, so we need to increase the
            // timeout for the before step
            this.timeout(60 * 1000);

            common.setup((err, factory) => {
                expect(err).to.not.exist();
                factory.spawnNode((err, node) => {
                    expect(err).to.not.exist();
                    ipfs = node;
                    done();
                });
            });
        });

        after((done) => common.teardown(done));

        it("should not write to non existent file, expect error", (done) => {
            const testDir = `/test-${hat()}`;

            ipfs.files.write(`${testDir}/a`, Buffer.from("Hello, world!"), (err) => {
                expect(err).to.exist();
                done();
            });
        });

        it("should write to non existent file with create flag", (done) => {
            const testPath = `/test-${hat()}`;

            ipfs.files.write(testPath, Buffer.from("Hello, world!"), { create: true }, (err) => {
                expect(err).to.not.exist();

                ipfs.files.stat(testPath, (err, stats) => {
                    expect(err).to.not.exist();
                    expect(stats.type).to.equal("file");
                    done();
                });
            });
        });

        it("should write to deeply nested non existent file with create and parents flags", (done) => {
            const testPath = `/foo/bar/baz/test-${hat()}`;

            ipfs.files.write(testPath, Buffer.from("Hello, world!"), { create: true, parents: true }, (err) => {
                expect(err).to.not.exist();

                ipfs.files.stat(testPath, (err, stats) => {
                    expect(err).to.not.exist();
                    expect(stats.type).to.equal("file");
                    done();
                });
            });
        });
    });
};
