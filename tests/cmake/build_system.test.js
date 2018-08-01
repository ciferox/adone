import testRunner from "./test_runner";
import testCases from "./test_cases";

const {
    is,
    cmake: { CMake }
} = adone;

describe("cmake", "BuildSystem", function () {
    this.timeout(300000);

    describe("Build with various options", () => {
        testRunner.runCase(testCases.buildPrototypeWithDirectoryOption);
    });

    

    it("should provide list of generators", async () => {
        const gens = await CMake.getGenerators();
        assert(is.array(gens));
        assert(gens.length > 0);
        assert.equal(gens.filter((g) => {
            return g.length;
        }).length, gens.length);
    });

    it("should rebuild prototype if cwd is the source directory", async () => {
        await testCases.buildPrototype2WithCWD();
    });

    it("should run with old GNU compilers", async () => {
        await testCases.shouldConfigurePreC11Properly();
    });

    it("should configure with custom option", async () => {
        await testCases.configureWithCustomOptions();
    });
});
