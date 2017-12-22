import { createConnection, createServer } from "../../common";

describe("database", "mysql", "functional", "connection", "protocol errors", () => {
    it("should throw unexepcted packet", async () => {
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
                // this is extra (incorrect) packet - client should emit error on receiving it
                conn.writeOk();
            });
        });
        const { port } = server.address();
        const connection = await createConnection({ port, host: "localhost" });
        const [err, rows, fields] = await new Promise((resolve, reject) => {
            let err = null;
            connection.connection.query("SELECT 1", (_err, rows, fields) => {
                if (_err) {
                    reject(_err);
                    return;
                }
                resolve([err, rows, fields]);
            });
            connection.once("error", (_err) => {
                err = _err;
                server.close();
            });
        });
        expect(err).to.be.ok();
        expect(err.message).to.be.equal("Unexpected packet while no commands in the queue");
        expect(err.fatal).to.be.true();
        expect(err.code).to.be.equal("PROTOCOL_UNEXPECTED_PACKET");
        expect(rows).to.be.deep.equal([{ 1: 1 }]);
        expect(fields[0].name).to.be.equal("1");
    });
});
