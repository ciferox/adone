const fs = adone.fs.base;
const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const p = require("path").resolve(__dirname, "files");

process.chdir(__dirname);

// Make sure to reserve the stderr fd
process.stderr.write("");

const num = 4097;
const paths = new Array(num);

it("make files", (done) => {
    rimraf.sync(p);
    mkdirp.sync(p);

    for (let i = 0; i < num; ++i) {
        paths[i] = `files/file-${i}`;
        fs.writeFileSync(paths[i], "content");
    }

    done();
});

it("read files", (done) => {
    // now read them
    expect(num).checks(done);
    for (let i = 0; i < num; ++i) {
        fs.readFile(paths[i], "ascii", (err, data) => {
            if (err) {
                throw err; 
            }

            expect(data).to.be.equal("content").mark();
        });
    }
});

it("cleanup", () => {
    rimraf.sync(p);
});
