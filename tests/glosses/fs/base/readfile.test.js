const fs = adone.fs2.base;
const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const p = require("path").resolve(__dirname, "files");

process.chdir(__dirname);

// Make sure to reserve the stderr fd
process.stderr.write("");

const num = 4097;
const paths = new Array(num);

it("write files", (done) => {
    rimraf.sync(p);
    mkdirp.sync(p);

    expect(num).checks(done);
    for (let i = 0; i < num; ++i) {
        paths[i] = `files/file-${i}`;
        fs.writeFile(paths[i], "content", "ascii", (er) => {
            if (er) {
                throw er; 
            }
            expect(true).to.be.ok.mark();
        });
    }
});

it("read files", (done) => {
    // now read them
    expect(num).checks(done);
    for (let i = 0; i < num; ++i) {
        fs.readFile(paths[i], "ascii", (er, data) => {
            if (er) {
                throw er; 
            }
            expect(data).to.be.equal("content").mark();
        });
    }
});

it("cleanup", () => {
    rimraf.sync(p);
});
