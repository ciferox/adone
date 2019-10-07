describe("packager", "MemoryBackend", () => {
    const level = adone.database.level.packager(adone.database.level.backend.MemoryBackend);

    require("./abstract/base")(level);
    require("./abstract/db_values")(level, true);
});
