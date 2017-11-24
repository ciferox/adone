const { promise } = adone;
const {
    dialect: {
        mssql: { ResourceLock }
    }
} = adone.orm;

describe("[MSSQL Specific] ResourceLock", () => {
    it("should process requests serially", () => {
        const expected = {};
        const lock = new ResourceLock(expected);
        let last = 0;

        const validateResource = (actual) => {
            assert.equal(actual, expected);
        };

        return Promise.all([
            lock.lock().then((resource) => {
                validateResource(resource);
                assert.equal(last, 0);
                last = 1;

                return promise.delay(15);
            }).then(() => lock.unlock()),
            lock.lock().then(() => lock.unlock()),
            lock.lock().then((resource) => {
                validateResource(resource);
                assert.equal(last, 1);
                last = 2;
                return lock.unlock();
            }),
            lock.lock().then((resource) => {
                validateResource(resource);
                assert.equal(last, 2);
                last = 3;

                return promise.delay(5);
            }).then(() => lock.unlock())
        ]);
    });

    it("should be able to.lock resource without waiting on lock", () => {
        const expected = {};
        const lock = new ResourceLock(expected);

        assert.equal(lock.unwrap(), expected);
    });
});
