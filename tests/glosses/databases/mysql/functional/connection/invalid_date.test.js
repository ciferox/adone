import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "invalid date", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should handle it", async () => {
        const [rows] = await connection.execute("SELECT TIMESTAMP(0000-00-00) t", []);
        expect(rows[0].t).to.be.a("date");
        expect(isNaN(rows[0].t.getTime())).to.be.true();
    });
});
