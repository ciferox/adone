import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "track state change", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should track system variables changes", async () => {
        const [res] = await connection.query("SET NAMES koi8r");

        expect(res.stateChanges.systemVariables).to.be.deep.equal({
            character_set_connection: "koi8r",  // eslint-disable-line
            character_set_client: "koi8r",  // eslint-disable-line
            character_set_results: "koi8r"  // eslint-disable-line
        });
    });

    it("should track schema changes", async () => {
        const [res] = await connection.query("USE mysql");

        expect(res.stateChanges.schema).to.be.equal("mysql");
    });
});
