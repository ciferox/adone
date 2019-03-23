const {
    std: { path }
} = adone;
import testRunner from "@babel/helper-transform-fixture-test-runner";

export default function (loc) {
    const name = path.basename(path.dirname(loc));
    testRunner(`${loc}/fixtures`, name);
}
