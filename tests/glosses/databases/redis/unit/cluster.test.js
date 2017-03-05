/* global describe it beforeEach afterEach */

import { stub } from "sinon";
import Cluster from "adone/glosses/databases/redis/cluster";

describe("cluster", function () {
    beforeEach(function () {
        stub(Cluster.prototype, "connect", function () {
            return Promise.resolve();
        });
    });

    afterEach(function () {
        Cluster.prototype.connect.restore();
    });

    it("should support frozen options", function () {
        let options = Object.freeze({ maxRedirections: 1000 });
        let cluster = new Cluster([{ port: 7777 }], options);
        expect(cluster.options).to.have.property("showFriendlyErrorStack", false);
        expect(cluster.options).to.have.property("showFriendlyErrorStack", false);
        expect(cluster.options).to.have.property("scaleReads", "master");
    });

    it("throws when scaleReads is invalid", function () {
        expect(function () {
            new Cluster([{}], { scaleReads: "invalid" });
        }).to.throw(/Invalid option scaleReads/);
    });

    describe("#nodes()", function () {
        it("throws when role is invalid", function () {
            let cluster = new Cluster([{}]);
            expect(function () {
                cluster.nodes("invalid");
            }).to.throw(/Invalid role/);
        });
    });
});
