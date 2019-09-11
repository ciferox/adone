describe("LevelDB backend", () => {
    require("./abstract")(adone.database.level.packager(adone.database.level.backend.LevelDB));
});
