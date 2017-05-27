const { regex, command } = adone.util.shebang;

describe("util", "shebang", () => {
    it("regex", () => {
        assert.isTrue(regex.test('#!/usr/bin/env node\nconsole.log("unicorns");'));
        assert.equal(regex.exec("#!/usr/bin/env node")[1], "/usr/bin/env node");
    });

    it("command", () => {
        assert.equal(command("#!/usr/bin/env node"), "node");
        assert.equal(command("#!/bin/bash"), "bash");
        assert.equal(command("#!/bin/bash -ex"), "bash -ex");
        assert.equal(command("#! /bin/bash"), "bash");
        assert.equal(command("#! /bin/bash -ex"), "bash -ex");
        assert.equal(command("#!/sh"), "sh");
        assert.equal(command("node"), null);
    });

});
