const loadFixture = require("../../aegir/fixtures");

const fixturePath = (...args) => adone.std.path.join(__dirname, "..", "fixtures", ...args);

exports.fixtures = Object.freeze({
    directory: Object.freeze({
        cid: "QmVvjDy7yF7hdnqE8Hrf4MHo5ABDtb5AbX6hWbD3Y42bXP",
        files: Object.freeze({
            "pp.txt": loadFixture(fixturePath("test-folder/pp.txt")),
            "holmes.txt": loadFixture(fixturePath("test-folder/holmes.txt")),
            "jungle.txt": loadFixture(fixturePath("test-folder/jungle.txt")),
            "alice.txt": loadFixture(fixturePath("test-folder/alice.txt")),
            "files/hello.txt": loadFixture(fixturePath("test-folder/files/hello.txt")),
            "files/ipfs.txt": loadFixture(fixturePath("test-folder/files/ipfs.txt"))
        })
    }),
    smallFile: Object.freeze({
        cid: "Qma4hjFTnCasJ8PVp3mZbZK5g2vGDT4LByLJ7m8ciyRFZP",
        data: loadFixture(fixturePath("testfile.txt"))
    }),
    bigFile: Object.freeze({
        cid: "Qme79tX2bViL26vNjPsF3DP1R9rMKMvnPYJiKTTKPrXJjq",
        data: loadFixture(fixturePath("15mb.random"))
    }),
    sslOpts: Object.freeze({
        key: loadFixture(fixturePath("ssl/privkey.pem")),
        cert: loadFixture(fixturePath("ssl/cert.pem"))
    })
});
