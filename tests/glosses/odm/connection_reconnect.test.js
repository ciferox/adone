const start = require("./common");
const mongoose = adone.odm;

describe("connection: manual reconnect with authReconnect: false", () => {
    it("should continue processing queries/writes", (done) => {
        // connect to mongod
        // perform writes/queries
        // take mongod down
        // bring mongod up
        // writes/queries should work
        //   - should not get 'no open connections' error

        const db = mongoose.createConnection();

        db.open(start.uri, { server: { auto_reconnect: false } });

        const M = db.model("autoReconnect", { name: String });

        let open = false;
        let times = 0;

        db.on("open", () => {
            ++times;
            open = true;
            hit();
        });

        db.on("disconnected", () => {
            open = false;
            setTimeout(() => {
                db.open(start.uri, { server: { auto_reconnect: false } });
            }, 30);
        });

        function hit() {
            if (!open) {
                return;
            }
            M.create({ name: times }, (err, doc) => {
                if (err) {
                    return complete(err);
                }
                M.findOne({ _id: doc._id }, (err) => {
                    if (err) {
                        return complete(err);
                    }
                    if (times > 1) {
                        return complete();
                    }
                    shutdownMongo();
                });
            });
        }

        function shutdownMongo() {
            db.db.close();
        }

        function complete(err) {
            if (complete.ran) {
                return;
            }
            complete.ran = 1;
            done(err);
        }
    });
});
