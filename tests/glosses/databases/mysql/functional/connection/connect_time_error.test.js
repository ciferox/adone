describe("database", "mysql", "functional", "connection", "connect time error", () => {
    const { database: { mysql } } = adone;

    it("should throw error", (done) => {
        const ERROR_TEXT = "test error";
        const server = mysql.createServer();

        server.on("connection", (conn) => {
            conn.writeError(new Error(ERROR_TEXT));
            conn.close();
        });

        server.listen(0, () => {
            const { port } = server.address();

            const connection = mysql.createConnection({
                host: "localhost",
                port,
                user: "testuser",
                database: "testdatabase",
                password: "testpassword",
                promise: false
            });

            connection.query("select 1+1", (err) => {
                assert.equal(err.message, ERROR_TEXT);
            });

            connection.query("select 1+2", (err) => {
                assert.equal(err.message, ERROR_TEXT);
                connection.close();
                server._server.close(done);
            });
        });
    });
});
