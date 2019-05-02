const loadFixture = require("../../aegir/fixtures");

const fixturePath = (...args) => adone.path.join(__dirname, "..", "fixtures", ...args);

exports.fixtures = Object.freeze({
    files: Object.freeze([Object.freeze({
        data: loadFixture(fixturePath("testfile.txt")),
        cid: "Qma4hjFTnCasJ8PVp3mZbZK5g2vGDT4LByLJ7m8ciyRFZP"
    }), Object.freeze({
        data: loadFixture(fixturePath("test-folder/files/hello.txt")),
        cid: "QmY9cxiHqTFoWamkQVkpmmqzBrY3hCBEL2XNu3NtX74Fuu"
    })])
});
