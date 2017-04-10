export const setUp = function (testCommon) {
    describe("open()", () => {
        it("setUp", testCommon.setUp);
    });
};

export const open = function (leveldown, testCommon) {
    describe("open()", () => {
        it("test database open, no options", async () => {
            const db = leveldown(testCommon.location());
            await db.open();
            await db.close();
        });

        it("test database open, options and callback", async () => {
            const db = leveldown(testCommon.location());

            await db.open({});
            await db.close();
        });

        it("test database open, close and open", async () => {
            const db = leveldown(testCommon.location());

            await db.open();
            await db.close();
            await db.open();
            await db.close();
        });
    });
};

export const openAdvanced = function (leveldown, testCommon) {
    describe("open()", () => {
        it("test database open createIfMissing:false", async () => {
            const db = leveldown(testCommon.location());

            try {
                await db.open({ createIfMissing: false });
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("Should have thrown");
        });

        it("test database open errorIfExists:true", async () => {
            const location = testCommon.location();
            let db = leveldown(location);

            // make a valid database first, then close and dispose
            await db.open({});
            await db.close();
            // open again with 'errorIfExists'
            db = leveldown(location);
            try {
                await db.open({ createIfMissing: false, errorIfExists: true });
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("Should have thrown");
        });
    });
};

export const tearDown = function (testCommon) {
    describe("open()", () => {
        it("tearDown", testCommon.tearDown);
    });
};

export const all = function (leveldown, testCommon) {
    setUp(testCommon);
    open(leveldown, testCommon);
    openAdvanced(leveldown, testCommon);
    tearDown(testCommon);
};
