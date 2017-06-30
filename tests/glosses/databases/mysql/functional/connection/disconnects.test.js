import { createConnection, createServer } from "../../common";

describe("database", "mysql", "functional", "connection", "disconnects", () => {
    it("should handle disconnects", async () => {
        const connections = [];
        const server = await createServer((conn) => {
            conn.on("query", () => {
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
                connections.push(conn);
            });
        });

        const { port } = server.address();
        const connection = await createConnection({ port, host: "localhost" });

        const [rows, fields] = await connection.query("SELECT 123");
        expect(rows).to.be.deep.equal([{ 1: 1 }]);
        expect(fields[0].name).to.be.equal("1");

        let err = null;
        connection.on("error", (_err) => {
            err = _err;
        });
        connections.forEach((x) => x.stream.end());

        await new Promise((resolve) => server.close(resolve));
        expect(err).not.to.be.null;
        expect(err.code).to.be.equal("PROTOCOL_CONNECTION_LOST");
    });
});
