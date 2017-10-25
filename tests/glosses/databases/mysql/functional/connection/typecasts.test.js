import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "typecasts", () => {
    const { is } = adone;
    let connection = null;

    before(async () => {
        connection = await createConnection();
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should apply typeCasts handler", async () => {
        const [res] = await connection.query({
            sql: 'select "foo uppercase" as foo',
            typeCast(field, next) {
                if (field.type === "VAR_STRING") {
                    return field.string().toUpperCase();
                }
                return next();
            }
        });
        assert.equal(res[0].foo, "FOO UPPERCASE");
    });

    it("should not type cast if false", async () => {
        const [res] = await connection.query({
            sql: 'select "foobar" as foo',
            typeCast: false
        });
        assert(is.buffer(res[0].foo));
        assert.equal(res[0].foo.toString("utf8"), "foobar");
    });

    it("should properly work with null value", async () => {
        const [res] = await connection.query({
            sql: "SELECT NULL as test, 6 as value;",
            typeCast(field, next) {
                return next();
            }
        });
        assert.equal(res[0].test, null);
        assert.equal(res[0].value, 6);
    });
});
