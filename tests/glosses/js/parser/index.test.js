import { runFixtureTests } from "./helpers/runFixtureTests";

const {
    js: { parse },
    path
} = adone;

runFixtureTests(path.join(__dirname, "fixtures"), parse);
