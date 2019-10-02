import Component from '../../Component';
import flatten_reference from '../../utils/flatten_reference';
import { create_scopes, Scope, extract_names } from '../../utils/scope';
import { Node } from '../../../interfaces';
import { globals , sanitize } from '../../../utils/names';
import deindent from '../../utils/deindent';
import Wrapper from '../../render_dom/wrappers/shared/Wrapper';
import TemplateScope from './TemplateScope';
import get_object from '../../utils/get_object';
import Block from '../../render_dom/Block';
import { INode } from '../interfaces';
import is_dynamic from '../../render_dom/wrappers/shared/is_dynamic';
import { invalidate } from '../../utils/invalidate';

const {
	acorn: { isReference, estreeWalker: { walk } }
} = adone;

const binary_operators: Record<string, number> = {
	'**': 15,
	'*': 14,
	'/': 14,
	'%': 14,
	'+': 13,
	'-': 13,
	'<<': 12,
	'>>': 12,
	'>>>': 12,
	'<': 11,
	'<=': 11,
	'>': 11,
	'>=': 11,
	in: 11,
	instanceof: 11,
	'==': 10,
	'!=': 10,
	'===': 10,
	'!==': 10,
	'&': 9,
	'^': 8,
	'|': 7
};

const logical_operators: Record<string, number> = {
	'&&': 6,
	'||': 5
};

const precedence: Record<string, (node?: Node) => number> = {
	Literal: () => 21,
	Identifier: () => 21,
	ParenthesizedExpression: () => 20,
	MemberExpression: () => 19,
	NewExpression: () => 19, // can be 18 (if no args) but makes no practical difference
	CallExpression: () => 19,
	UpdateExpression: () => 17,
	UnaryExpression: () => 16,
	BinaryExpression: (node: Node) => binary_operators[node.operator],
	LogicalExpression: (node: Node) => logical_operators[node.operator],
	ConditionalExpression: () => 4,
	AssignmentExpression: () => 3,
	YieldExpression: () => 2,
	SpreadElement: () => 1,
	SequenceExpression: () => 0
};

type Owner = Wrapper | INode;

export default class Expression {
	type: 'Expression' = 'Expression';
	component: Component;
	owner: Owner;
	node: any;
	snippet: string;
	references: Set<string>;
	dependencies: Set<string> = new Set();
	contextual_dependencies: Set<string> = new Set();

	template_scope: TemplateScope;
	scope: Scope;
	scope_map: WeakMap<Node, Scope>;

	is_synthetic: boolean;
	declarations: string[] = [];
	uses_context = false;

	rendered: string;

