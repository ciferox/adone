#!/usr/bin/env node

import adone from "adone";
import pkg from "..";

class $$$App extends adone.Application {
    initialize() {

    }

    main() {

    }

    uninitialize() {

    }

    onOptionVersion() {
        adone.log(pkg.version);
        return this.exit();
    }
}

new $$$App().run();
