import { createConnection, createServer } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "quit", () => {
    const { promise } = adone;

    it("should work", async () => {
        const defer = promise.defer();
        let queryServ = null;
        const server = await createServer((conn) => {
            conn.on("quit", () => {
                // COM_QUIT
                defer.resolve();
                conn.stream.end();
                server.close();
            });
            conn.on("query", (q) => {
                queryServ = q;
                conn.writeTextResult([{ 1: "1" }], [{
                    catalog: "def",
                    schema: "",
                    table: "",
                    orgTable: "",
                    name: "1",
                    orgName: "",
                    characterSet: 63,
                    columnLength: 1,
                    columnType: 8,
                    flags: 129,
                    decimals: 0
                }]);
            });
        });
        const { port } = server.address();
        const connection = await createConnection({ port, host: "localhost" });
        const [rows, fields] = await connection.query("SELECT 1");
        await connection.end();
        await defer.promise;
        expect(rows).to.be.deep.equal([{ 1: 1 }]);
        expect(fields[0].name).to.be.equal("1");
        expect(queryServ).to.be.equal("SELECT 1");
    });
});
