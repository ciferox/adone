{
  'targets': [
    {
      "target_name": "lzma",
      "sources": [
        "src/util.cpp",
        "src/liblzma-functions.cpp",
        "src/filter-array.cpp",
        "src/lzma-stream.cpp",
        "src/module.cpp",
        "src/mt-options.cpp",
        "src/index-parser.cpp"
      ],
      "include_dirs" : [
        "<(adone_native_dir)/nan",
        "<(adone_native_dir)/adone"
      ],
      "dependencies" : [ "liblzma" ],
      "conditions" : [
        [ 'OS!="win"' , {
          "include_dirs" : [ "<(node_build_dir)/liblzma/build/include" ],
          "libraries" : [ "<(node_build_dir)/liblzma/build/lib/liblzma.a" ],
        }, {
          "include_dirs" : [ "<(addon_root_dir)\\src\\deps\\win\\include" ],
          "link_settings": {
            "libraries" : [ "-lliblzma" ],
            "conditions": [
              [ 'target_arch=="x64"', {
                "library_dirs" : [ "<(node_build_dir)\\Release" ]
              }, {
                "library_dirs" : [ "<(addon_root_dir)\\src\\deps\\win\\bin_i686" ]
              } ]
            ]
          }
        } ],
      ],
    },
    {
      "target_name" : "liblzma",
      "type" : "none",
      "conditions" : [
        [ 'OS!="win"' , {
          "actions" : [
            {
              "action_name" : "build",
              'inputs': ['<!@(sh <(addon_root_dir)/src/deps/unix/config.sh "<(node_build_dir)" "<(addon_root_dir)/src/deps/unix/xz-5.2.3.tar.bz2")'],
              'outputs': [''],
              'action': [
                'sh', '<(addon_root_dir)/src/deps/unix/build.sh', '<(node_build_dir)'
              ]
            }
          ]
        }, {
          "conditions" : [
            [ 'target_arch=="x64"', {
              'variables': {
                "arch_lib_path" : 'bin_x86-64',
                "arch_lib_code" : 'x64'
              }
            }, {
              'variables': {
                "arch_lib_path" : 'bin_i686',
                "arch_lib_code" : 'ix86'
              }
            } ]
          ],
          "actions": [
            {
              "msvs_quote_cmd": 0,
              "action_name" : "build",
              'inputs': ['src/deps/win/liblzma.def'],
              'outputs': [''],
              'action': ['mkdir <(node_build_dir)/liblzma/Release > nul 2>&1 & lib -def:"<(addon_root_dir)/src/deps/win/liblzma.def" -out:"<(node_build_dir)/liblzma/Release/liblzma.lib" -machine:<(arch_lib_code)']
            },
            {
              "msvs_quote_cmd": 0,
              "action_name" : "deploy",
              'inputs': ['src/deps/win/<(arch_lib_path)/liblzma.dll'],
              'outputs': ['build/Release/liblzma.dll'],
              'action': ['copy "<(addon_root_dir)/src/deps/win/<(arch_lib_path)/liblzma.dll" "<(node_build_dir)/liblzma/Release/liblzma.dll"']
            }
          ]
        } ],
      ]
    },
    {
      "target_name": "copy_liblzma",
      "dependencies" : [ "lzma" ],
      "conditions": [
        [ 'OS=="win"', {
          "copies": [
            {
              "conditions": [
                [ 'target_arch=="x64"', {
                    "files": [ "<(addon_root_dir)\\src\\deps\\win\\bin_x86-64\\liblzma.dll" ]
                  }, 'OS=="win"', {
                    "files": ["<(addon_root_dir)\\src\\deps\\win\\bin_i686\\liblzma.dll" ]
                  }
                ]
              ],
              "destination": "<(node_build_dir)/lib/native"
            }
          ]
        }]
      ]
    }
  ]
}
