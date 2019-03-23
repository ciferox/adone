import { runFixtureTests } from "./helpers/runFixtureTests";

const {
    js: { parseExpression },
    std: { path }
} = adone;

runFixtureTests(path.join(__dirname, "expressions"), parseExpression);
