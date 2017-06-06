import { createPool } from "../common";

describe("glosses", "databases", "mysql", "functional", "pool release", () => {
    it("should release connections", async () => {
        const pool = createPool();

        await assert.throws(async () => {
            await pool.query("test sql");
        });

        await assert.throws(async () => {
            await pool.query("test sql", []);
        });

        await assert.throws(async () => {
            await pool.query("test sql", []);
        });

        await assert.throws(async () => {
            await pool.query("test sql", []);
        });

        await assert.throws(async () => {
            await pool.query("test sql");
        });

        await new Promise((resolve) => {
            pool.pool.query("test sql").once("error", resolve);
        });

        await assert.throws(async () => {
            await pool.query("test sql");
        });

        await assert.throws(async () => {
            await pool.execute("test sql");
        });
        await assert.throws(async () => {
            await pool.execute("test sql");
        });

        await assert.throws(async () => {
            await pool.execute("test sql", []);
        });

        await assert.throws(async () => {
            await pool.execute("test sql", []);
        });

        await assert.throws(async () => {
            await pool.execute("test sql", []);
        });

        // TODO change order events are fires so that connection is released before callback
        // that way this number will be more deterministic
        assert(pool.pool._allConnections.length < 3);
        assert(pool.pool._freeConnections.length === 1);
        assert(pool.pool._connectionQueue.length === 0);
        pool.end();
    });
});
