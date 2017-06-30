import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "change user", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query("GRANT ALL ON *.* TO 'changeuser1'@'%' IDENTIFIED BY 'changeuser1pass'");
        await connection.query("GRANT ALL ON *.* TO 'changeuser2'@'%' IDENTIFIED BY 'changeuser2pass'");
        await connection.query("FLUSH PRIVILEGES");
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    const onlyUsername = (name) => name.substring(0, name.indexOf("@"));

    it("should work", async () => {
        await connection.changeUser({
            user: "changeuser1",
            password: "changeuser1pass"
        });
        let [rows] = await connection.query("select current_user()");
        expect(onlyUsername(rows[0]["current_user()"])).to.be.equal("changeuser1");

        await connection.changeUser({
            user: "changeuser2",
            password: "changeuser2pass"
        });
        [rows] = await connection.query("select current_user()");
        expect(onlyUsername(rows[0]["current_user()"])).to.be.equal("changeuser2");
    });

    it("should work using sha1 password hash", async () => {
        await connection.changeUser({
            user: "changeuser1",
            passwordSha1: Buffer.from("f961d39c82138dcec42b8d0dcb3e40a14fb7e8cd", "hex")
        });

        const [rows] = await connection.query("select current_user()");
        expect(onlyUsername(rows[0]["current_user()"])).to.be.equal("changeuser1");
    });
});
