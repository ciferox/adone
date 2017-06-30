import { createConnection, createServer } from "../../common";

describe("database", "mysql", "functional", "connection", "stream errors", () => {
    it("should work", async () => {
        let clientConnection = null;
        const err = new Error("This socket has been ended by the other party");
        err.code = "EPIPE";
        const server = await createServer((conn) => {
            conn.on("query", () => {
                conn.writeColumns([{
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
                }]
                );
                // emulate  stream error here
                clientConnection.stream.emit("error", err);
                clientConnection.stream.end();
                server.close();
            });
        });
        const { port } = server.address();
        clientConnection = await createConnection({ port, host: "localhost" });
        let e = clientConnection.query("SELECT 1").then(() => null, (e) => e);
        let e2 = clientConnection.query("second query, should not be executed").then(() => null, (e) => e);
        e = await e;
        expect(e).not.to.be.null;
        expect(e.fatal).to.be.true;
        expect(e.code).to.be.equal(err.code);

        e2 = await e2;
        expect(e2).not.to.be.null;
        expect(e2.fatal).to.be.true;
        expect(e2.code).to.be.equal(err.code);

        const e3 = await clientConnection.query("trying to enqueue command to a connection which is already in error state").then(() => null, (e) => e);
        expect(e3).not.to.be.null;
        expect(e3.fatal).to.be.true;
        expect(e3.message).to.be.equal("Can't add new command when connection is in closed state");
    });
});
