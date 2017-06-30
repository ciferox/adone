import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "type cast geometry", () => {
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

    it("should cast geometry using object", async () => {
        const [rows] = await connection.query({
            sql: "select GeomFromText('POINT(11 0)') as foo",
            typeCast(field, next) {
                if (field.type === "GEOMETRY") {
                    return field.geometry();
                }
                return next();
            }
        });
        expect(rows[0].foo).to.be.deep.equal({ x: 11, y: 0 });
    });

    it("should cast geometry using buffer", async () => {
        const [rows] = await connection.query({
            sql: "select GeomFromText('POINT(11 0)') as foo",
            typeCast(field, next) {
                if (field.type === "GEOMETRY") {
                    return field.buffer();
                }
                return next();
            }
        });
        expect(is.buffer(rows[0].foo)).to.be.true;
    });
});
