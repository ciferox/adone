import { createPool } from "../../common";

describe("glosses", "databases", "mysql", "functional", "regressions", "pool connection release", () => {
    let releaseCalls = 0;

    it("should not fail", async () => {
        const pool = await createPool();

        let connections = 0;

        pool.pool.on("connection", (conn) => {
            ++connections;
            const orig = conn.release;
            conn.release = () => {
                ++releaseCalls;
                return orig.call(conn);
            };
        });

        const [rows] = await pool.execute("select 1 + 2 as ttt");
        expect(rows[0].ttt).to.be.equal(3);
        await pool.end();
        expect(connections).to.be.equal(1);
        expect(releaseCalls).to.be.equal(1);
    });
});
