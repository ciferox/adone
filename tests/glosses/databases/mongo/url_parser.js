describe("url parser", function () {
    if (this.topology !== "single") {
        return;
    }

    const { database: { mongo } } = adone;
    const { __: { parseUrl: parse } } = mongo;

    it("should correctly parse mongodb://localhost", () => {
        // console.dir(parse)
        const object = parse("mongodb://localhost/");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("admin");
    });

    it("should correctly parse mongodb://localhost:27017", () => {
        // console.dir(parse)
        const object = parse("mongodb://localhost:27017/");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("admin");
    });

    it("should correctly parse mongodb://localhost:27017test?appname=hello%20world", () => {
        const object = parse("mongodb://localhost:27017/test?appname=hello%20world");
        expect(object.appname).to.be.equal("hello world");
    });

    it("should correctly parse mongodb://localhost/?safe=true&readPreference=secondary", () => {
        // console.dir(parse)
        const object = parse("mongodb://localhost/?safe=true&readPreference=secondary");
        // var object = parse("mongodb://localhost?safe");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("admin");
    });

    it("should correctly parse mongodb://localhost:28101/", () => {
        // console.dir(parse)
        const object = parse("mongodb://localhost:28101/");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(28101);
        expect(object.dbName).to.be.equal("admin");
    });

    it("should correctly parse mongodb://fred:foobar@localhost/baz", () => {
        // console.dir(parse)
        const object = parse("mongodb://fred:foobar@localhost/baz");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("baz");
        expect(object.auth.user).to.be.equal("fred");
        expect(object.auth.password).to.be.equal("foobar");
    });

    it("should correctly parse mongodb://fred:foo%20bar@localhost/baz", () => {
        // console.dir(parse)
        const object = parse("mongodb://fred:foo%20bar@localhost/baz");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("baz");
        expect(object.auth.user).to.be.equal("fred");
        expect(object.auth.password).to.be.equal("foo bar");
    });

    it("should correctly parse mongodb:///tmp/mongodb-27017.sock", () => {
        // console.dir(parse)
        const object = parse("mongodb:///tmp/mongodb-27017.sock");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].domain_socket).to.be.equal("/tmp/mongodb-27017.sock");
        expect(object.dbName).to.be.equal("admin");
    });

    it("should correctly parse mongodb://fred:foo@/tmp/mongodb-27017.sock", () => {
        // console.dir(parse)
        const object = parse("mongodb://fred:foo@/tmp/mongodb-27017.sock");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].domain_socket).to.be.equal("/tmp/mongodb-27017.sock");
        expect(object.dbName).to.be.equal("admin");
        expect(object.auth.user).to.be.equal("fred");
        expect(object.auth.password).to.be.equal("foo");
    });

    it("should correctly parse mongodb://fred:foo@/tmp/mongodb-27017.sock/somedb", () => {
        // console.dir(parse)
        const object = parse("mongodb://fred:foo@/tmp/mongodb-27017.sock/somedb");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].domain_socket).to.be.equal("/tmp/mongodb-27017.sock");
        expect(object.dbName).to.be.equal("somedb");
        expect(object.auth.user).to.be.equal("fred");
        expect(object.auth.password).to.be.equal("foo");
    });

    it("should correctly parse mongodb://fred:foo@/tmp/mongodb-27017.sock/somedb?safe=true", () => {
        // console.dir(parse)
        const object = parse("mongodb://fred:foo@/tmp/mongodb-27017.sock/somedb?safe=true");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].domain_socket).to.be.equal("/tmp/mongodb-27017.sock");
        expect(object.dbName).to.be.equal("somedb");
        expect(object.auth.user).to.be.equal("fred");
        expect(object.auth.password).to.be.equal("foo");
        expect(object.db_options.safe).to.be.true;
    });

    it("should correctly parse mongodb://example1.com:27017,example2.com:27018", () => {
        // console.dir(parse)
        const object = parse("mongodb://example1.com:27017,example2.com:27018");
        expect(object.servers).to.have.lengthOf(2);
        expect(object.servers[0].host).to.be.equal("example1.com");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.servers[1].host).to.be.equal("example2.com");
        expect(object.servers[1].port).to.be.equal(27018);
        expect(object.dbName).to.be.equal("admin");
    });

    it("should correctly parse mongodb://localhost,localhost:27018,localhost:27019", () => {
        // console.dir(parse)
        const object = parse("mongodb://localhost,localhost:27018,localhost:27019");
        expect(object.servers).to.have.lengthOf(3);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.servers[1].host).to.be.equal("localhost");
        expect(object.servers[1].port).to.be.equal(27018);
        expect(object.servers[2].host).to.be.equal("localhost");
        expect(object.servers[2].port).to.be.equal(27019);
        expect(object.dbName).to.be.equal("admin");
    });

    it("should correctly parse mongodb://host1,host2,host3/?slaveOk=true", () => {
        // console.dir(parse)
        const object = parse("mongodb://host1,host2,host3/?slaveOk=true");
        expect(object.servers).to.have.lengthOf(3);
        expect(object.servers[0].host).to.be.equal("host1");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.servers[1].host).to.be.equal("host2");
        expect(object.servers[1].port).to.be.equal(27017);
        expect(object.servers[2].host).to.be.equal("host3");
        expect(object.servers[2].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("admin");
        expect(object.server_options.slave_ok).to.be.true;
    });

    it("should correctly parse mongodb://host1,host2,host3,host1/?slaveOk=true and de-duplicate names", () => {
        // console.dir(parse)
        const object = parse("mongodb://host1,host2,host3,host1/?slaveOk=true");
        expect(object.servers).to.have.lengthOf(3);
        expect(object.servers[0].host).to.be.equal("host1");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.servers[1].host).to.be.equal("host2");
        expect(object.servers[1].port).to.be.equal(27017);
        expect(object.servers[2].host).to.be.equal("host3");
        expect(object.servers[2].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("admin");
        expect(object.server_options.slave_ok).to.be.true;
    });

    it("should correctly parse mongodb://localhost/?safe=true", () => {
        // console.dir(parse)
        const object = parse("mongodb://localhost/?safe=true");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("admin");
        expect(object.db_options.safe).to.be.true;
    });

    it("should correctly parse mongodb://host1,host2,host3/?safe=true;w=2;wtimeoutMS=2000", () => {
        // console.dir(parse)
        const object = parse("mongodb://host1,host2,host3/?safe=true;w=2;wtimeoutMS=2000");
        expect(object.servers).to.have.lengthOf(3);
        expect(object.servers[0].host).to.be.equal("host1");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.servers[1].host).to.be.equal("host2");
        expect(object.servers[1].port).to.be.equal(27017);
        expect(object.servers[2].host).to.be.equal("host3");
        expect(object.servers[2].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("admin");
        expect(object.db_options.safe).to.be.true;
        expect(object.db_options.w).to.be.equal(2);
        expect(object.db_options.wtimeout).to.be.equal(2000);
    });

    it("parse mongodb://localhost/db?replicaSet=hello&ssl=prefer&connectTimeoutMS=1000&socketTimeoutMS=2000", () => {
        // console.dir(parse)
        const object = parse("mongodb://localhost/db?replicaSet=hello&ssl=prefer&connectTimeoutMS=1000&socketTimeoutMS=2000");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("db");
        expect(object.rs_options.rs_name).to.be.equal("hello");
        expect(object.server_options.socketOptions.connectTimeoutMS).to.be.equal(1000);
        expect(object.server_options.socketOptions.socketTimeoutMS).to.be.equal(2000);
        expect(object.rs_options.socketOptions.connectTimeoutMS).to.be.equal(1000);
        expect(object.rs_options.socketOptions.socketTimeoutMS).to.be.equal(2000);
        expect(object.rs_options.ssl).to.be.equal("prefer");
        expect(object.server_options.ssl).to.be.equal("prefer");
    });

    it("parse mongodb://localhost/db?ssl=true", () => {
        // console.dir(parse)
        const object = parse("mongodb://localhost/db?ssl=true");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("db");
        expect(object.rs_options.ssl).to.be.true;
        expect(object.server_options.ssl).to.be.true;
    });

    it("parse mongodb://localhost/db?maxPoolSize=100", () => {
        // console.dir(parse)
        const object = parse("mongodb://localhost/db?maxPoolSize=100");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("db");
        expect(object.rs_options.poolSize).to.be.equal(100);
        expect(object.server_options.poolSize).to.be.equal(100);
    });

    it("parse mongodb://localhost/db?w=-1", () => {
        const object = parse("mongodb://localhost/db?w=-1");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("db");
        expect(object.db_options.w).to.be.equal(-1);
    });

    it("throw on unsuported options", () => {
        expect(() => {
            parse("mongodb://localhost/db?minPoolSize=100");
        }).to.throw("minPoolSize not supported");
        expect(() => {
            parse("mongodb://localhost/db?maxIdleTimeMS=100");
        }).to.throw("maxIdleTimeMS not supported");
        expect(() => {
            parse("mongodb://localhost/db?waitQueueMultiple=100");
        }).to.throw("waitQueueMultiple not supported");
        expect(() => {
            parse("mongodb://localhost/db?waitQueueTimeoutMS=100");
        }).to.throw("waitQueueTimeoutMS not supported");
        expect(() => {
            parse("mongodb://localhost/db?uuidRepresentation=1");
        }).to.throw("uuidRepresentation not supported");
    });

    it("write concerns parsing", () => {
        let object = parse("mongodb://localhost/db?safe=true&w=1");
        expect(object.db_options.safe).to.be.true;

        object = parse("mongodb://localhost/db?safe=false&w=1");
        expect(object.db_options.safe).to.be.false;

        expect(() => {
            parse("mongodb://localhost/db?safe=true&w=0");
        }).to.throw("w set to -1 or 0 cannot be combined with safe/w/journal/fsync");
        expect(() => {
            parse("mongodb://localhost/db?fsync=true&w=-1");
        }).to.throw("w set to -1 or 0 cannot be combined with safe/w/journal/fsync");
    });

    it("GSSAPI parsing", () => {
        let object = parse("mongodb://dev1%4010GEN.ME@kdc.10gen.com/test?authMechanism=GSSAPI");
        expect(object.auth).to.be.deep.equal({ user: "dev1@10GEN.ME", password: null });
        expect(object.db_options.authMechanism).to.be.equal("GSSAPI");

        expect(() => {
            parse("mongodb://kdc.10gen.com/test?authMechanism=GSSAPI");
        }).to.throw("GSSAPI requires a provided principal");

        expect(() => {
            parse("mongodb://kdc.10gen.com/test?authMechanism=NONE");
        }).to.throw("only DEFAULT, GSSAPI, PLAIN, MONGODB-X509, SCRAM-SHA-1 or MONGODB-CR is supported by authMechanism");

        object = parse("mongodb://dev1%4010GEN.ME:test@kdc.10gen.com/test?authMechanism=GSSAPI");
        expect(object.auth).to.be.deep.equal({ user: "dev1@10GEN.ME", password: "test" });
        expect(object.db_options.authMechanism).to.be.equal("GSSAPI");
    });

    it("read preferences parsing", () => {
        let object = parse("mongodb://localhost/db?slaveOk=true");
        expect(object.server_options.slave_ok).to.be.true;

        object = parse("mongodb://localhost/db?readPreference=primary");
        expect(object.db_options.readPreference).to.be.equal("primary");

        object = parse("mongodb://localhost/db?readPreference=primaryPreferred");
        expect(object.db_options.readPreference).to.be.equal("primaryPreferred");

        object = parse("mongodb://localhost/db?readPreference=secondary");
        expect(object.db_options.readPreference).to.be.equal("secondary");

        object = parse("mongodb://localhost/db?readPreference=secondaryPreferred");
        expect(object.db_options.readPreference).to.be.equal("secondaryPreferred");

        object = parse("mongodb://localhost/db?readPreference=nearest");
        expect(object.db_options.readPreference).to.be.equal("nearest");

        object = parse("mongodb://localhost/db");
        expect(object.db_options.readPreference).to.be.equal("primary");

        expect(() => {
            parse("mongodb://localhost/db?readPreference=blah");
        }).to.throw("readPreference must be either primary/primaryPreferred/secondary/secondaryPreferred/nearest");
    });

    it("read preferences tag parsing", () => {
        let object = parse("mongodb://localhost/db");
        expect(object.db_options.read_preference_tags).to.be.equal(null);

        object = parse("mongodb://localhost/db?readPreferenceTags=dc:ny");
        expect(object.db_options.read_preference_tags).to.be.deep.equal([{ dc: "ny" }]);

        object = parse("mongodb://localhost/db?readPreferenceTags=dc:ny,rack:1");
        expect(object.db_options.read_preference_tags).to.be.deep.equal([{ dc: "ny", rack: "1" }]);

        object = parse("mongodb://localhost/db?readPreferenceTags=dc:ny,rack:1&readPreferenceTags=dc:sf,rack:2");
        expect(object.db_options.read_preference_tags).to.be.deep.equal([{ dc: "ny", rack: "1" }, { dc: "sf", rack: "2" }]);

        object = parse("mongodb://localhost/db?readPreferenceTags=dc:ny,rack:1&readPreferenceTags=dc:sf,rack:2&readPreferenceTags=");
        expect(object.db_options.read_preference_tags).to.be.deep.equal([{ dc: "ny", rack: "1" }, { dc: "sf", rack: "2" }, {}]);
    });

    it("should correctly parse mongodb://[::1]:1234", () => {
        // console.dir(parse)
        const object = parse("mongodb://[::1]:1234");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("::1");
        expect(object.servers[0].port).to.be.equal(1234);
        expect(object.dbName).to.be.equal("admin");
    });

    it("should correctly parse mongodb://[::1]", () => {
        // console.dir(parse)
        const object = parse("mongodb://[::1]");
        expect(object.servers).to.have.lengthOf(1);
        expect(object.servers[0].host).to.be.equal("::1");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("admin");
    });

    it("should correctly parse mongodb://localhost,[::1]:27018,[2607:f0d0:1002:51::41]", () => {
        // console.dir(parse)
        const object = parse("mongodb://localhost,[::1]:27018,[2607:f0d0:1002:51::41]");
        expect(object.servers).to.have.lengthOf(3);
        expect(object.servers[0].host).to.be.equal("localhost");
        expect(object.servers[0].port).to.be.equal(27017);
        expect(object.servers[1].host).to.be.equal("::1");
        expect(object.servers[1].port).to.be.equal(27018);
        expect(object.servers[2].host).to.be.equal("2607:f0d0:1002:51::41");
        expect(object.servers[2].port).to.be.equal(27017);
        expect(object.dbName).to.be.equal("admin");
    });

    it("should correctly parse mongodb://k?y:foo@/tmp/mongodb-27017.sock/somedb?safe=true", () => {
        // console.dir(parse)
        const object = parse("mongodb://k%3Fy:foo@/tmp/mongodb-27017.sock/somedb?safe=true");
        expect(object.auth.user).to.be.equal("k?y");
    });

    it("should correctly parse uriencoded k?y mongodb://k%3Fy:foo@/tmp/mongodb-27017.sock/somedb?safe=true", () => {
        // console.dir(parse)
        const object = parse("mongodb://k%3Fy:foo@/tmp/mongodb-27017.sock/somedb?safe=true");
        expect(object.auth.user).to.be.equal("k?y");
    });

    it("should correctly parse username kay:kay mongodb://kay%3Akay:foo@/tmp/mongodb-27017.sock/somedb?safe=true", () => {
        // console.dir(parse)
        const object = parse("mongodb://kay%3Akay:foo@/tmp/mongodb-27017.sock/somedb?safe=true");
        expect(object.auth.user).to.be.equal("kay:kay");
    });
});