	// todo: owner type
	constructor(component: Component, owner: Owner, template_scope: TemplateScope, info, lazy?: boolean) {
		// TODO revert to direct property access in prod?
		Object.defineProperties(this, {
			component: {
				value: component
			}
		});

		this.node = info;
		this.template_scope = template_scope;
		this.owner = owner;
		// @ts-ignore
		this.is_synthetic = owner.is_synthetic;

		const { dependencies, contextual_dependencies } = this;

		let { map, scope } = create_scopes(info);
		this.scope = scope;
		this.scope_map = map;

		const expression = this;
		let function_expression;

		// discover dependencies, but don't change the code yet
		walk(info, {
			enter(node: any, parent: any, key: string) {
				// don't manipulate shorthand props twice
				if (key === 'value' && parent.shorthand) return;

				if (map.has(node)) {
					scope = map.get(node);
				}

				if (!function_expression && /FunctionExpression/.test(node.type)) {
					function_expression = node;
				}

				if (isReference(node, parent)) {
					const { name, nodes } = flatten_reference(node);

					if (scope.has(name)) return;

					if (globals.has(name) && !component.var_lookup.has(name)) return;

					if (name[0] === '$' && template_scope.names.has(name.slice(1))) {
						component.error(node, {
							code: `contextual-store`,
							message: `Stores must be declared at the top level of the component (this may change in a future version of Svelte)`
						});
					}

					if (template_scope.is_let(name)) {
						if (!function_expression) { // TODO should this be `!lazy` ?
							contextual_dependencies.add(name);
							dependencies.add(name);
						}
					} else if (template_scope.names.has(name)) {
						expression.uses_context = true;

						contextual_dependencies.add(name);

						const owner = template_scope.get_owner(name);
						const is_index = owner.type === 'EachBlock' && owner.key && name === owner.index;

						if (!lazy || is_index) {
							template_scope.dependencies_for_name.get(name).forEach(name => dependencies.add(name));
						}
					} else {
						if (!lazy) {
							dependencies.add(name);
						}

						component.add_reference(name);
						component.warn_if_undefined(name, nodes[0], template_scope);
					}

					this.skip();
				}

				// track any assignments from template expressions as mutable
				let names;
				let deep = false;

				if (function_expression) {
					if (node.type === 'AssignmentExpression') {
						deep = node.left.type === 'MemberExpression';
						names = deep
							? [get_object(node.left).name]
							: extract_names(node.left);
					} else if (node.type === 'UpdateExpression') {
						const { name } = get_object(node.argument);
						names = [name];
					}
				}

				if (names) {
					names.forEach(name => {
						if (template_scope.names.has(name)) {
							template_scope.dependencies_for_name.get(name).forEach(name => {
								const variable = component.var_lookup.get(name);
								if (variable) variable[deep ? 'mutated' : 'reassigned'] = true;
							});
						} else {
							component.add_reference(name);

							const variable = component.var_lookup.get(name);
							if (variable) variable[deep ? 'mutated' : 'reassigned'] = true;
						}
					});
				}
			},

			leave(node) {
				if (map.has(node)) {
					scope = scope.parent;
				}

				if (node === function_expression) {
					function_expression = null;
				}
			}
		});
	}

	dynamic_dependencies() {
		return Array.from(this.dependencies).filter(name => {
			if (this.template_scope.is_let(name)) return true;
			if (name === '$$props') return true;

			const variable = this.component.var_lookup.get(name);
			return is_dynamic(variable);
		});
	}

	get_precedence() {
		return this.node.type in precedence ? precedence[this.node.type](this.node) : 0;
	}

