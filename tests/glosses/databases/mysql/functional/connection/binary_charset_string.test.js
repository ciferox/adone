import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "binary charset string", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    const query0 = "SELECT x'010203'";
    const query1 = "SELECT '010203'";

    specify("querying", async () => {
        let [rows, fields] = await connection.query(query0);
        assert.deepEqual(rows, [{ "x'010203'": Buffer.from([1, 2, 3]) }]);
        assert.equal(fields[0].name, "x'010203'");

        [rows, fields] = await connection.query(query1);
        assert.deepEqual(rows, [{ "010203": "010203" }]);
        assert.equal(fields[0].name, "010203");
    });

    specify("executing", async () => {
        let [rows, fields] = await connection.execute(query0, []);
        assert.deepEqual(rows, [{ "x'010203'": Buffer.from([1, 2, 3]) }]);
        assert.equal(fields[0].name, "x'010203'");

        [rows, fields] = await connection.execute(query1, []);
        assert.deepEqual(rows, [{ "010203": "010203" }]);
        assert.equal(fields[0].name, "010203");
    });
});
