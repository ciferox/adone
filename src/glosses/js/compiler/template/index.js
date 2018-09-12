import * as formatters from "./formatters";
import createTemplateBuilder from "./builder";

export const smart = createTemplateBuilder(formatters.smart);
export const statement = createTemplateBuilder(formatters.statement);
export const statements = createTemplateBuilder(formatters.statements);
export const expression = createTemplateBuilder(formatters.expression);
export const program = createTemplateBuilder(formatters.program);

export default Object.assign(
    smart.bind(undefined),
    {
        smart,
        statement,
        statements,
        expression,
        program,
        ast: smart.ast
    },
);
