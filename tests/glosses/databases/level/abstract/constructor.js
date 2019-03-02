module.exports = function (testCommon) {
    it("setUp common", testCommon.setUp);

    it("test database open method exists", () => {
        const db = testCommon.factory();
        assert.ok(db, "database object returned");
        assert.isFunction(db.open, "open() function exists");
    });

    it("tearDown", testCommon.tearDown);
};
