import { runFixtureTests } from "./helpers/runFixtureTests";

const {
    js: { parse },
    std: { path }
} = adone;

runFixtureTests(path.join(__dirname, "fixtures"), parse);
