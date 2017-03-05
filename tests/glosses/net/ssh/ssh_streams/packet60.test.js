/* global describe it */


import { SSH2Stream, utils } from "../../../../../lib/glosses/net/ssh/ssh_streams";
const parseKey = utils.parseKey;
const genPubKey = utils.genPublicKey;

const crypto = adone.std.crypto;
const fs = adone.std.fs;

const SERVER_PRV_KEY = fs.readFileSync(__dirname + "/fixtures/ssh_host_rsa_key");
const PARSED_SERVER_PRV_KEY = parseKey(SERVER_PRV_KEY);
const PARSED_SERVER_PUB_KEY = genPubKey(PARSED_SERVER_PRV_KEY);
const CLIENT_PRV_KEY = fs.readFileSync(__dirname + "/fixtures/id_rsa");
const PARSED_CLIENT_PRV_KEY = parseKey(CLIENT_PRV_KEY);
const PARSED_CLIENT_PUB_KEY = genPubKey(PARSED_CLIENT_PRV_KEY);

function makePair(cb, doneFunc) {
    var server = new SSH2Stream({
        server: true,
        hostKeys: {
            "ssh-rsa": {
                privateKey: PARSED_SERVER_PRV_KEY,
                publicKey: PARSED_SERVER_PUB_KEY
            }
        }
    });
    var client = new SSH2Stream();

    var done = [];

    function tryDone(who) {
        done.push(who);
        if (done.length !== 2)
            return;
        cb(server, client, doneFunc);
    }

    server.on("NEWKEYS", function() {
        tryDone("server");
    });
    client.on("NEWKEYS", function() {
        tryDone("client");
    });
    server.pipe(client).pipe(server);
}

function signWithClientKey(blob, syncCb) {
    var signType = (PARSED_CLIENT_PRV_KEY.type === "rsa" ? "R" : "D") + "SA-SHA1";
    var signature = crypto.createSign(signType);
    signature.update(blob);
    signature = signature.sign(PARSED_CLIENT_PRV_KEY.privateOrig);
    syncCb(signature);
}

function bufferEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}

function publickey(server, client, done) {
    server.on("USERAUTH_REQUEST", function(user, service, method, data) {
        assert.equal(user, "bob");
        assert.equal(service, "ssh-connection");
        assert.equal(method, "publickey");
        assert.equal(data.keyAlgo, PARSED_CLIENT_PUB_KEY.fulltype);
        assert.equal(true, bufferEqual(data.key, PARSED_CLIENT_PUB_KEY.public));
        assert.equal(data.signature, undefined);
        assert.equal(data.blob, undefined);
        return server.authPKOK(data.keyAlgo, data.key);
    });
    client.on("USERAUTH_PK_OK", function() {
        done();
    }).authPK("bob", PARSED_CLIENT_PUB_KEY);
}

function keyboardInteractive(server, client, done) {
    var infoReqsRxed = 0;

    server.on("USERAUTH_REQUEST", function(user, service, method, data) {
        assert.equal(user, "bob");
        assert.equal(service, "ssh-connection");
        assert.equal(method, "keyboard-interactive");
        assert.equal(data, "");
        process.nextTick(function() {
            server.authInfoReq("req 0", "instructions", [{
                prompt: "Say something to req 0",
                echo: true
            }]);
        });
    }).on("USERAUTH_INFO_RESPONSE", function(responses) {
        if (infoReqsRxed === 1) {
            assert.equal(responses.length, 1);
            assert.equal(responses[0], "hello to req 0");
            process.nextTick(function() {
                server.authInfoReq("req 1", "new instructions", [{
                    prompt: "Say something to req 1",
                    echo: true
                }, {
                    prompt: "Say something else",
                    echo: false
                }]);
            });
        } else if (infoReqsRxed === 2) {
            assert.equal(responses.length, 2);
            assert.equal(responses[0], "hello to req 1");
            assert.equal(responses[1], "something else");
            done();
        } else {
            throw new Error("Received too many info reqs: " + infoReqsRxed);
        }
    });

    client.on("USERAUTH_INFO_REQUEST", function(name, inst, lang, prompts) {
        infoReqsRxed++;
        if (infoReqsRxed === 1) {
            assert.equal(name, "req 0");
            assert.equal(inst, "instructions");
            assert.equal(lang, "");
            assert.deepEqual(prompts, [{
                prompt: "Say something to req 0",
                echo: true
            }]);
            process.nextTick(function() {
                client.authInfoRes(["hello to req 0"]);
            });
        } else if (infoReqsRxed === 2) {
            assert.equal(name, "req 1");
            assert.equal(inst, "new instructions");
            assert.equal(lang, "");
            assert.deepEqual(prompts, [{
                prompt: "Say something to req 1",
                echo: true
            }, {
                prompt: "Say something else",
                echo: false
            }]);
            process.nextTick(function() {
                client.authInfoRes(["hello to req 1", "something else"]);
            });
        } else {
            throw new Error("Received too many info reqs: " + infoReqsRxed);
        }
    }).authKeyboard("bob");
}

