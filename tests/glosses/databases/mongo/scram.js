describe("scram", function () {
    if (this.topology !== "auth") {
        return;
    }

    const { database: { mongo } } = adone;

    it("should correctly authenticate against scram", async () => {
        const username = "test";
        const password = "test";

        let db = await mongo.connect(this.url());
        await db.admin().addUser(username, password);
        await db.close();

        // Attempt to reconnect authenticating against the admin database
        const url = this.url({ username, password, search: { authMechanism: "SCRAM-SHA-1", authSource: "admin", maxPoolSize: 5 } });
        db = await mongo.connect(url);
        expect(await db.collection("test").insert({ a: 1 })).to.be.ok();
        db.serverConfig.connections()[0].destroy();
        await new Promise((resolve) => db.serverConfig.once("reconnect", resolve));
        expect(await db.collection("test").insert({ a: 1 })).to.be.ok();
        await db.close();

        db = await mongo.connect(url);
        await db.admin().removeUser(username);
        await db.close();
    });
});
