describe("glosses", "templating", "nunjucks", "parser", () => {
    const { templating: { nunjucks: { nodes, parser } }, is } = adone;

    const _isAST = (node1, node2) => {
        // Compare ASTs
        // TODO: Clean this up (seriously, really)

        expect(node1.typename).to.be.equal(node2.typename);

        if (node2 instanceof nodes.NodeList) {
            const lit = ": num-children: ";
            const sig2 = (node2.typename + lit + node2.children.length);

            expect(node1.children).to.be.ok;
            const sig1 = (node1.typename + lit + node1.children.length);

            expect(sig1).to.be.equal(sig2);

            for (let i = 0, l = node2.children.length; i < l; i++) {
                _isAST(node1.children[i], node2.children[i]);
            }
        } else {
            node2.iterFields((value, field) => {
                const ofield = node1[field];

                if (value instanceof nodes.Node) {
                    _isAST(ofield, value);
                } else if (is.array(ofield) && is.array(value)) {
                    expect(`num-children: ${ofield.length}`).to.be.equal(`num-children: ${value.length}`);

                    ofield.forEach((v, i) => {
                        if (ofield[i] instanceof nodes.Node) {
                            _isAST(ofield[i], value[i]);
                        } else if (ofield[i] !== null && value[i] !== null) {
                            expect(ofield[i]).to.be.equal(value[i]);
                        }
                    });
                } else if ((ofield !== null || value !== null) &&
                    (ofield !== undefined || value !== undefined)) {
                    if (ofield === null) {
                        throw new Error(`${value} expected for "${field
                            }", null found`);
                    }

                    if (value === null) {
                        throw new Error(`${ofield} expected to be null for "${
                            field}"`);
                    }

                    // We want good errors and tracebacks, so test on
                    // whichever object exists
                    if (!ofield) {
                        expect(value).to.be.equal(ofield);
                    } else if (ofield !== null && ofield instanceof RegExp) {
                        // This conditional check for RegExp is needed because /a/ != /a/
                        expect(String(ofield)).to.be.equal(String(value));
                    } else {
                        expect(ofield).to.be.equal(value);
                    }
                }
            });
        }
    };

    // We'll be doing a lot of AST comparisons, so this defines a kind
    // of "AST literal" that you can specify with arrays. This
    // transforms it into a real AST.
    const toNodes = (ast) => {
        if (!(ast && is.array(ast))) {
            return ast;
        }

        const type = ast[0];
        // some nodes have fields (e.g. Compare.ops) which are plain arrays
        if (type instanceof Array) {
            return ast.map(toNodes);
        }
        const F = function () { };
        F.prototype = type.prototype;

        const dummy = new F();

        if (dummy instanceof nodes.NodeList) {
            return new type(0, 0, ast.slice(1).map(toNodes));
        } else if (dummy instanceof nodes.CallExtension) {
            return new type(ast[1], ast[2], ast[3] ? toNodes(ast[3]) : ast[3],
                is.array(ast[4]) ? ast[4].map(toNodes) : ast[4]);
        } else {
            return new type(0, 0,
                toNodes(ast[1]),
                toNodes(ast[2]),
                toNodes(ast[3]),
                toNodes(ast[4]),
                toNodes(ast[5]));
        }
    };

    const isAST = (node1, ast) => {
        // Compare the ASTs, the second one is an AST literal so transform
        // it into a real one
        return _isAST(node1, toNodes(ast));
    };

    it("should parse basic types", () => {
        isAST(parser.parse("{{ 1 }}"), [nodes.Root, [nodes.Output, [nodes.Literal, 1]]]);

        isAST(parser.parse("{{ 4.567 }}"), [nodes.Root, [nodes.Output, [nodes.Literal, 4.567]]]);

        isAST(parser.parse('{{ "foo" }}'),
            [nodes.Root,
                [nodes.Output,
            [nodes.Literal, "foo"]]]);

        isAST(parser.parse("{{ 'foo' }}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.Literal, "foo"]]]);

        isAST(parser.parse("{{ true }}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.Literal, true]]]);

        isAST(parser.parse("{{ false }}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.Literal, false]]]);

        isAST(parser.parse("{{ none }}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.Literal, null]]]);

        isAST(parser.parse("{{ foo }}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.Symbol, "foo"]]]);

        isAST(parser.parse("{{ r/23/gi }}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.Literal, new RegExp("23", "gi")]]]);
    });

    it("should parse aggregate types", () => {
        isAST(parser.parse("{{ [1,2,3] }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Array,
            [nodes.Literal, 1],
            [nodes.Literal, 2],
            [nodes.Literal, 3]]]]);

        isAST(parser.parse("{{ (1,2,3) }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Group,
            [nodes.Literal, 1],
            [nodes.Literal, 2],
            [nodes.Literal, 3]]]]);

        isAST(parser.parse("{{ {foo: 1, 'two': 2} }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Dict,
                        [nodes.Pair,
            [nodes.Symbol, "foo"],
            [nodes.Literal, 1]],
                        [nodes.Pair,
            [nodes.Literal, "two"],
            [nodes.Literal, 2]]]]]);
    });

    it("should parse variables", () => {
        isAST(parser.parse("hello {{ foo }}, how are you"),
            [nodes.Root,
            [nodes.Output, [nodes.TemplateData, "hello "]],
            [nodes.Output, [nodes.Symbol, "foo"]],
            [nodes.Output, [nodes.TemplateData, ", how are you"]]]);
    });

    it("should parse operators", () => {
        isAST(parser.parse("{{ x == y }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Compare,
            [nodes.Symbol, "x"],
            [[nodes.CompareOperand, [nodes.Symbol, "y"], "=="]]]]]);

        isAST(parser.parse("{{ x or y }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Or,
            [nodes.Symbol, "x"],
            [nodes.Symbol, "y"]]]]);

        isAST(parser.parse("{{ x in y }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.In,
            [nodes.Symbol, "x"],
            [nodes.Symbol, "y"]]]]);

        isAST(parser.parse("{{ x not in y }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Not,
                        [nodes.In,
            [nodes.Symbol, "x"],
            [nodes.Symbol, "y"]]]]]);
    });

    it("should parse tilde", () => {
        isAST(parser.parse("{{ 2 ~ 3 }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Concat,
            [nodes.Literal, 2],
            [nodes.Literal, 3]
                    ]]]
        );
    });

    it("should parse operators with correct precedence", () => {
        isAST(parser.parse("{{ x in y and z }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.And,
                        [nodes.In,
            [nodes.Symbol, "x"],
            [nodes.Symbol, "y"]],
            [nodes.Symbol, "z"]]]]);

        isAST(parser.parse("{{ x not in y or z }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Or,
                        [nodes.Not,
                            [nodes.In,
            [nodes.Symbol, "x"],
            [nodes.Symbol, "y"]]],
            [nodes.Symbol, "z"]]]]);

        isAST(parser.parse("{{ x or y and z }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Or,
            [nodes.Symbol, "x"],
                        [nodes.And,
            [nodes.Symbol, "y"],
            [nodes.Symbol, "z"]]]]]);
    });

    it("should parse blocks", () => {
        let n = parser.parse("want some {% if hungry %}pizza{% else %}" +
            "water{% endif %}?");
        expect(n.children[1].typename).to.be.equal("If");

        n = parser.parse("{% block foo %}stuff{% endblock %}");
        expect(n.children[0].typename).to.be.equal("Block");

        n = parser.parse("{% block foo %}stuff{% endblock foo %}");
        expect(n.children[0].typename).to.be.equal("Block");

        n = parser.parse('{% extends "test.njk" %}stuff');
        expect(n.children[0].typename).to.be.equal("Extends");

        n = parser.parse('{% include "test.njk" %}');
        expect(n.children[0].typename).to.be.equal("Include");
    });

    it("should accept attributes and methods of static arrays, objects and primitives", () => {
        expect(() => {
            parser.parse("{{ ([1, 2, 3]).indexOf(1) }}");
        }).not.to.throw();

        expect(() => {
            parser.parse("{{ [1, 2, 3].length }}");
        }).not.to.throw();

        expect(() => {
            parser.parse('{{ "Some String".replace("S", "$") }}');
        }).not.to.throw();

        expect(() => {
            parser.parse('{{ ({ name : "Khalid" }).name }}');
        }).not.to.throw();

        expect(() => {
            parser.parse("{{ 1.618.toFixed(2) }}");
        }).not.to.throw();
    });

    it("should parse include tags", () => {

        let n = parser.parse('{% include "test.njk" %}');
        expect(n.children[0].typename).to.be.equal("Include");

        n = parser.parse('{% include "test.html"|replace("html","j2") %}');
        expect(n.children[0].typename).to.be.equal("Include");

        n = parser.parse('{% include ""|default("test.njk") %}');
        expect(n.children[0].typename).to.be.equal("Include");
    });

    it("should parse for loops", () => {
        isAST(parser.parse("{% for x in [1, 2] %}{{ x }}{% endfor %}"),
            [nodes.Root,
                [nodes.For,
                    [nodes.Array,
            [nodes.Literal, 1],
            [nodes.Literal, 2]],
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
                        [nodes.Output,
            [nodes.Symbol, "x"]]]]]);

    });

    it("should parse for loops with else", () => {
        isAST(parser.parse("{% for x in [] %}{{ x }}{% else %}empty{% endfor %}"),
            [nodes.Root,
                [nodes.For,
            [nodes.Array],
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
                        [nodes.Output,
            [nodes.Symbol, "x"]]],
                    [nodes.NodeList,
                        [nodes.Output,
            [nodes.TemplateData, "empty"]]]]]);

    });

    it("should parse filters", () => {
        isAST(parser.parse("{{ foo | bar }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Filter,
            [nodes.Symbol, "bar"],
                        [nodes.NodeList,
            [nodes.Symbol, "foo"]]]]]);

        isAST(parser.parse("{{ foo | bar | baz }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Filter,
            [nodes.Symbol, "baz"],
                        [nodes.NodeList,
                            [nodes.Filter,
            [nodes.Symbol, "bar"],
                                [nodes.NodeList,
            [nodes.Symbol, "foo"]]]]]]]);

        isAST(parser.parse("{{ foo | bar(3) }}"),
            [nodes.Root,
                [nodes.Output,
                    [nodes.Filter,
            [nodes.Symbol, "bar"],
                        [nodes.NodeList,
            [nodes.Symbol, "foo"],
            [nodes.Literal, 3]]]]]);
    });

    it("should parse macro definitions", () => {
        const ast = parser.parse('{% macro foo(bar, baz="foobar") %}' +
            "This is a macro" +
            "{% endmacro %}");
        isAST(ast,
            [nodes.Root,
                [nodes.Macro,
            [nodes.Symbol, "foo"],
                    [nodes.NodeList,
            [nodes.Symbol, "bar"],
                        [nodes.KeywordArgs,
                            [nodes.Pair,
            [nodes.Symbol, "baz"], [nodes.Literal, "foobar"]]]],
                    [nodes.NodeList,
                        [nodes.Output,
            [nodes.TemplateData, "This is a macro"]]]]]);
    });

    it("should parse call blocks", () => {
        const ast = parser.parse('{% call foo("bar") %}' +
            "This is the caller" +
            "{% endcall %}");
        isAST(ast,
            [nodes.Root,
                [nodes.Output,
                    [nodes.FunCall,
            [nodes.Symbol, "foo"],
                        [nodes.NodeList,
            [nodes.Literal, "bar"],
                            [nodes.KeywordArgs,
                                [nodes.Pair,
            [nodes.Symbol, "caller"],
                                [nodes.Caller,
            [nodes.Symbol, "caller"],
            [nodes.NodeList],
                                [nodes.NodeList,
                                [nodes.Output,
            [nodes.TemplateData, "This is the caller"]]]]]]]]]]);
    });

    it("should parse call blocks with args", () => {
        const ast = parser.parse('{% call(i) foo("bar", baz="foobar") %}' +
            "This is {{ i }}" +
            "{% endcall %}");
        isAST(ast,
            [nodes.Root,
                [nodes.Output,
                    [nodes.FunCall,
            [nodes.Symbol, "foo"],
                        [nodes.NodeList,
            [nodes.Literal, "bar"],
                            [nodes.KeywordArgs,
                                [nodes.Pair,
            [nodes.Symbol, "baz"], [nodes.Literal, "foobar"]],
                                [nodes.Pair,
            [nodes.Symbol, "caller"],
                                [nodes.Caller,
            [nodes.Symbol, "caller"],
            [nodes.NodeList, [nodes.Symbol, "i"]],
                                [nodes.NodeList,
                                [nodes.Output,
            [nodes.TemplateData, "This is "]],
                                [nodes.Output,
            [nodes.Symbol, "i"]]]]]]]]]]);
    });

    it("should parse raw", () => {
        isAST(parser.parse("{% raw %}hello {{ {% %} }}{% endraw %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "hello {{ {% %} }}"]]]);
    });

    it("should parse raw with broken variables", () => {
        isAST(parser.parse("{% raw %}{{ x }{% endraw %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "{{ x }"]]]);
    });

    it("should parse raw with broken blocks", () => {
        isAST(parser.parse("{% raw %}{% if i_am_stupid }Still do your job well{% endraw %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "{% if i_am_stupid }Still do your job well"]]]);
    });

    it("should parse raw with pure text", () => {
        isAST(parser.parse("{% raw %}abc{% endraw %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "abc"]]]);
    });


    it("should parse raw with raw blocks", () => {
        isAST(parser.parse("{% raw %}{% raw %}{{ x }{% endraw %}{% endraw %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "{% raw %}{{ x }{% endraw %}"]]]);
    });

    it("should parse raw with comment blocks", () => {
        isAST(parser.parse("{% raw %}{# test {% endraw %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "{# test "]]]);
    });

    it("should parse multiple raw blocks", () => {
        isAST(parser.parse("{% raw %}{{ var }}{% endraw %}{{ var }}{% raw %}{{ var }}{% endraw %}"),
            [nodes.Root,
            [nodes.Output, [nodes.TemplateData, "{{ var }}"]],
            [nodes.Output, [nodes.Symbol, "var"]],
            [nodes.Output, [nodes.TemplateData, "{{ var }}"]]]);
    });

    it("should parse multiline multiple raw blocks", () => {
        isAST(parser.parse("\n{% raw %}{{ var }}{% endraw %}\n{{ var }}\n{% raw %}{{ var }}{% endraw %}\n"),
            [nodes.Root,
            [nodes.Output, [nodes.TemplateData, "\n"]],
            [nodes.Output, [nodes.TemplateData, "{{ var }}"]],
            [nodes.Output, [nodes.TemplateData, "\n"]],
            [nodes.Output, [nodes.Symbol, "var"]],
            [nodes.Output, [nodes.TemplateData, "\n"]],
            [nodes.Output, [nodes.TemplateData, "{{ var }}"]],
            [nodes.Output, [nodes.TemplateData, "\n"]]]);
    });

    it("should parse verbatim", () => {
        isAST(parser.parse("{% verbatim %}hello {{ {% %} }}{% endverbatim %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "hello {{ {% %} }}"]]]);
    });

    it("should parse verbatim with broken variables", () => {
        isAST(parser.parse("{% verbatim %}{{ x }{% endverbatim %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "{{ x }"]]]);
    });

    it("should parse verbatim with broken blocks", () => {
        isAST(parser.parse("{% verbatim %}{% if i_am_stupid }Still do your job well{% endverbatim %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "{% if i_am_stupid }Still do your job well"]]]);
    });

    it("should parse verbatim with pure text", () => {
        isAST(parser.parse("{% verbatim %}abc{% endverbatim %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "abc"]]]);
    });


    it("should parse verbatim with verbatim blocks", () => {
        isAST(parser.parse("{% verbatim %}{% verbatim %}{{ x }{% endverbatim %}{% endverbatim %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "{% verbatim %}{{ x }{% endverbatim %}"]]]);
    });

    it("should parse verbatim with comment blocks", () => {
        isAST(parser.parse("{% verbatim %}{# test {% endverbatim %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "{# test "]]]);
    });

    it("should parse multiple verbatim blocks", () => {
        isAST(parser.parse("{% verbatim %}{{ var }}{% endverbatim %}{{ var }}{% verbatim %}{{ var }}{% endverbatim %}"),
            [nodes.Root,
            [nodes.Output, [nodes.TemplateData, "{{ var }}"]],
            [nodes.Output, [nodes.Symbol, "var"]],
            [nodes.Output, [nodes.TemplateData, "{{ var }}"]]]);
    });

    it("should parse multiline multiple verbatim blocks", () => {
        isAST(parser.parse("\n{% verbatim %}{{ var }}{% endverbatim %}\n{{ var }}\n{% verbatim %}{{ var }}{% endverbatim %}\n"),
            [nodes.Root,
            [nodes.Output, [nodes.TemplateData, "\n"]],
            [nodes.Output, [nodes.TemplateData, "{{ var }}"]],
            [nodes.Output, [nodes.TemplateData, "\n"]],
            [nodes.Output, [nodes.Symbol, "var"]],
            [nodes.Output, [nodes.TemplateData, "\n"]],
            [nodes.Output, [nodes.TemplateData, "{{ var }}"]],
            [nodes.Output, [nodes.TemplateData, "\n"]]]);
    });

    it("should parse keyword and non-keyword arguments", () => {
        isAST(parser.parse('{{ foo("bar", falalalala, baz="foobar") }}'),
            [nodes.Root,
                [nodes.Output,
                    [nodes.FunCall,
            [nodes.Symbol, "foo"],
                        [nodes.NodeList,
            [nodes.Literal, "bar"],
            [nodes.Symbol, "falalalala"],
                            [nodes.KeywordArgs,
                                [nodes.Pair,
            [nodes.Symbol, "baz"],
            [nodes.Literal, "foobar"]]]]]]]);
    });

    it("should parse imports", () => {
        isAST(parser.parse('{% import "foo/bar.njk" as baz %}'),
            [nodes.Root,
                [nodes.Import,
            [nodes.Literal, "foo/bar.njk"],
            [nodes.Symbol, "baz"]]]);

        isAST(parser.parse('{% from "foo/bar.njk" import baz, ' +
            "   foobar as foobarbaz %}"),
            [nodes.Root,
                [nodes.FromImport,
            [nodes.Literal, "foo/bar.njk"],
                    [nodes.NodeList,
            [nodes.Symbol, "baz"],
                        [nodes.Pair,
            [nodes.Symbol, "foobar"],
            [nodes.Symbol, "foobarbaz"]]]]]);

        isAST(parser.parse('{% import "foo/bar.html"|replace("html", "j2") as baz %}'),
            [nodes.Root,
                [nodes.Import,
                    [nodes.Filter,
            [nodes.Symbol, "replace"],
                        [nodes.NodeList,
            [nodes.Literal, "foo/bar.html"],
            [nodes.Literal, "html"],
            [nodes.Literal, "j2"]
                        ]
                    ],
            [nodes.Symbol, "baz"]]]);

        isAST(parser.parse('{% from ""|default("foo/bar.njk") import baz, ' +
            "   foobar as foobarbaz %}"),
            [nodes.Root,
                [nodes.FromImport,
                    [nodes.Filter,
            [nodes.Symbol, "default"],
                        [nodes.NodeList,
            [nodes.Literal, ""],
            [nodes.Literal, "foo/bar.njk"]
                        ]
                    ],
                    [nodes.NodeList,
            [nodes.Symbol, "baz"],
                        [nodes.Pair,
            [nodes.Symbol, "foobar"],
            [nodes.Symbol, "foobarbaz"]]]]]);
    });

    it("should parse whitespace control", () => {
        // Every start/end tag with "-" should trim the whitespace
        // before or after it

        isAST(parser.parse("{% if x %}\n  hi \n{% endif %}"),
            [nodes.Root,
                [nodes.If,
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
                        [nodes.Output,
            [nodes.TemplateData, "\n  hi \n"]]]]]);

        isAST(parser.parse("{% if x -%}\n  hi \n{% endif %}"),
            [nodes.Root,
                [nodes.If,
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
                        [nodes.Output,
            [nodes.TemplateData, "hi \n"]]]]]);

        isAST(parser.parse("{% if x %}\n  hi \n{%- endif %}"),
            [nodes.Root,
                [nodes.If,
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
                        [nodes.Output,
            [nodes.TemplateData, "\n  hi"]]]]]);

        isAST(parser.parse("{% if x -%}\n  hi \n{%- endif %}"),
            [nodes.Root,
                [nodes.If,
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
                        [nodes.Output,
            [nodes.TemplateData, "hi"]]]]]);

        isAST(parser.parse("poop  \n{%- if x -%}\n  hi \n{%- endif %}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "poop"]],
                [nodes.If,
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
                        [nodes.Output,
            [nodes.TemplateData, "hi"]]]]]);

        isAST(parser.parse("hello \n{#- comment #}"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "hello"]]]);

        isAST(parser.parse("{# comment -#} \n world"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "world"]]]);

        isAST(parser.parse("hello \n{#- comment -#} \n world"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "hello"]],
                [nodes.Output,
            [nodes.TemplateData, "world"]]]);

        isAST(parser.parse("hello \n{# - comment - #} \n world"),
            [nodes.Root,
                [nodes.Output,
            [nodes.TemplateData, "hello \n"]],
                [nodes.Output,
            [nodes.TemplateData, " \n world"]]]);

        // The from statement required a special case so make sure to
        // test it
        isAST(parser.parse("{% from x import y %}\n  hi \n"),
            [nodes.Root,
                [nodes.FromImport,
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
            [nodes.Symbol, "y"]]],
                [nodes.Output,
            [nodes.TemplateData, "\n  hi \n"]]]);

        isAST(parser.parse("{% from x import y -%}\n  hi \n"),
            [nodes.Root,
                [nodes.FromImport,
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
            [nodes.Symbol, "y"]]],
                [nodes.Output,
            [nodes.TemplateData, "hi \n"]]]);

        isAST(parser.parse("{% if x -%}{{y}} {{z}}{% endif %}"),
            [nodes.Root,
                [nodes.If,
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
                        [nodes.Output,
            [nodes.Symbol, "y"]],
                        [nodes.Output,
            // the value of TemplateData should be ' ' instead of ''
            [nodes.TemplateData, " "]],
                        [nodes.Output,
            [nodes.Symbol, "z"]]]]]);

        isAST(parser.parse("{% if x -%}{% if y %} {{z}}{% endif %}{% endif %}"),
            [nodes.Root,
                [nodes.If,
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
                        [nodes.If,
            [nodes.Symbol, "y"],
                            [nodes.NodeList,
                                [nodes.Output,
            // the value of TemplateData should be ' ' instead of ''
            [nodes.TemplateData, " "]],
                                [nodes.Output,
            [nodes.Symbol, "z"]]
                            ]]]]]);

        isAST(parser.parse("{% if x -%}{# comment #} {{z}}{% endif %}"),
            [nodes.Root,
                [nodes.If,
            [nodes.Symbol, "x"],
                    [nodes.NodeList,
                        [nodes.Output,
            // the value of TemplateData should be ' ' instead of ''
            [nodes.TemplateData, " "]],
                        [nodes.Output,
            [nodes.Symbol, "z"]]]]]);

    });

    it("should throw errors", () => {
        expect(() => {
            parser.parse("hello {{ foo");
        }).to.throw(/expected variable end/);

        expect(() => {
            parser.parse("hello {% if");
        }).to.throw(/expected expression/);

        expect(() => {
            parser.parse("hello {% if sdf zxc");
        }).to.throw(/expected block end/);

        expect(() => {
            parser.parse('{% include "foo %}');
        }).to.throw(/expected block end/);

        expect(() => {
            parser.parse("hello {% if sdf %} data");
        }).to.throw(/expected elif, else, or endif/);

        expect(() => {
            parser.parse("hello {% block sdf %} data");
        }).to.throw(/expected endblock/);

        expect(() => {
            parser.parse("hello {% block sdf %} data{% endblock foo %}");
        }).to.throw(/expected block end/);

        expect(() => {
            parser.parse("hello {% bar %} dsfsdf");
        }).to.throw(/unknown block tag/);

        expect(() => {
            parser.parse("{{ foo(bar baz) }}");
        }).to.throw(/expected comma after expression/);

        expect(() => {
            parser.parse('{% import "foo" %}');
        }).to.throw(/expected "as" keyword/);

        expect(() => {
            parser.parse('{% from "foo" %}');
        }).to.throw(/expected import/);

        expect(() => {
            parser.parse('{% from "foo" import bar baz %}');
        }).to.throw(/expected comma/);

        expect(() => {
            parser.parse('{% from "foo" import _bar %}');
        }).to.throw(/names starting with an underscore cannot be imported/);
    });

    it("should parse custom tags", () => {

        function testtagExtension() {
            // jshint validthis: true
            this.tags = ["testtag"];

            /* normally this is automatically done by Environment */
            this._name = "testtagExtension";

            this.parse = function (parser, nodes) {
                parser.peekToken();
                parser.advanceAfterBlockEnd();
                return new nodes.CallExtension(this, "foo");
            };
        }

        function testblocktagExtension() {
            // jshint validthis: true
            this.tags = ["testblocktag"];
            this._name = "testblocktagExtension";

            this.parse = function (parser, nodes) {
                parser.peekToken();
                parser.advanceAfterBlockEnd();

                const content = parser.parseUntilBlocks("endtestblocktag");
                const tag = new nodes.CallExtension(this, "bar", null, [1, content]);
                parser.advanceAfterBlockEnd();

                return tag;
            };
        }

        function testargsExtension() {
            // jshint validthis: true
            this.tags = ["testargs"];
            this._name = "testargsExtension";

            this.parse = function (parser, nodes) {
                const begun = parser.peekToken();
                let args = null;

                // Skip the name
                parser.nextToken();

                args = parser.parseSignature(true);
                parser.advanceAfterBlockEnd(begun.value);

                return new nodes.CallExtension(this, "biz", args);
            };
        }

        const extensions = [new testtagExtension(),
            new testblocktagExtension(),
            new testargsExtension()];

        isAST(parser.parse("{% testtag %}", extensions),
            [nodes.Root,
            [nodes.CallExtension, extensions[0], "foo", undefined, undefined]]);

        isAST(parser.parse("{% testblocktag %}sdfd{% endtestblocktag %}",
            extensions),
            [nodes.Root,
                [nodes.CallExtension, extensions[1], "bar", null,
                    [1, [nodes.NodeList,
                        [nodes.Output,
            [nodes.TemplateData, "sdfd"]]]]]]);

        isAST(parser.parse("{% testblocktag %}{{ 123 }}{% endtestblocktag %}",
            extensions),
            [nodes.Root,
                [nodes.CallExtension, extensions[1], "bar", null,
                    [1, [nodes.NodeList,
                        [nodes.Output,
            [nodes.Literal, 123]]]]]]);

        isAST(parser.parse('{% testargs(123, "abc", foo="bar") %}', extensions),
            [nodes.Root,
                [nodes.CallExtension, extensions[2], "biz",

            // The only arg is the list of run-time arguments
            // coming from the template
                    [nodes.NodeList,
            [nodes.Literal, 123],
            [nodes.Literal, "abc"],
                        [nodes.KeywordArgs,
                            [nodes.Pair,
            [nodes.Symbol, "foo"],
            [nodes.Literal, "bar"]]]]]]);

        isAST(parser.parse("{% testargs %}", extensions),
            [nodes.Root,
            [nodes.CallExtension, extensions[2], "biz", null]]);
    });
});