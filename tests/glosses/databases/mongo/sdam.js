describe("sdam", function () {
    const { database: { mongo }, promise } = adone;

    if (this.topology === "replicaset") {
        it("should correctly emit all Replicaset SDAM operations", async () => {
            const operations = {
                serverDescriptionChanged: [],
                serverHeartbeatStarted: [],
                serverHeartbeatSucceeded: [],
                serverOpening: [],
                serverClosed: [],
                topologyOpening: [],
                topologyDescriptionChanged: [],
                topologyClosed: []
            };

            const client = new mongo.MongoClient();

            const events = [
                "serverDescriptionChanged",
                "serverHeartbeatStarted",
                "serverHeartbeatSucceeded",
                "serverOpening",
                "serverClosed",
                "topologyOpening",
                "topologyDescriptionChanged",
                "topologyClosed"
            ];
            events.forEach((e) => {
                client.on(e, (result) => {
                    operations[e].push(result);
                });
            });

            const [topology] = await Promise.all([
                new Promise((resolve) => client.once("fullsetup", resolve)),
                client.connect(this.url())
            ]);
            topology.close(true);
            for (const name in operations) {
                expect(operations[name]).not.to.be.empty();
            }
        });
    }

    if (this.topology === "sharded") {
        it("should correctly emit all Mongos SDAM operations", async () => {
            const operations = {
                serverDescriptionChanged: [],
                serverHeartbeatStarted: [],
                serverHeartbeatSucceeded: [],
                serverOpening: [],
                serverClosed: [],
                topologyOpening: [],
                topologyDescriptionChanged: [],
                topologyClosed: []
            };

            const client = new mongo.MongoClient();

            const events = [
                "serverDescriptionChanged",
                "serverHeartbeatStarted",
                "serverHeartbeatSucceeded",
                "serverOpening",
                "serverClosed",
                "topologyOpening",
                "topologyDescriptionChanged",
                "topologyClosed"
            ];
            events.forEach((e) => {
                client.on(e, (result) => {
                    operations[e].push(result);
                });
            });

            const [topology] = await Promise.all([
                new Promise((resolve) => client.once("fullsetup", resolve)),
                client.connect(this.url(), { haInterval: 500 })
            ]);
            await promise.delay(1000);
            topology.close(true);
            for (const name in operations) {
                expect(operations[name]).not.to.be.empty();
            }
        });
    }

    if (this.topology === "single") {
        it("should correctly emit all Server SDAM operations", async () => {
            const operations = {
                serverDescriptionChanged: [],
                serverOpening: [],
                serverClosed: [],
                topologyOpening: [],
                topologyDescriptionChanged: [],
                topologyClosed: []
            };

            const client = new mongo.MongoClient();
            const events = [
                "serverDescriptionChanged",
                "serverOpening",
                "serverClosed",
                "topologyOpening",
                "topologyDescriptionChanged",
                "topologyClosed"
            ];
            events.forEach((e) => {
                client.on(e, (result) => {
                    operations[e].push(result);
                });
            });
            const db = await client.connect(this.url());
            db.close(true);
            for (const name in operations) {
                expect(operations[name]).not.to.be.empty();
            }
        });
    }
});
