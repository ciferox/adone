import { Server as ServerManager } from "mongodb-topology-manager";

describe("ssl x509", function () {
    if (this.topology !== "ssl") {
        return;
    }

    const { database: { mongo }, fs } = adone;

    const caFile = new fs.File(__dirname, "ssl", "rootCA.crt");
    const caPath = caFile.path();
    const clientNoPassKey = new fs.File(__dirname, "ssl", "client_no_pass.key").contentSync();
    const clientNoPassCert = new fs.File(__dirname, "ssl", "client_no_pass.crt").contentSync();
    const clientNoPassPEM = new fs.File(__dirname, "ssl", "client_no_pass.pem").contentSync();
    const clientx509Key = new fs.File(__dirname, "ssl", "client_x509.key").contentSync();
    const clientx509Cert = new fs.File(__dirname, "ssl", "client_x509.crt").contentSync();
    const localhostPEMPath = new fs.File(__dirname, "ssl", "localhost.pem").path();
    const crlPEMPath = new fs.File(__dirname, "ssl", "crl.pem").path();

    const username = "CN=localhost,OU=heyho,O=Internet Widgits Pty Ltd,ST=Some-State,C=AU";

    it("should correctly authenticate using x509", async () => {
        const manager = new ServerManager("mongod", {
            dbpath: (await this.tmpdir.addDirectory("27019")).path(),
            port: 27019,
            sslCAFile: caPath,
            sslPEMKeyFile: localhostPEMPath,
            sslCRLFile: crlPEMPath,
            sslMode: "requireSSL",
            sslWeakCertificateValidation: null
        }, {
            ssl: true,
            host: "localhost",
            key: clientNoPassPEM,
            cert: clientNoPassPEM,
            rejectUnauthorized: false
        });
        await manager.purge();
        await manager.start();
        let db = await mongo.connect("mongodb://localhost:27019/test?ssl=true&maxPoolSize=1", {
            server: {
                sslKey: clientNoPassKey,
                sslCert: clientNoPassCert,
                sslValidate: false
            }
        });
        let result = await db.command({ buildInfo: 1 });
        const version = parseInt(result.versionArray.slice(0, 3).join(""), 10);
        if (version < 253) {
            await db.close();
            await manager.stop();
            return;
        }
        // Add the X509 auth user to the $external db
        const username = "CN=localhost,OU=heyho,O=Internet Widgits Pty Ltd,ST=Some-State,C=AU";
        const ext = db.db("$external");
        result = await ext.addUser(username, {
            roles: [
                { role: "readWriteAnyDatabase", db: "admin" },
                { role: "userAdminAnyDatabase", db: "admin" }
            ]
        });
        expect(result[0].user).to.be.equal(username);
        expect(result[0].pwd).to.be.empty;
        await db.close();
        db = await mongo.connect(`mongodb://${username}@localhost:27019/test?authMechanism=MONGODB-X509&ssl=true&maxPoolSize=1`, {
            server: {
                sslKey: clientx509Key,
                sslCert: clientx509Cert,
                sslValidate: false
            }
        });
        await db.close();
        await manager.stop();
    });

    it("should correctly handle bad x509 certificate", async () => {
        const manager = new ServerManager("mongod", {
            dbpath: (await this.tmpdir.addDirectory("27019")).path(),
            port: 27019,
            sslCAFile: caPath,
            sslPEMKeyFile: localhostPEMPath,
            sslCRLFile: crlPEMPath,
            sslMode: "requireSSL",
            sslWeakCertificateValidation: null
        }, {
            ssl: true,
            host: "localhost",
            key: clientNoPassPEM,
            cert: clientNoPassPEM,
            rejectUnauthorized: false
        });
        await manager.purge();
        await manager.start();
        const db = await mongo.connect("mongodb://localhost:27019/test?ssl=true&maxPoolSize=1", {
            server: {
                sslKey: clientNoPassKey,
                sslCert: clientNoPassCert,
                sslValidate: false
            }
        });
        let result = await db.command({ buildInfo: 1 });
        const version = parseInt(result.versionArray.slice(0, 3).join(""), 10);
        if (version < 253) {
            await db.close();
            await manager.stop();
            return;
        }
        // Add the X509 auth user to the $external db
        const ext = db.db("$external");
        result = await ext.addUser(username, {
            roles: [
                { role: "readWriteAnyDatabase", db: "admin" },
                { role: "userAdminAnyDatabase", db: "admin" }
            ]
        });
        expect(result[0].user).to.be.equal(username);
        expect(result[0].pwd).to.be.empty;
        await db.close();
        await assert.throws(async () => {
            await mongo.connect(`mongodb://${username}@localhost:27019/test?authMechanism=MONGODB-X509&ssl=true&maxPoolSize=1`, {
                server: {
                    sslKey: clientNoPassKey,
                    sslCert: clientNoPassCert,
                    sslValidate: false
                }
            });
        }, "auth failed");
        await manager.stop();
    });

    it("should give reasonable error on x509 authentication failure", async () => {
        const manager = new ServerManager("mongod", {
            dbpath: (await this.tmpdir.addDirectory("27019")).path(),
            port: 27019,
            sslCAFile: caPath,
            sslPEMKeyFile: localhostPEMPath,
            sslCRLFile: crlPEMPath,
            sslMode: "requireSSL",
            sslWeakCertificateValidation: null
        }, {
            ssl: true,
            host: "localhost",
            key: clientNoPassPEM,
            cert: clientNoPassPEM,
            rejectUnauthorized: false
        });
        await manager.purge();
        await manager.start();
        const db = await mongo.connect("mongodb://localhost:27019/test?ssl=true&maxPoolSize=1", {
            server: {
                sslKey: clientNoPassKey,
                sslCert: clientNoPassCert,
                sslValidate: false
            }
        });
        let result = await db.command({ buildInfo: 1 });
        const version = parseInt(result.versionArray.slice(0, 3).join(""), 10);
        if (version < 253) {
            await db.close();
            await manager.stop();
            return;
        }
        // Add the X509 auth user to the $external db
        const ext = db.db("$external");
        result = await ext.addUser(username, {
            roles: [
                { role: "readWriteAnyDatabase", db: "admin" },
                { role: "userAdminAnyDatabase", db: "admin" }
            ]
        });
        expect(result[0].user).to.be.equal(username);
        expect(result[0].pwd).to.be.empty;
        await db.close();
        await assert.throws(async () => {
            await mongo.connect("mongodb://wrong_username@localhost:27019/test?authMechanism=MONGODB-X509&ssl=true&maxPoolSize=1", {
                server: {
                    sslKey: clientx509Key,
                    sslCert: clientx509Cert,
                    sslValidate: false
                }
            });
        }, "auth failed");
        await manager.stop();
    });

    it("should give helpful error when attempting to use x509 without SSL", async () => {
        const manager = new ServerManager("mongod", {
            dbpath: (await this.tmpdir.addDirectory("27019")).path(),
            port: 27019
        });
        await manager.purge();
        await manager.start();
        const db = await mongo.connect("mongodb://localhost:27019/test?ssl=false&maxPoolSize=1", {
            server: {
                sslKey: clientNoPassKey,
                sslCert: clientNoPassCert,
                sslValidate: false
            }
        });
        let result = await db.command({ buildInfo: 1 });
        const version = parseInt(result.versionArray.slice(0, 3).join(""), 10);
        if (version < 253) {
            await db.close();
            await manager.stop();
            return;
        }
        // Add the X509 auth user to the $external db
        const ext = db.db("$external");
        result = await ext.addUser(username, {
            roles: [
                { role: "readWriteAnyDatabase", db: "admin" },
                { role: "userAdminAnyDatabase", db: "admin" }
            ]
        });
        expect(result[0].user).to.be.equal(username);
        expect(result[0].pwd).to.be.empty;
        await db.close();
        await assert.throws(async () => {
            await mongo.connect(`mongodb://${username}@localhost:27019/test?authMechanism=MONGODB-X509&ssl=false&maxPoolSize=1`, {
                server: {
                    sslKey: clientx509Key,
                    sslCert: clientx509Cert,
                    sslValidate: false
                }
            });
        }, "SSL support is required for the MONGODB-X509 mechanism");
        await manager.stop();
    });

    it("should correctly reauthenticate against x509", async () => {
        const manager = new ServerManager("mongod", {
            dbpath: (await this.tmpdir.addDirectory("27019")).path(),
            port: 27019,
            sslCAFile: caPath,
            sslPEMKeyFile: localhostPEMPath,
            sslCRLFile: crlPEMPath,
            sslMode: "requireSSL",
            sslWeakCertificateValidation: null
        }, {
            ssl: true,
            host: "localhost",
            key: clientNoPassPEM,
            cert: clientNoPassPEM,
            rejectUnauthorized: false
        });
        await manager.purge();
        await manager.start();
        let db = await mongo.connect("mongodb://localhost:27019/test?ssl=true&maxPoolSize=1", {
            server: {
                sslKey: clientNoPassKey,
                sslCert: clientNoPassCert,
                sslValidate: false
            }
        });
        let result = await db.command({ buildInfo: 1 });
        const version = parseInt(result.versionArray.slice(0, 3).join(""), 10);
        if (version < 253) {
            await db.close();
            await manager.stop();
            return;
        }
        // Add the X509 auth user to the $external db
        const ext = db.db("$external");
        result = await ext.addUser(username, {
            roles: [
                { role: "readWriteAnyDatabase", db: "admin" },
                { role: "userAdminAnyDatabase", db: "admin" }
            ]
        });
        expect(result[0].user).to.be.equal(username);
        expect(result[0].pwd).to.be.empty;
        await db.close();
        db = await mongo.connect(`mongodb://${username}@localhost:27019/test?authMechanism=MONGODB-X509&ssl=true&maxPoolSize=1`, {
            server: {
                sslKey: clientx509Key,
                sslCert: clientx509Cert,
                sslValidate: false
            }
        });
        const collection = db.collection("x509collection");
        await collection.insert({ a: 1 });
        let doc = await collection.findOne();
        expect(doc.a).to.be.equal(1);
        const reconnect = spy();
        db.serverConfig.on("reconnect", reconnect);
        db.serverConfig.connections()[0].destroy();
        await reconnect.waitForCall();
        doc = await collection.findOne();
        expect(doc.a).to.be.equal(1);
        db.serverConfig.connections()[0].destroy();
        doc = await collection.findOne();
        expect(doc.a).to.be.equal(1);
        await db.close();
        await manager.stop();
    });
});
