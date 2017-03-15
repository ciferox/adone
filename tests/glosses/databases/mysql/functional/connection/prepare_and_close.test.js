import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "prepare and close", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query("SET GLOBAL max_prepared_stmt_count=10");
    });

    after(async () => {
        if (connection) {
            await connection.query("SET GLOBAL max_prepared_stmt_count=16382");
            await connection.end();
        }
    });

    it("should not fail", async function test() {
        this.timeout(10000);

        for (let i = 0; i < 100; ++i) {
            // eslint-disable-next-line
            const stmt = await connection.prepare(`select 1+${i}`);
            stmt.close();
        }
    });
});
