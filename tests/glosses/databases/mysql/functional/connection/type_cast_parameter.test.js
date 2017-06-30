import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "type cast parameter", () => {
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


    it("should uppecase", async () => {
        const [rows] = await connection.query({
            sql: 'select "foo uppercase" as foo',
            typeCast(field, next) {
                if (field.type == "VAR_STRING") {
                    return field.string().toUpperCase();
                }
                return next();
            }
        });
        expect(rows[0].foo).to.be.equal("FOO UPPERCASE");
    });

    it("should return a buffer", async () => {
        const [rows] = await connection.query({
            sql: 'select "foobar" as foo',
            typeCast: false
        });
        expect(is.buffer(rows[0].foo)).to.be.true;
        expect(rows[0].foo.toString()).to.be.equal("foobar");
    });
});
