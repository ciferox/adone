const { createStructure } = FS;

export default function (directory) {
    return createStructure(directory, [
        [
            "expected",
            [
                ["empty.css", ""],
                ["indent.css", "body .div {\n  color: blue; }\n"],
                ["inheritance.css", "body {\n  background: pink; }\n\nfooter {\n  background: red; }\n\n.error, .badError {\n  border: #f00;\n  background: #fdd; }\n\n.error.intrusion, .intrusion.badError {\n  font-size: 1.3em;\n  font-weight: bold; }\n\n.badError {\n  border-width: 3px; }\n"],
                ["mixins.css", "#data {\n  float: left;\n  margin-left: 10px; }\n  #data th {\n    text-align: center;\n    font-weight: bold; }\n  #data td, #data th {\n    padding: 2px; }\n"],
                ["variables.css", ".content-navigation {\n  border-color: #3bbfce;\n  color: #2ca2af; }\n\n.border {\n  padding: 8px;\n  margin: 8px;\n  border-color: #3bbfce; }\n"]
            ]
        ],
        [
            "scss",
            [
                ["_partial.scss", "body {\n  background: red;\n}\n"],
                ["empty.scss", ""],
                ["error.scss", "body {\n  font 'Comic Sans';\n}\n"],
                [
                    "globbed",
                    [
                        ["app.scss", "p {\n  border: 1px solid red;\n}\n\nsmall {\n  font: {\n    size: 72px;\n  }\n}\n\nh1 {\n  font: {\n    size: 8px;\n  }\n}\n"],
                        [
                            "foo",
                            [
                                ["bar.scss", "h1, h2, h3, h4, h5 {\n  color: green;\n  font-weight: 800;\n}\n"]
                            ]
                        ]
                    ]
                ],
                [
                    "includes",
                    [
                        ["_cats.scss", "$blue: #3bbfce;\n$margin: 16px;\n\nbody {\n  background: pink;\n}\n"],
                        ["_dogs.sass", "$blue: #3bbfce;\n$margin: 16px;\n\nfooter\n  background: red;\n"]
                    ]
                ],
                ["indent.sass", "$color: blue\n\nbody .div\n  color: $color\n"],
                ["inheritance.scss", "@import \"includes/cats\";\n@import \"includes/dogs\";\n\n.error {\n  border: #f00;\n  background: #fdd;\n}\n\n.error.intrusion {\n  font-size: 1.3em;\n  font-weight: bold;\n}\n\n.badError {\n  @extend .error;\n  border-width: 3px;\n}\n"],
                ["mixins.scss", "@mixin table-base {\n  th {\n    text-align: center;\n    font-weight: bold;\n  }\n  td, th {padding: 2px}\n}\n\n@mixin left($dist) {\n  float: left;\n  margin-left: $dist;\n}\n\n#data {\n  @include left(10px);\n  @include table-base;\n}"],
                ["variables.scss", "$blue: #3bbfce;\n$margin: 16px;\n\n.content-navigation {\n  border-color: $blue;\n  color:\n    darken($blue, 9%);\n}\n\n.border {\n  padding: $margin / 2;\n  margin: $margin / 2;\n  border-color: $blue;\n}\n"]
            ]
        ]
    ]);
}