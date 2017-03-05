/* global describe it */

import { stub } from "sinon";
import Connector from "adone/glosses/databases/redis/connectors/connector";

let net = adone.std.net;
let tls = adone.std.tls;

describe("Connector", function () {
    describe("connect()", function () {
        it("first tries path", function (done) {
            stub(net, "createConnection");
            let connector = new Connector({ port: 6379, path: "/tmp" });
            connector.connect(function () {
                net.createConnection.calledWith({ path: "/tmp" });
                net.createConnection.restore();
                done();
            });
        });

        it("supports tls", function (done) {
            stub(tls, "connect");
            let connector = new Connector({ port: 6379, tls: "on" });
            connector.connect(function () {
                tls.connect.calledWith({ port: 6379, tls: "on" });
                tls.connect.restore();
                done();
            });
        });
    });
});

