const loadFixture = require("../../aegir/fixtures");

const fixturePath = (...args) => adone.path.join(__dirname, "..", "fixtures", ...args);

exports.fixture = Object.freeze({
    data: loadFixture(fixturePath("testfile.txt")),
    cid: "Qma4hjFTnCasJ8PVp3mZbZK5g2vGDT4LByLJ7m8ciyRFZP"
});
