const hasher = require("pbkdf2-password")();
const steed = require("steed");

describe("mosca.Authorizer", () => {

    let authorizer;
    let instance;
    let client;

    beforeEach(() => {
        authorizer = new adone.net.mqtt.server.Authorizer();
        client = {};
    });

    describe("authenticate", () => {

        beforeEach(() => {
            instance = authorizer.authenticate;
        });

        it("it should not authenticate an unknown user", (done) => {
            instance(client, "user", "pass", (err, success) => {
                expect(success).to.be.false();
                done();
            });
        });

        it("it should authenticate a known user", (done) => {
            authorizer.addUser("user", "pass", () => {
                instance(client, "user", "pass", (err, success) => {
                    expect(success).to.be.true();
                    done();
                });
            });
        });

        it("it should not authenticate a user with the wrong password", (done) => {

            authorizer.addUser("user", "pass", () => {
                instance(client, "user", "wrongpass", (err, success) => {
                    expect(success).to.be.false();
                    done();
                });
            });
        });

        it("it should not authenticate a user without a password", (done) => {

            authorizer.addUser("user", "pass", () => {
                instance(client, "user", null, (err, success) => {
                    expect(success).to.be.false();
                    done();
                });
            });
        });

        it("it should not authenticate a user without a username", (done) => {

            authorizer.addUser("user", "pass", () => {
                instance(client, null, "pass", (err, success) => {
                    expect(success).to.be.false();
                    done();
                });
            });
        });

        it("it should authenticate a user known user", (done) => {

            authorizer.addUser("matteo", "collina", () => {
                instance(client, "matteo", "collina", (err, success) => {
                    expect(success).to.be.true();
                    done();
                });
            });
        });

        it("it should not authenticate a removed user", (done) => {
            steed.waterfall([
                authorizer.addUser.bind(authorizer, "matteo", "collina"),
                authorizer.rmUser.bind(authorizer, "matteo"),
                instance.bind(null, client, "matteo", "collina")
            ], (err, success) => {
                expect(success).to.be.false();
                done();
            });
        });

        it("it should add the username to the client", (done) => {
            authorizer.addUser("user", "pass", () => {
                instance(client, "user", "pass", (err, success) => {
                    expect(client).to.have.property("user", "user");
                    done();
                });
            });
        });
    });

    describe("users", () => {

        beforeEach(() => {
            instance = authorizer;
        });

        it("should memorize a user", (done) => {
            instance.addUser("matteo", "collina", () => {
                expect(instance.users.matteo).to.exist();
                done();
            });
        });

        it("should memorize a user has salt/hash combination", (done) => {
            instance.addUser("matteo", "collina", () => {
                expect(instance.users.matteo.salt).to.exist();
                expect(instance.users.matteo.hash).to.exist();
                done();
            });
        });

        it("should be a real hash", (done) => {
            instance.addUser("matteo", "collina", () => {
                hasher({
                    password: "collina",
                    salt: instance.users.matteo.salt
                },

                    (err, pass, salt, hash) => {
                        expect(hash).to.eql(instance.users.matteo.hash);
                        done();
                    });
            });
        });
    });

    it("should support passing users as a parameter", () => {
        const users = {};
        instance = new adone.net.mqtt.server.Authorizer(users);
        expect(instance.users).to.equal(users);
    });

    describe("authorizePublish", () => {

        beforeEach((done) => {
            client.user = "user";
            instance = authorizer.authorizePublish;
            authorizer.addUser("user", "pass", () => {
                done();
            });
        });

        it("it should authorize a publish based on the topic", (done) => {
            instance(client, "topic", "payload", (err, success) => {
                expect(success).to.be.true();
                done();
            });
        });

        it("it should authorize a publish based on a long topic", (done) => {
            instance(client, "/long/topic", "payload", (err, success) => {
                expect(success).to.be.true();
                done();
            });
        });

        it("it should not authorize a publish based on the topic", (done) => {
            authorizer.addUser("user", "pass", "/topic", () => {
                instance(client, "other", "payload", (err, success) => {
                    expect(success).to.be.false();
                    done();
                });
            });
        });

        it("should default the authorizePublish param to **", (done) => {
            authorizer.addUser("user", "pass", null, () => {
                instance(client, "other", "payload", (err, success) => {
                    expect(success).to.be.true();
                    done();
                });
            });
        });

        it("it should authorize a publish based on a pattern", (done) => {
            authorizer.addUser("user", "pass", "/topic/*", () => {
                instance(client, "/topic/other", "payload", (err, success) => {
                    expect(success).to.be.true();
                    done();
                });
            });
        });

        it("it should not authorize a publish based on a pattern", (done) => {
            authorizer.addUser("user", "pass", "/topic/*", () => {
                instance(client, "/topic/other/buu", "payload", (err, success) => {
                    expect(success).to.be.false();
                    done();
                });
            });
        });

        it("it should authorize a publish based on a unlimited pattern", (done) => {
            authorizer.addUser("user", "pass", "/topic/**", () => {
                instance(client, "/topic/other/buu", "payload", (err, success) => {
                    expect(success).to.be.true();
                    done();
                });
            });
        });

        it("it should authorize a publish based on a recursive pattern", (done) => {
            authorizer.addUser("user", "pass", "/topic/**/buu", () => {
                instance(client, "/topic/other/long/buu", "payload", (err, success) => {
                    expect(success).to.be.true();
                    done();
                });
            });
        });
    });

    describe("authorizeSubscribe", () => {

        beforeEach((done) => {
            client.user = "user";
            instance = authorizer.authorizeSubscribe;
            authorizer.addUser("user", "pass", () => {
                done();
            });
        });

        it("it should authorize a subscribe based on the topic", (done) => {
            instance(client, "topic", (err, success) => {
                expect(success).to.be.true();
                done();
            });
        });

        it("it should authorize a publish based on a long topic", (done) => {
            instance(client, "/long/topic", (err, success) => {
                expect(success).to.be.true();
                done();
            });
        });

        it("should default the authorizeSubscribe param to **", (done) => {
            authorizer.addUser("user", "pass", null, null, () => {
                instance(client, "other", (err, success) => {
                    expect(success).to.be.true();
                    done();
                });
            });
        });

        it("it should not authorize a publish based on the topic", (done) => {
            authorizer.addUser("user", "pass", "**", "/topic", () => {
                instance(client, "other", (err, success) => {
                    expect(success).to.be.false();
                    done();
                });
            });
        });

        it("it should authorize a publish based on a pattern", (done) => {
            authorizer.addUser("user", "pass", "**", "/topic/*", () => {
                instance(client, "/topic/other", (err, success) => {
                    expect(success).to.be.true();
                    done();
                });
            });
        });

        it("it should not authorize a publish based on a pattern", (done) => {
            authorizer.addUser("user", "pass", "**", "/topic/*", () => {
                instance(client, "/topic/other/buu", (err, success) => {
                    expect(success).to.be.false();
                    done();
                });
            });
        });

        it("it should authorize a publish based on a unlimited pattern", (done) => {
            authorizer.addUser("user", "pass", "**", "/topic/**", () => {
                instance(client, "/topic/other/buu", (err, success) => {
                    expect(success).to.be.true();
                    done();
                });
            });
        });

        it("it should authorize a publish based on a recursive pattern", (done) => {
            authorizer.addUser("user", "pass", "**", "/topic/**/buu", () => {
                instance(client, "/topic/other/long/buu", (err, success) => {
                    expect(success).to.be.true();
                    done();
                });
            });
        });
    });
});
