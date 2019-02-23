const {
    project
} = adone;

const TEMPLATE =
`export default function () {
    return "{{name}}";
}
`;

export default class GlossTask extends project.BaseTask {
    async main(input) {
        return project.helper.createFile(TEMPLATE, input);
    }
}
