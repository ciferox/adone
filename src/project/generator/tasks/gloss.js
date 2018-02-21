const {
    project
} = adone;

const TEMPLATE =
`export default function () {
    return "{{name}}";
}
`;

export default class GlossTask extends project.generator.task.Base {
    async run(input) {
        return project.generator.helper.createFile(TEMPLATE, input);
    }
}
