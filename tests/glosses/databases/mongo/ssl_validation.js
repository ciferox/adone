import { ReplSet as ReplSetManager } from "mongodb-topology-manager";

describe("ssl validation", function () {
    if (this.topology !== "ssl") {
        return;
    }

    const { database: { mongo }, fs } = adone;
    const { ReplSet, Server, Db } = mongo;

    const replicaSet = "rs";

    const caFile = new fs.File(__dirname, "ssl", "rootCA.crt");
    const caPath = caFile.path();
    const ca = caFile.contentSync();
    const clientKey = new fs.File(__dirname, "ssl", "client.key").contentSync();
    const clientCert = new fs.File(__dirname, "ssl", "client.crt").contentSync();
    const clientNoPassKey = new fs.File(__dirname, "ssl", "client_no_pass.key").contentSync();
    const clientNoPassCert = new fs.File(__dirname, "ssl", "client_no_pass.crt").contentSync();
    const selfKey = new fs.File(__dirname, "ssl", "self.key").contentSync();
    const selfCert = new fs.File(__dirname, "ssl", "self.crt").contentSync();
    const selfPEM = new fs.File(__dirname, "ssl", "self.pem").contentSync();
    const localhostKey = new fs.File(__dirname, "ssl", "localhost.key").contentSync();
    const localhostCert = new fs.File(__dirname, "ssl", "localhost.crt").contentSync();
    const localhostPEMPath = new fs.File(__dirname, "ssl", "localhost.pem").path();
    const crlPEMPath = new fs.File(__dirname, "ssl", "crl.pem").path();

    const setup = async (options) => {
        let rsOptions;
        // Override options
        if (options) {
            rsOptions = options;
        } else {
            rsOptions = {
                server: {
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                },
                client: {
                    replSet: "rs",
                    ssl: true,
                    rejectUnauthorized: false,
                    key: localhostKey,
                    cert: localhostCert,
                    host: "localhost"
                }
            };
        }

        const nodes = [{
            options: {
                bind_ip: "localhost",
                port: 33000,
                dbpath: (await this.tmpdir.addDirectory("33000")).path()
            }
        }, {
            options: {
                bind_ip: "localhost",
                port: 33001,
                dbpath: (await this.tmpdir.addDirectory("33001")).path()
            }
        }, {
            options: {
                bind_ip: "localhost",
                port: 33002,
                dbpath: (await this.tmpdir.addDirectory("33002")).path()
            }
        }];

        for (let i = 0; i < nodes.length; i++) {
            for (const name in rsOptions.server) {
                nodes[i].options[name] = rsOptions.server[name];
            }
        }

        const replicasetManager = new ReplSetManager("mongod", nodes, rsOptions.client);

        await replicasetManager.purge();
        await replicasetManager.start();

        return replicasetManager;
    };

    it("should fail due presenting wrong credentials to server", async () => {
        const manager = await setup();
        const replSet = new ReplSet([
            new Server("localhost", 33001, { autoReconnect: true }),
            new Server("localhost", 33000, { autoReconnect: true })
        ], {
            replicaSet,
            poolSize: 5,
            ssl: true,
            sslValidate: true,
            sslCA: ca,
            sslKey: selfKey,
            sslCert: selfCert
        });
        const db = new Db("foo", replSet);
        await assert.throws(async () => {
            await db.open();
        });
        await manager.stop();
    });

    it("should correctly receive ping and ha events using ssl", async () => {
        const manager = await setup();
        const replSet = new ReplSet([
            new Server("localhost", 33001, { autoReconnect: true }),
            new Server("localhost", 33000, { autoReconnect: true })
        ], {
            replicaSet,
            poolSize: 5,
            ssl: true,
            sslValidate: true,
            sslCA: ca,
            sslKey: clientNoPassKey,
            sslCert: clientNoPassCert
        });
        const db = new Db("foo", replSet);
        await db.open();
        const heartbeat = spy();
        db.serverConfig.once("serverHeartbeatSucceeded", heartbeat);
        await heartbeat.waitForCall();
        await db.close();
        await manager.stop();
    });

    it("should fail to validate server ssl certificate", async () => {
        const manager = await setup();
        const replSet = new ReplSet([
            new Server("localhost", 33001, { autoReconnect: true }),
            new Server("localhost", 33000, { autoReconnect: true })
        ], {
            replicaSet,
            ssl: true,
            sslValidate: true,
            sslCA: ca,
            poolSize: 1
        });
        const db = new Db("foo", replSet);
        await assert.throws(async () => {
            await db.open();
        });
        await manager.stop();
    });

    it("should correctly validate and present certificate ReplSet", async () => {
        const manager = await setup();
        const replSet = new ReplSet([
            new Server("localhost", 33001, { autoReconnect: true }),
            new Server("localhost", 33000, { autoReconnect: true })
        ], {
            replicaSet,
            ssl: true,
            sslValidate: true,
            sslCA: ca,
            sslKey: clientNoPassKey,
            sslCert: clientNoPassCert
        });
        const db = new Db("foo", replSet);
        await db.open();
        const collection = await db.createCollection("shouldCorrectlyValidateAndPresentCertificateReplSet1");
        await collection.remove();
        await collection.insert([{ a: 1 }, { b: 2 }, { c: "hello world" }]);
        expect(await collection.find().toArray()).to.have.lengthOf(3);
        await db.close();
        await manager.stop();
    });

    it("should correctly connect to ssl based replicaset", async () => {
        const manager = await setup({
            server: {
                sslMode: "requireSSL",
                sslPEMKeyFile: localhostPEMPath
            },
            client: {
                ssl: true,
                host: "localhost",
                replSet: "rs",
                key: clientKey,
                ca, clientCert,
                passphrase: "ciferox",
                rejectUnauthorized: false
            }
        });
        const replSet = new ReplSet([
            new Server("localhost", 33001, { autoReconnect: true }),
            new Server("localhost", 33000, { autoReconnect: true })
        ], {
            replicaSet,
            ssl: true,
            sslValidate: true,
            sslCA: ca
        });
        const db = new Db("foo", replSet, { w: 0 });
        await db.open();
        expect(await db.collection("test").count()).to.be.equal(0);
        await db.close();
        await manager.stop();
    });

    it("should fail to validate server ssl certificate", async () => {
        const manager = await setup();
        const replSet = new ReplSet([
            new Server("localhost", 33001, { autoReconnect: true }),
            new Server("localhost", 33000, { autoReconnect: true })
        ], {
            replicaSet,
            ssl: true,
            sslValidate: true,
            sslCA: selfPEM,
            poolSize: 5
        });
        const db = new Db("foo", replSet, { w: 0 });
        await assert.throws(async () => {
            await db.open();
        });
        await manager.stop();
    });

    it("should fail due to not presenting certificate to server", async () => {
        const manager = await setup();
        const replSet = new ReplSet([
            new Server("localhost", 33001, { autoReconnect: true }),
            new Server("localhost", 33000, { autoReconnect: true })
        ], {
            replicaSet,
            ssl: true,
            sslValidate: true,
            sslCA: ca,
            sslCert: selfCert,
            poolSize: 1
        });
        const db = new Db("foo", replSet);
        await assert.throws(async () => {
            await db.open();
        });
        await manager.stop();
    });

    it("should correctly present password protected certificate", async () => {
        const manager = await setup({
            server: {
                sslPEMKeyFile: localhostPEMPath,
                sslCAFile: caPath,
                sslCRLFile: crlPEMPath,
                sslMode: "requireSSL"
            },
            client: {
                host: "localhost",
                ssl: true,
                ca,
                key: clientKey,
                cert: clientCert,
                rejectUnauthorized: true,
                passphrase: "ciferox",
                replSet: "rs"
            }
        });
        const replSet = new ReplSet([
            new Server("localhost", 33001, { autoReconnect: true }),
            new Server("localhost", 33000, { autoReconnect: true })
        ], {
            replicaSet,
            ssl: true,
            sslValidate: true,
            sslCA: ca,
            sslKey: clientKey,
            sslCert: clientCert,
            sslPass: "ciferox",
            poolSize: 1
        });
        const db = new Db("foo", replSet);
        await db.open();
        const collection = await db.createCollection("shouldCorrectlyValidateAndPresentCertificate2");
        await collection.remove();
        await collection.insert([{ a: 1 }, { b: 2 }, { c: "hello world" }]);
        expect(await collection.find({}).toArray()).to.have.lengthOf(3);
        await db.close();
        await manager.stop();
    });

    it("should correctly validate server ssl certificate", async () => {
        const manager = await setup({
            server: {
                sslPEMKeyFile: localhostPEMPath,
                sslMode: "requireSSL"
            },
            client: {
                host: "localhost",
                ssl: true,
                rejectUnauthorized: false,
                replSet: "rs"
            }
        });
        const replSet = new ReplSet([
            new Server("localhost", 33001, { autoReconnect: true }),
            new Server("localhost", 33000, { autoReconnect: true })
        ], {
            replicaSet,
            ssl: true,
            sslValidate: true,
            sslCA: ca,
            poolSize: 1
        });
        const db = new Db("foo", replSet);
        await db.open();
        const collection = await db.createCollection("shouldCorrectlyCommunicateUsingSSLSocket");
        await collection.remove();
        await collection.insert([{ a: 1 }, { b: 2 }, { c: "hello world" }]);
        expect(await collection.find({}).toArray()).to.have.lengthOf(3);
        await db.close();
        await manager.stop();
    });
});
