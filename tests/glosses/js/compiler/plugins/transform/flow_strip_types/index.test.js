import fixtureTestRunner from "../../../fixture_test_runner";
fixtureTestRunner(
    adone.std.path.join(__dirname, "/fixtures"),
    ["glosses", "js", "compiler", "plugins", "flowStripTypes"]
);
