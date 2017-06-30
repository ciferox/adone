import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "prepare simple", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should prepare", async () => {
        const s = await connection.prepare("select 1 + ? + ? as test");
        expect(s.query).to.be.equal("select 1 + ? + ? as test");
        expect(s.id).to.be.at.least(0);
        expect(s.columns).to.have.lengthOf(1);
        expect(s.parameters).to.have.lengthOf(2);
        s.close();
    });

    it("should prepare without parameters", async () => {
        const s = await connection.prepare("select 1 + 1");
        expect(s.query).to.be.equal("select 1 + 1");
        expect(s.id).to.be.at.least(0);
        expect(s.columns).to.have.lengthOf(1);
        expect(s.parameters).to.have.lengthOf(0);
        s.close();
    });

    it("should prepare without parameters and columns", async () => {
        const s = await connection.prepare("create temporary table aaa(i int)");
        expect(s.query).to.be.equal("create temporary table aaa(i int)");
        expect(s.id).to.be.at.least(0);
        expect(s.columns).to.have.lengthOf(0);
        expect(s.parameters).to.have.lengthOf(0);
        s.close();
    });
});
