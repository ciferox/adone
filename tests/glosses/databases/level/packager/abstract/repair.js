const location = require("./location");

module.exports = function (level) {
    it("test repair", (done) => {
        level.repair(location, (err) => {
            assert.notOk(err, "no error");
            done();
        });
    });
};
