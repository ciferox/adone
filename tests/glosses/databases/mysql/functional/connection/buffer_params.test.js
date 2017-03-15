import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "buffer params", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    const buf = Buffer.from([0x80, 0x90, 1, 2, 3, 4, 5, 6, 7, 8, 9, 100, 100, 255, 255]);

    for (const method of ["execute", "query"]) {
        // eslint-disable-next-line
        specify(`using ${method}`, async () => {
            const [rows] = await connection[method]("SELECT HEX(?) as buf", [buf]);
            expect(rows).to.be.deep.equal([{ buf: buf.toString("hex").toUpperCase() }]);
        });
    }
});