function mixedMethods(server, client, done) {
    var expectedStages = [
        "SERVER_SEES_PK_CHECK",
        "SERVER_SEES_PK_REQUEST",
        "SERVER_SEES_PASSWORD",
        "SERVER_SEES_KEYBOARD_INTERACTIVE",
        "CLIENT_SEES_PK_OK",
        "CLIENT_SEES_USERAUTH_FAILURE_PK",
        "CLIENT_SEES_USERAUTH_FAILURE_PASSWORD",
        "CLIENT_SEES_KEYBOARD_REQ",
        "SERVER_SEES_KEYBOARD_RES",
        "CLIENT_SEES_USERAUTH_SUCCESS",
    ];

    server.on("USERAUTH_REQUEST", function(name, service, method, data) {
        assert.equal(name, "bob");
        assert.equal(service, "ssh-connection");
        var expectedStage = expectedStages.shift();
        switch (expectedStage) {
            case "SERVER_SEES_PK_CHECK":
                assert.equal(method, "publickey");
                assert.equal(data.signature, undefined);
                return process.nextTick(function() {
                    server.authPKOK(data.keyAlgo, data.key);
                });
            case "SERVER_SEES_PK_REQUEST":
                assert.equal(method, "publickey");
                assert.notEqual(data.signature, undefined);
                return process.nextTick(function() {
                    server.authFailure(
                        ["publickey", "password", "keyboard-interactive"],
                        false
                    );
                });
            case "SERVER_SEES_PASSWORD":
                assert.equal(method, "password");
                assert.equal(data, "seekrit");
                return process.nextTick(function() {
                    server.authFailure(
                        ["publickey", "password", "keyboard-interactive"],
                        false
                    );
                });
            case "SERVER_SEES_KEYBOARD_INTERACTIVE":
                assert.equal(method, "keyboard-interactive");
                assert.equal(data, "");
                return process.nextTick(function() {
                    server.authInfoReq("Password required", "Password prompt", [{
                        prompt: "Password:",
                        echo: false
                    }]);
                });
            default:
                throw new Error("Server saw USERAUTH_REQUEST " + method +
                    " but expected " + expectedStage);
        }
    }).on("USERAUTH_INFO_RESPONSE", function(responses) {
        assert.equal(expectedStages.shift(), "SERVER_SEES_KEYBOARD_RES");
        assert.deepEqual(responses, ["seekrit"]);
        process.nextTick(function() {
            server.authSuccess();
        });
    });


    client.on("USERAUTH_PK_OK", function() {
        assert.equal(expectedStages.shift(), "CLIENT_SEES_PK_OK");
    }).on("USERAUTH_FAILURE", function() {
        var expectedStage = expectedStages.shift();
        if (expectedStage !== "CLIENT_SEES_USERAUTH_FAILURE_PK" &&
            expectedStage !== "CLIENT_SEES_USERAUTH_FAILURE_PASSWORD") {
            throw new Error("Client saw USERAUTH_FAILURE but expected " +
                expectedStage);
        }
    }).on("USERAUTH_INFO_REQUEST", function(name, inst, lang, prompts) {
        assert.equal(expectedStages.shift(), "CLIENT_SEES_KEYBOARD_REQ");
        assert.equal(name, "Password required");
        assert.equal(inst, "Password prompt");
        assert.equal(lang, "");
        assert.deepEqual(prompts, [{
            prompt: "Password:",
            echo: false
        }]);
        process.nextTick(function() {
            client.authInfoRes(["seekrit"]);
        });
    }).on("USERAUTH_SUCCESS", function() {
        assert.equal(expectedStages.shift(), "CLIENT_SEES_USERAUTH_SUCCESS");
        assert.equal(expectedStages.shift(), undefined);
        done();
    });

    // Silly to submit all these auths at once, but allowed by RFC4252
    client.authPK("bob", PARSED_CLIENT_PUB_KEY);
    client.authPK("bob", PARSED_CLIENT_PUB_KEY, signWithClientKey);
    client.authPassword("bob", "seekrit");
    client.authKeyboard("bob");
}

describe("SSH-Streams", function () {
    describe("packet60", function () {
        it("publickey", function (done) {
            makePair(publickey, done);
        });

        it("keyboardInteractive", function (done) {
            makePair(keyboardInteractive, done);
        });

        it("mixedMethods", function (done) {
            makePair(mixedMethods, done);
        });
    });
});
