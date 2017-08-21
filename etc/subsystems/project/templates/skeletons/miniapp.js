#!/usr/bin/env node

import adone from "adone";

adone.application.run({
    initialize() {

    },
    main() {

    },
    uninitialize() {
        
    }
});


const { std: { path } } = adone;

export default {
    project: {
        name: "{{ name }}",
        structure: {
            {{ bin }}
            {{ lib }}
        }
    }
};
