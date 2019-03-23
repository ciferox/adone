import { runThrowTestsWithEstree } from "./helpers/runFixtureTests";

const {
    js: { parse },
    std: { path }
} = adone;

runThrowTestsWithEstree(path.join(__dirname, "fixtures"), parse);
