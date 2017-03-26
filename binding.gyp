{
  'targets': [
    {
      'target_name': 'microtime',
      'sources': [ 'src/native/microtime.cc' ],
      'include_dirs' : [
        "nan"
      ]
    },
    {
      'target_name': 'memcpy',
      'sources': [ 'src/native/memcpy.cc' ],
      'include_dirs' : [
        "nan"
      ]
    },
    {
      'target_name': 'bignumber',
      'sources': [ 'src/native/bignumber.cc' ],
      'include_dirs': [
        "nan"
      ],
      'conditions': [
        # For Windows, require either a 32-bit or 64-bit
        # separately-compiled OpenSSL library.
        # Currently set up to use with the following OpenSSL distro:
        #
        # http://slproweb.com/products/Win32OpenSSL.html
        [
          'OS=="win"', {
            'conditions': [
              [
                'target_arch=="x64"', {
                  'variables': {
                    'openssl_root%': 'C:/OpenSSL-Win64'
                  },
                }, {
                   'variables': {
                     'openssl_root%': 'C:/OpenSSL-Win32'
                    }
                }
              ]
            ],
            'include_dirs': [
              '<(openssl_root)/include',
            ],
          },

          # Otherwise, if not Windows, link against the exposed OpenSSL
          # in Node.
          {
            'conditions': [
              [
                'target_arch=="ia32"', {
                  'variables': {
                    'openssl_config_path': '<(nodedir)/deps/openssl/config/piii'
                  }
                }
              ],
              [
                'target_arch=="x64"', {
                  'variables': {
                    'openssl_config_path': '<(nodedir)/deps/openssl/config/k8'
                  },
                }
              ],
              [
                'target_arch=="arm"', {
                  'variables': {
                    'openssl_config_path': '<(nodedir)/deps/openssl/config/arm'
                  }
                }
              ],
              [
                'target_arch=="arm64"', {
                  'variables': {
                    'openssl_config_path': '<(nodedir)/deps/openssl/config/aarch64'
                  }
                },
              ],
              [
                'target_arch=="ppc64"', {
                  'variables': {
                    'openssl_config_path': '<(nodedir)/deps/openssl/config/powerpc64'
                  }
                },
              ]
            ],
            'include_dirs': [
              "<(nodedir)/deps/openssl/openssl/include",
              "<(openssl_config_path)"
            ]
          }
        ]
      ]
    },
    {
	  'target_name': 'userid',
	  'conditions': [
	    ['OS!="win"', {
          'sources': [ 'src/native/userid.cc' ],
          'include_dirs' : [
            "nan"
          ]
		}]
	  ]
    },
    {
      'target_name': 'utf8validation',
      'include_dirs': ["nan"],
      'cflags!': [ '-O3' ],
      'cflags': [ '-O2' ],
      'sources': [ 'src/native/utf8validation.cc' ]
    },
    {
      'target_name': 'wsbufferutil',
      'include_dirs': ["nan"],
      'sources': [ 'src/native/wsbufferutil.cc' ],
      'xcode_settings': {
        'MACOSX_DEPLOYMENT_TARGET': '10.8',
        'CLANG_CXX_LANGUAGE_STANDARD': 'c++11',
        'CLANG_CXX_LIBRARY': 'libc++'
      }
    },
    {
      "target_name": "brotli_encode",
      "sources": [
        "src/native/compressors/brotli/brotli/common/dictionary.c",
        "src/native/compressors/brotli/brotli/enc/backward_references.c",
        "src/native/compressors/brotli/brotli/enc/bit_cost.c",
        "src/native/compressors/brotli/brotli/enc/block_splitter.c",
        "src/native/compressors/brotli/brotli/enc/brotli_bit_stream.c",
        "src/native/compressors/brotli/brotli/enc/cluster.c",
        "src/native/compressors/brotli/brotli/enc/compress_fragment.c",
        "src/native/compressors/brotli/brotli/enc/compress_fragment_two_pass.c",
        "src/native/compressors/brotli/brotli/enc/encode.c",
        "src/native/compressors/brotli/brotli/enc/entropy_encode.c",
        "src/native/compressors/brotli/brotli/enc/histogram.c",
        "src/native/compressors/brotli/brotli/enc/literal_cost.c",
        "src/native/compressors/brotli/brotli/enc/memory.c",
        "src/native/compressors/brotli/brotli/enc/metablock.c",
        "src/native/compressors/brotli/brotli/enc/static_dict.c",
        "src/native/compressors/brotli/brotli/enc/utf8_util.c",
        "src/native/compressors/brotli/src/common/allocator.cc",
        "src/native/compressors/brotli/src/common/stream_coder.cc",
        "src/native/compressors/brotli/src/enc/encode_index.cc",
        "src/native/compressors/brotli/src/enc/stream_encode.cc",
        "src/native/compressors/brotli/src/enc/stream_encode_worker.cc"
      ],
      "include_dirs": [
        "nan"
      ],
      "defines": ["NOMINMAX"],
      "cflags" : ["-O2"],
      "xcode_settings": {
        "OTHER_CFLAGS" : ["-O2"]
      }
    },
    {
      "target_name": "brotli_decode",
      "sources": [
        "src/native/compressors/brotli/brotli/common/dictionary.c",
        "src/native/compressors/brotli/brotli/dec/bit_reader.c",
        "src/native/compressors/brotli/brotli/dec/decode.c",
        "src/native/compressors/brotli/brotli/dec/huffman.c",
        "src/native/compressors/brotli/brotli/dec/state.c",
        "src/native/compressors/brotli/src/common/allocator.cc",
        "src/native/compressors/brotli/src/common/stream_coder.cc",
        "src/native/compressors/brotli/src/dec/decode_index.cc",
        "src/native/compressors/brotli/src/dec/stream_decode.cc",
        "src/native/compressors/brotli/src/dec/stream_decode_worker.cc"
      ],
      "include_dirs": [
        "nan"
      ],
      "cflags" : ["-O2"],
      "xcode_settings": {
        "OTHER_CFLAGS" : ["-O2"]
      }
    },
    {
        "target_name": "metrics", 
        "include_dirs": [ "nan" ],
        "sources": [
            "src/native/metrics/system.cc"
        ],
        'conditions': [
          ['OS=="win"', {
            "sources": [
              "src/native/metrics/win32/wmi.cc"
            ],
            "include_dirs": ["src/native/metrics"]
         }],
          ['OS=="freebsd"', {
            "libraries": [
              "/usr/lib/libprocstat.so"
            ]
         }]
        ]
    },
    {
      'target_name': 'hiredis',
      'sources': [
          'src/native/hiredis/hiredis.cc'
        , 'src/native/hiredis/reader.cc'
      ],
      'include_dirs': ["nan"],
      'dependencies': [
        'src/native/hiredis/libhiredis/hiredis.gyp:hiredis-c'
      ],
      'defines': [
          '_GNU_SOURCE'
      ],
      'cflags': [
          '-Wall',
          '-O3'
      ]
    },
    {
      'win_delay_load_hook': 'true',
      'target_name': 'bson',
      'sources': [ 'src/native/bson/bson.cc' ],
      'cflags!': [ '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'include_dirs': [ "nan" ],
      'conditions': [
        ['OS=="mac"', {
          'xcode_settings': {
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'OTHER_CFLAGS': [
              '-O3',
              '-msse2',
              '-ffast-math',
              '-fexceptions'
            ]
          }
        }],
        ['OS=="win"', {
          'msvs_settings': {
            'VCCLCompilerTool': {
              'ExceptionHandling': 1
            }
          }
        }],
        ['OS=="linux"', {
          "cflags": [
            "-O3",
            "-msse2",
            "-ffast-math",
            "-fexceptions"
          ]
        }]
      ]
    },
    {
      'target_name': 'terminal',
      'include_dirs': ["nan"],
      'cflags!': [ '-O3' ],
      'cflags': [ '-O2' ],
      'sources': [ 'src/native/terminal.cc' ]
    },
    {
      "target_name": "lzma",
      "sources": [
        "src/native/compressors/lzma/util.cpp",
        "src/native/compressors/lzma/liblzma-functions.cpp",
        "src/native/compressors/lzma/filter-array.cpp",
        "src/native/compressors/lzma/lzma-stream.cpp",
        "src/native/compressors/lzma/module.cpp",
        "src/native/compressors/lzma/mt-options.cpp",
        "src/native/compressors/lzma/index-parser.cpp"
      ],
      "include_dirs" : [
        "nan"
      ],
      "dependencies" : [ "liblzma" ],
      "conditions" : [
        [ 'OS!="win"' , {
          "include_dirs" : [ "<(module_root_dir)/build/liblzma/build/include" ],
          "libraries" : [ "<(module_root_dir)/build/liblzma/build/lib/liblzma.a" ],
        }, {
          "include_dirs" : [ "<(module_root_dir)\\src\\native\\compressors\\lzma\\deps\\win\\include" ],
          "link_settings": {
            "libraries" : [ "-lliblzma" ],
            "conditions": [
              [ 'target_arch=="x64"', {
                "library_dirs" : [ "<(module_root_dir)\\build\\Release" ]
              }, {
                "library_dirs" : [ "<(module_root_dir)\\src\\native\\compressors\\lzma\\deps\\win\\bin_i686" ]
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
              'inputs': ['<!@(sh src/native/compressors/lzma/deps/unix/config.sh "<(module_root_dir)/build" "<(module_root_dir)/src/native/compressors/lzma/deps/unix/xz-5.2.3.tar.bz2")'],
              'outputs': [''],
              'action': [
                'sh', '<(module_root_dir)/src/native/compressors/lzma/deps/unix/build.sh', '<(module_root_dir)/build'
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
              'inputs': ['src/native/compressors/lzma/deps/win/liblzma.def'],
              'outputs': [''],
              'action': ['mkdir <(module_root_dir)/build/Release > nul 2>&1 & lib -def:"<(module_root_dir)/src/native/compressors/lzma/deps/win/liblzma.def" -out:"<(module_root_dir)/build/Release/liblzma.lib" -machine:<(arch_lib_code)']
            },
            {
              "msvs_quote_cmd": 0,
              "action_name" : "deploy",
              'inputs': ['src/native/compressors/lzma/deps/win/<(arch_lib_path)/liblzma.dll'],
              'outputs': ['build/Release/liblzma.dll'],
              'action': ['copy "<(module_root_dir)/src/native/compressors/lzma/deps/win/<(arch_lib_path)/liblzma.dll" "<(module_root_dir)/build/Release/liblzma.dll"']
            }
          ]
        } ],
      ]
    },
    {
      "target_name": "copy_modules",
      "variables": {
        "srcpath%": "<(module_root_dir)/build/Release",
      },
      "dependencies" : [ "bignumber", "brotli_decode", "brotli_encode", "lzma", "bson", "hiredis", "memcpy", "metrics", "microtime", "userid", "terminal", "utf8validation", "wsbufferutil" ],
      "copies": [
        {
          "files": [ 
            "<(srcpath)/bignumber.node",
            "<(srcpath)/brotli_decode.node",
            "<(srcpath)/brotli_encode.node",
            "<(srcpath)/bson.node",
            "<(srcpath)/hiredis.node",
            "<(srcpath)/memcpy.node",
            "<(srcpath)/metrics.node",
            "<(srcpath)/microtime.node",
            "<(srcpath)/userid.node",
            "<(srcpath)/terminal.node",
            "<(srcpath)/utf8validation.node",
            "<(srcpath)/wsbufferutil.node",
            "<(srcpath)/lzma.node"
          ],
          "destination": "<(module_root_dir)/lib/native"
        },
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
                    "files": [ "<(module_root_dir)\\src\\native\\compressors\\lzma\\deps\\win\\bin_x86-64\\liblzma.dll" ]
                  }, 'OS=="win"', {
                    "files": ["<(module_root_dir)\\src\\native\\compressors\\lzma\\deps\\win\\bin_i686\\liblzma.dll" ]
                  }
                ]
              ],
              "destination": "<(module_root_dir)/lib/native"
            }
          ]
        }]
      ]
    }
  ]
}