	// TODO move this into a render-dom wrapper?
	render(block?: Block) {
		if (this.rendered) return this.rendered;

		const {
			component,
			declarations,
			scope_map: map,
			template_scope,
			owner,
			is_synthetic
		} = this;
		let scope = this.scope;

		const { code } = component;

		let function_expression;

		let dependencies: Set<string>;
		let contextual_dependencies: Set<string>;

		// rewrite code as appropriate
		walk(this.node, {
			enter(node: any, parent: any, key: string) {
				// don't manipulate shorthand props twice
				if (key === 'value' && parent.shorthand) return;

				code.addSourcemapLocation(node.start);
				code.addSourcemapLocation(node.end);

				if (map.has(node)) {
					scope = map.get(node);
				}

				if (isReference(node, parent)) {
					const { name, nodes } = flatten_reference(node);

					if (scope.has(name)) return;
					if (globals.has(name) && !component.var_lookup.has(name)) return;

					if (function_expression) {
						if (template_scope.names.has(name)) {
							contextual_dependencies.add(name);

							template_scope.dependencies_for_name.get(name).forEach(dependency => {
								dependencies.add(dependency);
							});
						} else {
							dependencies.add(name);
							component.add_reference(name); // TODO is this redundant/misplaced?
						}
					} else if (!is_synthetic && is_contextual(component, template_scope, name)) {
						code.prependRight(node.start, key === 'key' && parent.shorthand
							? `${name}: ctx.`
							: 'ctx.');
					}

					if (node.type === 'MemberExpression') {
						nodes.forEach(node => {
							code.addSourcemapLocation(node.start);
							code.addSourcemapLocation(node.end);
						});
					}

					this.skip();
				}

				if (!function_expression) {
					if (node.type === 'AssignmentExpression') {
						// TODO should this be a warning/error? `<p>{foo = 1}</p>`
					}

					if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
						function_expression = node;
						dependencies = new Set();
						contextual_dependencies = new Set();
					}
				}
			},

			leave(node: Node, parent: Node) {
				if (map.has(node)) scope = scope.parent;

				if (node === function_expression) {
					const name = component.get_unique_name(
						sanitize(get_function_name(node, owner))
					);

					const args = contextual_dependencies.size > 0
						? [`{ ${Array.from(contextual_dependencies).join(', ')} }`]
						: [];

					let original_params;

					if (node.params.length > 0) {
						original_params = code.slice(node.params[0].start, node.params[node.params.length - 1].end);
						args.push(original_params);
					}

					const body = code.slice(node.body.start, node.body.end).trim();

					const fn = node.type === 'FunctionExpression'
						? `${node.async ? 'async ' : ''}function${node.generator ? '*' : ''} ${name}(${args.join(', ')}) ${body}`
						: `const ${name} = ${node.async ? 'async ' : ''}(${args.join(', ')}) => ${body};`;

					if (dependencies.size === 0 && contextual_dependencies.size === 0) {
						// we can hoist this out of the component completely
						component.fully_hoisted.push(fn);
						code.overwrite(node.start, node.end, name);

						component.add_var({
							name,
							internal: true,
							hoistable: true,
							referenced: true
						});
					}

					else if (contextual_dependencies.size === 0) {
						// function can be hoisted inside the component init
						component.partly_hoisted.push(fn);
						code.overwrite(node.start, node.end, `ctx.${name}`);

						component.add_var({
							name,
							internal: true,
							referenced: true
						});
					}

					else {
						// we need a combo block/init recipe
						component.partly_hoisted.push(fn);
						code.overwrite(node.start, node.end, name);

						component.add_var({
							name,
							internal: true,
							referenced: true
						});

						declarations.push(deindent`
							function ${name}(${original_params ? '...args' : ''}) {
								return ctx.${name}(ctx${original_params ? ', ...args' : ''});
							}
						`);
					}

					if (parent && parent.method) {
						code.prependRight(node.start, ': ');
					}

					function_expression = null;
					dependencies = null;
					contextual_dependencies = null;
				}

				if (node.type === 'AssignmentExpression' || node.type === 'UpdateExpression') {
					const assignee = node.type === 'AssignmentExpression' ? node.left : node.argument;

					// normally (`a = 1`, `b.c = 2`), there'll be a single name
					// (a or b). In destructuring cases (`[d, e] = [e, d]`) there
					// may be more, in which case we need to tack the extra ones
					// onto the initial function call
					const names = new Set(extract_names(assignee));

					const traced: Set<string> = new Set();
					names.forEach(name => {
						const dependencies = template_scope.dependencies_for_name.get(name);
						if (dependencies) {
							dependencies.forEach(name => traced.add(name));
						} else {
							traced.add(name);
						}
					});

					invalidate(component, scope, code, node, traced);
				}
			}
		});

		if (declarations.length > 0) {
			block.maintain_context = true;
			declarations.forEach(declaration => {
				block.builders.init.add_block(declaration);
			});
		}

		return this.rendered = `[✂${this.node.start}-${this.node.end}✂]`;
	}
}

function get_function_name(_node, parent) {
	if (parent.type === 'EventHandler') {
		return `${parent.name}_handler`;
	}

	if (parent.type === 'Action') {
		return `${parent.name}_function`;
	}

	return 'func';
}

function is_contextual(component: Component, scope: TemplateScope, name: string) {
	if (name === '$$props') return true;

	// if it's a name below root scope, it's contextual
	if (!scope.is_top_level(name)) return true;

	const variable = component.var_lookup.get(name);

	// hoistables, module declarations, and imports are non-contextual
	if (!variable || variable.hoistable) return false;

	// assume contextual
	return true;
}