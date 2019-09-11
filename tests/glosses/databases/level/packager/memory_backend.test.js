describe("Memory backend", () => {
    const level = adone.database.level.packager(adone.database.level.backend.Memory);

    require("./abstract/base")(level);
    require("./abstract/db_values")(level, true);
});
