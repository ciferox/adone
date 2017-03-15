import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "config", "typecast", function connectTimeout() {
    const typeCastWrapper = (stringMethod) => {
        return (field, next) => {
            if (field.type === "VAR_STRING") {
                return field.string()[stringMethod]();
            }
            return next();
        };
    };

    let connection = null;

    before(async () => {
        connection = await createConnection({
            typeCast: typeCastWrapper("toUpperCase")
        });
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should be uppercased", async () => {
        const [res] = await connection.query({
            sql: 'select "foobar" as foo'
        });

        expect(res[0].foo).to.be.equal("FOOBAR");
    });

    it("should use a custom typecast function", async () => {
        const [res] = await connection.query({
            sql: 'select "FOOBAR" as foo',
            typeCast: typeCastWrapper("toLowerCase")
        });

        expect(res[0].foo).to.be.equal("foobar");
    });
});
