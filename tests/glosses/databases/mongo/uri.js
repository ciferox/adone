describe("uri", function () {
    if (this.topology !== "single") {
        return;
    }

    const { is, database: { mongo } } = adone;

    it("should correctly connect using MongoClient to a single server using connect with optional server setting", async () => {
        const db = await mongo.connect(this.url(), {
            server: {
                socketOptions: {
                    connectTimeoutMS: 500
                }
            }
        });
        expect(db.serverConfig.connections()[0].connectionTimeout).to.be.equal(500);
        const r = await db.collection("mongoclient_test0").update({ a: 1 }, { b: 1 }, { upsert: true });
        expect(r.result.n).to.be.equal(1);
        await db.close();
    });

    it("should correctly allow for w:0 overriding on the connect url", async () => {
        const db = await mongo.connect(this.url({ search: { w: 0 } }));
        const r = await db.collection("mongoclient_test1").update({ a: 1 }, { b: 1 }, { upsert: true });
        expect(r.result.ok).to.be.equal(1);
        await db.close();
    });

    it("should correctly connect via normal url using connect", async () => {
        const db = await mongo.connect("mongodb://localhost/?safe=false");
        await db.close();
    });

    it("should correctly connect via domain socket", async function () {
        if (is.windows) {
            this.skip();
            return;
        }
        const db = await mongo.connect(`mongodb:///tmp/mongodb-${this.port}.sock?safe=false`);
        const r = await db.collection("mongoclient_test2").update({ a: 1 }, { b: 1 }, { upsert: true });
        expect(r.result.ok).to.be.equal(1);
        await db.close();
    });

    it("should correctly connect via normal url journal option", async () => {
        const db = await mongo.connect(this.url({ search: { journal: true } }));
        expect(db.writeConcern.j).to.be.true;
        await db.close();
    });

    it("should correctly connect via normal url using ip", async () => {
        const db = await mongo.connect("mongodb://127.0.0.1:27017/?fsync=true");
        expect(db.writeConcern.fsync).to.be.true;
        await db.close();
    });

    it("should correctly connect via normal url setting up poolsize of 1", async () => {
        const db = await mongo.connect("mongodb://127.0.0.1:27017/?maxPoolSize=1");
        expect(db.serverConfig.connections()).to.have.lengthOf(1);
        expect(db.databaseName).to.be.equal("admin");
        await db.close();
    });

    it("should correctly connect using uri encoded username and password", async () => {
        let db = await mongo.connect(this.url());
        const user = "u$ser";
        const pass = "$specialch@rs";

        await db.addUser(user, pass);
        await db.close();
        const uri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${this.host}:${this.port}/${this.database}`;
        db = await mongo.connect(uri);
        await db.close();
    });
});
