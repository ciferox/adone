const {
    std: { path }
} = adone;
import testRunner from "./helper_transform_fixture_test_runner";

export default function (loc) {
    const name = path.basename(path.dirname(loc));
    testRunner(`${loc}/fixtures`, name);
}
