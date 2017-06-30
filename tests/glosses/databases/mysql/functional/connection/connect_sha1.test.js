describe("database", "mysql", "functional", "connection", "connect sha1", () => {
    const { database: { mysql } } = adone;

    it("should connect using sha1 password", (done) => {
        let queryCalls = 0;

        const server = mysql.createServer();

        server.on("connection", (conn) => {
            conn.serverHandshake({
                protocolVersion: 10,
                serverVersion: "node.js rocks",
                connectionId: 1234,
                statusFlags: 2,
                characterSet: 8,
                capabilityFlags: 0xFFFFFF,
                authCallback: (params, cb) => {
                    const doubleSha = mysql.auth.doubleSha1("testpassword");
                    const isValid = mysql.auth.verifyToken(
                        params.authPluginData1,
                        params.authPluginData2,
                        params.authToken,
                        doubleSha
                    );
                    expect(isValid).to.be.true;
                    cb(null);
                }
            });

            conn.on("query", (sql) => {
                expect(sql).to.be.equal("select 1+1");
                queryCalls++;
                conn.close();
            });
        });

        server.listen(0, () => {
            const { port } = server.address();

            const connection = mysql.createConnection({
                port,
                user: "testuser",
                database: "testdatabase",
                passwordSha1: Buffer.from("8bb6118f8fd6935ad0876a3be34a717d32708ffd", "hex"),
                promise: false
            });

            connection.on("error", (err) => {
                expect(err.code).to.be.equal("PROTOCOL_CONNECTION_LOST");
            });

            let haveResponse = 0;

            connection.query("select 1+1", (err) => {
                expect(err.code).to.be.equal("PROTOCOL_CONNECTION_LOST");
                server._server.close();
                ++haveResponse;
            });

            connection.query("select 1+2", (err) => {
                expect(err.code).to.be.equal("PROTOCOL_CONNECTION_LOST");
                ++haveResponse;
            });

            connection.query("select 1+3", (err) => {
                expect(err.code).to.be.equal("PROTOCOL_CONNECTION_LOST");
                ++haveResponse;
                expect(queryCalls).to.be.equal(1);
                expect(haveResponse).to.be.equal(3);
                done();
            });
        });
    });
});
