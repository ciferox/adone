import { runThrowTestsWithEstree } from "./helpers/runFixtureTests";

const {
    js: { parse },
    path
} = adone;

runThrowTestsWithEstree(path.join(__dirname, "fixtures"), parse);
