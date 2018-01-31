import { Server as ServerManager, ReplSet as ReplSetManager } from "mongodb-topology-manager";

describe("ssl client", function () {
    if (this.topology !== "ssl") {
        return;
    }

    const { database: { mongo }, fs } = adone;

    const caFile = new fs.File(__dirname, "ssl", "rootCA.crt");
    const caPath = caFile.path();
    const ca = caFile.contentsSync();
    const expiredCRL = new fs.File(__dirname, "ssl", "crl_expired.pem").contentsSync();
    const clientKey = new fs.File(__dirname, "ssl", "client.key").contentsSync();
    const clientCert = new fs.File(__dirname, "ssl", "client.crt").contentsSync();
    const clientNoPassKey = new fs.File(__dirname, "ssl", "client_no_pass.key").contentsSync();
    const clientNoPassCert = new fs.File(__dirname, "ssl", "client_no_pass.crt").contentsSync();
    const clientPEM = new fs.File(__dirname, "ssl", "client.pem").contentsSync();
    const selfKey = new fs.File(__dirname, "ssl", "self.key").contentsSync();
    const selfCert = new fs.File(__dirname, "ssl", "self.crt").contentsSync();
    const localhostKey = new fs.File(__dirname, "ssl", "localhost.key").contentsSync();
    const localhostCert = new fs.File(__dirname, "ssl", "localhost.crt").contentsSync();
    const localhostPEMPath = new fs.File(__dirname, "ssl", "localhost.pem").path();
    const crlPEMPath = new fs.File(__dirname, "ssl", "crl.pem").path();

    it("should correctly communicate using ssl socket", {
        async before() {
            this.manager = new ServerManager("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27019")).path(),
                port: 27019,
                sslOnNormalPorts: null,
                sslPEMKeyFile: localhostPEMPath,
                setParameter: ["enableTestCommands=1"]
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const db = await mongo.connect("mongodb://localhost:27019/test?ssl=true");
        await db.close();
    });

    it("should fail due to CRL list passed in", {
        async before() {
            this.manager = new ServerManager("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27019")).path(),
                port: 27019,
                sslOnNormalPorts: null,
                sslPEMKeyFile: localhostPEMPath,
                setParameter: ["enableTestCommands=1"]
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        await assert.throws(async () => {
            await mongo.connect("mongodb://localhost:27019/test?ssl=true", {
                sslValidate: true,
                sslCA: ca,
                sslCRL: expiredCRL
            });
        }, "CRL has expired");
    });

    it("should correctly validate server certificate", {
        async before() {
            this.manager = new ServerManager("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27019")).path(),
                port: 27019,
                sslOnNormalPorts: null,
                sslPEMKeyFile: localhostPEMPath,
                setParameter: ["enableTestCommands=1"]
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const db = await mongo.connect("mongodb://localhost:27019/test?ssl=true", {
            sslValidate: true,
            sslCA: ca
        });
        await db.close();
    });

    it("should correctly pass down servername to connection for TLS SNI support", {
        async before() {
            this.manager = new ServerManager("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27019")).path(),
                port: 27019,
                sslOnNormalPorts: null,
                sslPEMKeyFile: localhostPEMPath,
                setParameter: ["enableTestCommands=1"]
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const db = await mongo.connect("mongodb://localhost:27019/test?ssl=true", {
            sslValidate: true,
            sslCA: ca,
            servername: "localhost"
        });
        await db.close();
    });

    it("should correctly validate ssl certificate and ignore server certificate host name validation", {
        async before() {
            this.manager = new ServerManager("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27019")).path(),
                port: 27019,
                sslOnNormalPorts: null,
                sslPEMKeyFile: localhostPEMPath,
                setParameter: ["enableTestCommands=1"]
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const checkServerIdentity = spy();
        const db = await mongo.connect("mongodb://localhost:27019/test?ssl=true", {
            sslValidate: true,
            sslCA: ca,
            checkServerIdentity
        });
        expect(checkServerIdentity).to.have.been.calledOnce();
        await db.close();
    });

    it("should fail to validate certificate due to illegal host name", {
        async before() {
            this.manager = new ServerManager("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27019")).path(),
                port: 27019,
                sslOnNormalPorts: null,
                sslPEMKeyFile: localhostPEMPath,
                setParameter: ["enableTestCommands=1"]
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        await assert.throws(async () => {
            await mongo.connect("mongodb://127.0.0.1:27019/test?ssl=true", {
                sslValidate: true,
                sslCA: ca
            });
        });
    });

    it("should correctly validate presented server certificate and present valid certificate", {
        async before() {
            this.manager = new ServerManager("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27019")).path(),
                port: 27019,
                sslOnNormalPorts: null,
                sslCAFile: caPath,
                sslPEMKeyFile: localhostPEMPath,
                sslCRLFile: crlPEMPath,
                setParameter: ["enableTestCommands=1"]
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const db = await mongo.connect("mongodb://localhost:27019/test?ssl=true", {
            sslValidate: true,
            sslCA: ca,
            sslKey: clientNoPassKey,
            sslCert: clientNoPassCert
        });
        await db.close();
    });

    it("should correctly validate presented server certificate and present valid certificate with pass", {
        async before() {
            this.manager = new ServerManager("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27019")).path(),
                port: 27019,
                sslOnNormalPorts: null,
                sslCAFile: caPath,
                sslPEMKeyFile: localhostPEMPath,
                sslCRLFile: crlPEMPath,
                setParameter: ["enableTestCommands=1"]
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const db = await mongo.connect("mongodb://localhost:27019/test?ssl=true", {
            sslValidate: true,
            sslCA: ca,
            sslKey: clientKey,
            sslCert: clientCert,
            sslPass: "ciferox"
        });
        await db.close();
    });

    it("should validate presented server certificate but present invalid certificate", {
        async before() {
            this.manager = new ServerManager("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27019")).path(),
                port: 27019,
                sslCAFile: caPath,
                sslPEMKeyFile: localhostPEMPath,
                sslCRLFile: crlPEMPath,
                sslMode: "requireSSL",
                setParameter: ["enableTestCommands=1"]
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        await assert.throws(async () => {
            await mongo.connect("mongodb://localhost:27019/test?ssl=true", {
                sslValidate: true,
                sslCA: ca,
                sslKey: selfKey,
                sslCert: selfCert
            });
        });
    });

    it("should correctly validate presented server certificate and invalid key", {
        async before() {
            this.manager = new ServerManager("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27019")).path(),
                port: 27019,
                sslCAFile: caPath,
                sslPEMKeyFile: localhostPEMPath,
                sslCRLFile: crlPEMPath,
                sslMode: "requireSSL",
                setParameter: ["enableTestCommands=1"]
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        await assert.throws(async () => {
            await mongo.connect("mongodb://localhost:27019/test?ssl=true", {
                sslValidate: true,
                sslCA: ca,
                sslKey: selfKey,
                sslCert: clientCert,
                sslPass: "ciferox"
            });
        });
    });

    it("should correctly shut down if attempting to connect to ssl server with wrong parameters", {
        async before() {
            this.manager = new ServerManager("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27019")).path(),
                port: 27019,
                sslOnNormalPorts: null,
                sslPEMKeyFile: localhostPEMPath,
                setParameter: ["enableTestCommands=1"]
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        await assert.throws(async () => {
            await mongo.connect("mongodb://localhost:27019/test?ssl=false");
        }, /connection.+closed/);
    });

    it("should correctly connect using SSL to ReplSetManager", {
        async before() {
            this.timeout(300000);
            this.manager = new ReplSetManager("mongod", [{
                options: {
                    bind_ip: "localhost",
                    port: 33000,
                    dbpath: (await this.tmpdir.addDirectory("33000")).path(),
                    sslOnNormalPorts: null,
                    sslPEMKeyFile: localhostPEMPath
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33001,
                    dbpath: (await this.tmpdir.addDirectory("33001")).path(),
                    sslOnNormalPorts: null,
                    sslPEMKeyFile: localhostPEMPath
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33002,
                    dbpath: (await this.tmpdir.addDirectory("33002")).path(),
                    sslOnNormalPorts: null,
                    sslPEMKeyFile: localhostPEMPath
                }
            }], {
                replSet: "rs",
                ssl: true,
                rejectUnauthorized: false,
                ca: [ca],
                host: "localhost"
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const db = await mongo.connect("mongodb://localhost:33000,server:33001,server:33002/test?ssl=true&replicaSet=rs&maxPoolSize=1");
        await db.close();
    });

    it("should correctly send certificate to replSet and validate server certificate", {
        async before() {
            this.timeout(300000);
            this.manager = new ReplSetManager("mongod", [{
                options: {
                    bind_ip: "localhost",
                    port: 33000,
                    dbpath: (await this.tmpdir.addDirectory("33000")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33001,
                    dbpath: (await this.tmpdir.addDirectory("33001")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33002,
                    dbpath: (await this.tmpdir.addDirectory("33002")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }], {
                replSet: "rs",
                ssl: true,
                rejectUnauthorized: false,
                key: localhostKey,
                cert: localhostCert,
                host: "localhost"
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const db = await mongo.connect("mongodb://localhost:33000,localhost:33001/test?ssl=true&replicaSet=rs&maxPoolSize=1", {
            sslValidate: false,
            sslCA: ca,
            sslKey: clientPEM,
            sslCert: clientPEM,
            sslPass: "ciferox"
        });
        await db.close();
    });

    it("should correctly send SNI TLS servername to replicaset members", {
        async before() {
            this.timeout(300000);
            this.manager = new ReplSetManager("mongod", [{
                options: {
                    bind_ip: "localhost",
                    port: 33000,
                    dbpath: (await this.tmpdir.addDirectory("33000")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33001,
                    dbpath: (await this.tmpdir.addDirectory("33001")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33002,
                    dbpath: (await this.tmpdir.addDirectory("33002")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }], {
                replSet: "rs",
                ssl: true,
                rejectUnauthorized: false,
                key: localhostKey,
                cert: localhostCert,
                host: "localhost"
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const db = await mongo.connect("mongodb://localhost:33000,localhost:33001/test?ssl=true&replicaSet=rs&maxPoolSize=1", {
            sslValidate: false,
            servername: "localhost",
            sslCA: ca,
            sslKey: clientPEM,
            sslCert: clientPEM,
            sslPass: "ciferox",
            haInterval: 2000
        });
        await db.close();
    });

    it("should correctly send SNI TLS servername to replicaset members with restart", {
        async before() {
            this.timeout(300000);
            this.manager = new ReplSetManager("mongod", [{
                options: {
                    bind_ip: "localhost",
                    port: 33000,
                    dbpath: (await this.tmpdir.addDirectory("33000")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33001,
                    dbpath: (await this.tmpdir.addDirectory("33001")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33002,
                    dbpath: (await this.tmpdir.addDirectory("33002")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }], {
                replSet: "rs",
                ssl: true,
                rejectUnauthorized: false,
                key: localhostKey,
                cert: localhostCert,
                host: "localhost"
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async function () {
        const db = await mongo.connect("mongodb://localhost:33000,localhost:33001/test?ssl=true&replicaSet=rs&maxPoolSize=1", {
            sslValidate: false,
            servername: "localhost",
            sslCA: ca,
            sslKey: clientPEM,
            sslCert: clientPEM,
            sslPass: "ciferox",
            haInterval: 2000
        });
        const primary = await this.manager.primary();
        await primary.stop();
        await primary.start();
        const connections = db.serverConfig.connections();
        for (const conn of connections) {
            expect(conn.options.servername).to.be.equal("localhost");
        }
        await db.close();
    });

    it("should send wrong certificate to replSet and validate server certificate", {
        async before() {
            this.timeout(300000);
            this.manager = new ReplSetManager("mongod", [{
                options: {
                    bind_ip: "localhost",
                    port: 33000,
                    dbpath: (await this.tmpdir.addDirectory("33000")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33001,
                    dbpath: (await this.tmpdir.addDirectory("33001")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33002,
                    dbpath: (await this.tmpdir.addDirectory("33002")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }], {
                replSet: "rs",
                ssl: true,
                rejectUnauthorized: false,
                key: localhostKey,
                cert: localhostCert,
                host: "localhost"
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        await assert.throws(async () => {
            await mongo.connect("mongodb://localhost:33000,localhost:33001/test?ssl=true&replicaSet=rs&maxPoolSize=1", {
                sslValidate: true,
                sslCA: ca,
                sslKey: selfKey,
                sslCert: selfCert
            });
        });
    });

    it("should correctly to replicaset using ssl connect with password", {
        async before() {
            this.timeout(300000);
            this.manager = new ReplSetManager("mongod", [{
                options: {
                    bind_ip: "localhost",
                    port: 33000,
                    dbpath: (await this.tmpdir.addDirectory("33000")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33001,
                    dbpath: (await this.tmpdir.addDirectory("33001")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33002,
                    dbpath: (await this.tmpdir.addDirectory("33002")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslCAFile: caPath,
                    sslCRLFile: crlPEMPath,
                    sslMode: "requireSSL"
                }
            }], {
                replSet: "rs",
                ssl: true,
                rejectUnauthorized: false,
                key: localhostKey,
                cert: localhostCert,
                host: "localhost"
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const db = await mongo.connect("mongodb://localhost:33000,localhost:33001/test?ssl=true&replicaSet=rs&maxPoolSize=1", {
            sslValidate: true,
            sslCA: ca,
            sslKey: clientKey,
            sslCert: clientCert,
            sslPass: "ciferox"
        });
        await db.close();
    });

    it("should correctly connect using ssl with sslValidation turned off", {
        async before() {
            this.timeout(300000);
            this.manager = new ReplSetManager("mongod", [{
                options: {
                    bind_ip: "localhost",
                    port: 33000,
                    dbpath: (await this.tmpdir.addDirectory("33000")).path(),
                    sslOnNormalPorts: null,
                    sslPEMKeyFile: localhostPEMPath
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33001,
                    dbpath: (await this.tmpdir.addDirectory("33001")).path(),
                    sslOnNormalPorts: null,
                    sslPEMKeyFile: localhostPEMPath
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33002,
                    dbpath: (await this.tmpdir.addDirectory("33002")).path(),
                    sslOnNormalPorts: null,
                    sslPEMKeyFile: localhostPEMPath
                }
            }], {
                replSet: "rs",
                ssl: true,
                rejectUnauthorized: false,
                key: localhostKey,
                cert: localhostCert,
                host: "localhost"
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const db = await mongo.connect("mongodb://localhost:33000,localhost:33001/test?ssl=true&replicaSet=rs&maxPoolSize=1", {
            sslValidate: false
        });
        await db.close();
    });

    it("should correctly connect using SSL to replicaset with requireSSL", {
        async before() {
            this.timeout(300000);
            this.manager = new ReplSetManager("mongod", [{
                options: {
                    bind_ip: "localhost",
                    port: 33000,
                    dbpath: (await this.tmpdir.addDirectory("33000")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33001,
                    dbpath: (await this.tmpdir.addDirectory("33001")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslMode: "requireSSL"
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33002,
                    dbpath: (await this.tmpdir.addDirectory("33002")).path(),
                    sslPEMKeyFile: localhostPEMPath,
                    sslMode: "requireSSL"
                }
            }], {
                replSet: "rs",
                ssl: true,
                rejectUnauthorized: false,
                ca,
                host: "localhost"
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async () => {
        const db = await mongo.connect("mongodb://localhost:33000,localhost:33001/test?replicaSet=rs", {
            ssl: true,
            sslCA: ca
        });
        await db.command({ ismaster: true }, { readPreference: "nearest", full: true });
        const left = new Promise((resolve) => db.serverConfig.once("left", resolve));
        const secondary = db.serverConfig.s.replset.s.replicaSetState.secondaries[0];
        secondary.destroy();
        await left;
        await db.close();
    });

    it("should correctly connect to Replicaset using SSL when secondary down", {
        async before() {
            this.timeout(300000);
            this.manager = new ReplSetManager("mongod", [{
                options: {
                    bind_ip: "localhost",
                    port: 33000,
                    dbpath: (await this.tmpdir.addDirectory("33000")).path(),
                    sslOnNormalPorts: null,
                    sslPEMKeyFile: localhostPEMPath
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33001,
                    dbpath: (await this.tmpdir.addDirectory("33001")).path(),
                    sslOnNormalPorts: null,
                    sslPEMKeyFile: localhostPEMPath
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 33002,
                    dbpath: (await this.tmpdir.addDirectory("33002")).path(),
                    sslOnNormalPorts: null,
                    sslPEMKeyFile: localhostPEMPath
                }
            }], {
                replSet: "rs",
                ssl: true,
                rejectUnauthorized: false,
                key: localhostKey,
                cert: localhostCert,
                host: "localhost"
            });
            await this.manager.purge();
            await this.manager.start();
        },
        async after() {
            this.manager && await this.manager.stop();
        }
    }, async function () {
        const secondaries = await this.manager.secondaries();
        await secondaries[0].stop();
        const db = await mongo.connect("mongodb://localhost:33000,localhost:33001,localhost:33002/test?ssl=true&replicaSet=rs&maxPoolSize=1", {
            sslValidate: false,
            sslCA: ca
        });
        await db.close();
    });
});
