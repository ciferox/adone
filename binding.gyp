{
  'targets': [
    {
      'target_name': 'common',
      'sources': [
        'src/native/common.cc'
      ],
      'cflags!': [ '-O3' ],
      'cflags': [ '-O2' ],
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
      "target_name": "brotli",
      "sources": [
        "src/native/compressors/brotli/deps/common/dictionary.c",
        "src/native/compressors/brotli/deps/enc/backward_references.c",
        "src/native/compressors/brotli/deps/enc/bit_cost.c",
        "src/native/compressors/brotli/deps/enc/block_splitter.c",
        "src/native/compressors/brotli/deps/enc/brotli_bit_stream.c",
        "src/native/compressors/brotli/deps/enc/cluster.c",
        "src/native/compressors/brotli/deps/enc/compress_fragment.c",
        "src/native/compressors/brotli/deps/enc/compress_fragment_two_pass.c",
        "src/native/compressors/brotli/deps/enc/encode.c",
        "src/native/compressors/brotli/deps/enc/entropy_encode.c",
        "src/native/compressors/brotli/deps/enc/histogram.c",
        "src/native/compressors/brotli/deps/enc/literal_cost.c",
        "src/native/compressors/brotli/deps/enc/memory.c",
        "src/native/compressors/brotli/deps/enc/metablock.c",
        "src/native/compressors/brotli/deps/enc/static_dict.c",
        "src/native/compressors/brotli/deps/enc/utf8_util.c",
        "src/native/compressors/brotli/deps/dec/bit_reader.c",
        "src/native/compressors/brotli/deps/dec/decode.c",
        "src/native/compressors/brotli/deps/dec/huffman.c",
        "src/native/compressors/brotli/deps/dec/state.c",
        "src/native/compressors/brotli/brotli.cc",
      ],
      "include_dirs": [ "nan" ],
      "defines": ["NOMINMAX"],
      "cflags" : ["-O2"],
      "xcode_settings": {
        "OTHER_CFLAGS" : ["-O2"]
      }
    },
    {
      'target_name': 'snappy',
      'include_dirs': [ "nan" ],
      'dependencies': [ 'src/native/compressors/snappy/deps/snappy.gyp:snappy' ],
      'sources': [ 'src/native/compressors/snappy/snappy.cc' ]
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
      "target_name": "leveldown",
        "conditions": [
          ["OS == 'win'", {
              "defines": [
                  "_HAS_EXCEPTIONS=0"
              ],
              "msvs_settings": {
                  "VCCLCompilerTool": {
                      "RuntimeTypeInfo": "false",
                      "EnableFunctionLevelLinking": "true",
                      "ExceptionHandling": "2",
                      "DisableSpecificWarnings": [ "4355", "4530" ,"4267", "4244", "4506" ]
                  }
              }
          }],
          ['OS == "linux"', {
              'cflags': [
              ],
              'cflags!': [ '-fno-tree-vrp' ]
          }]
        ],
        "dependencies": [
            "<(module_root_dir)/src/native/leveldown/leveldb/leveldb.gyp:leveldb"
        ],
        "include_dirs": ["nan"],
        "sources": [
            "src/native/leveldown/batch.cc",
            "src/native/leveldown/batch_async.cc",
            "src/native/leveldown/database.cc",
            "src/native/leveldown/database_async.cc",
            "src/native/leveldown/iterator.cc",
            "src/native/leveldown/iterator_async.cc",
            "src/native/leveldown/leveldown.cc",
            "src/native/leveldown/leveldown_async.cc"
        ]
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
		"target_name": "libmasscan",
		"type": "shared_library",
    "variables": {
      'path': 'src/native/netscan/masscan/masscan/src',
    },
    'type': 'static_library',
    "include_dirs": [
      "nan",
      "<(path)/src",
    ],
    "conditions": [
      ['OS!="win"', {
        "cflags": [
          "-ggdb",
          "-fPIC",
          "-w",
          "-g",
          "-Wl,--whole-archive"
        ],
        "link_settings": {
          "libraries": [
            "-pthread",
            "-lpcap",
            "-lrt",
            "-ldl",
            "-lm"
          ]
        },
      }, {
          'include_dirs': [
            "<(module_root_dir)\\src\\native\\netscan\\masscan\\deps\\win\\include"
          ],
          "link_settings": {
            "conditions" : [
              [ 'target_arch=="x64"', {
                "library_dirs" : ["<(module_root_dir)\\src\\native\\netscan\\masscan\\deps\\win\\lib\\x64"]
              }, {
                "library_dirs" : ["<(module_root_dir)\\src\\native\\netscan\\masscan\\deps\\win\\lib\\x32"]
              } ]
            ]
          }
        }
      ]
    ],
    "sources": [
      "<(path)/crypto-base64.c",
      "<(path)/crypto-blackrock2.c",
      "<(path)/event-timeout.c",
      "<(path)/in-binary.c",
      "<(path)/in-filter.c",
      "<(path)/in-report.c",
      "<(path)/logger.c",
      "<(path)/main-conf.c",
      "<(path)/main-dedup.c",
      "<(path)/main-initadapter.c",
      "<(path)/main-listscan.c",
      "<(path)/main-ptrace.c",
      "<(path)/main-readrange.c",
      "<(path)/main-src.c",
      "<(path)/main-status.c",
      "<(path)/main-throttle.c",
      "<(path)/masscan-app.c",
      "<(path)/out-binary.c",
      "<(path)/out-certs.c",
      "<(path)/out-grepable.c",
      "<(path)/out-json.c",
      "<(path)/out-null.c",
      "<(path)/out-redis.c",
      "<(path)/out-text.c",
      "<(path)/out-unicornscan.c",
      "<(path)/out-xml.c",
      "<(path)/output.c",
      "<(path)/pixie-backtrace.c",
      "<(path)/pixie-file.c",
      "<(path)/pixie-threads.c",
      "<(path)/pixie-timer.c",
      "<(path)/proto-arp.c",
      "<(path)/proto-banner1.c",
      "<(path)/proto-banout.c",
      "<(path)/proto-dns.c",
      "<(path)/proto-ftp.c",
      "<(path)/proto-http.c",
      "<(path)/proto-icmp.c",
      "<(path)/proto-imap4.c",
      "<(path)/proto-interactive.c",
      "<(path)/proto-netbios.c",
      "<(path)/proto-ntp.c",
      "<(path)/proto-pop3.c",
      "<(path)/proto-preprocess.c",
      "<(path)/proto-sctp.c",
      "<(path)/proto-smtp.c",
      "<(path)/proto-snmp.c",
      "<(path)/proto-ssh.c",
      "<(path)/proto-ssl-test.c",
      "<(path)/proto-ssl.c",
      "<(path)/proto-tcp-telnet.c",
      "<(path)/proto-tcp.c",
      "<(path)/proto-udp.c",
      "<(path)/proto-vnc.c",
      "<(path)/proto-x509.c",
      "<(path)/proto-zeroaccess.c",
      "<(path)/rand-blackrock.c",
      "<(path)/rand-lcg.c",
      "<(path)/rand-primegen.c",
      "<(path)/ranges.c",
      "<(path)/rawsock.c",
      "<(path)/rawsock-arp.c",
      "<(path)/rawsock-getif.c",
      "<(path)/rawsock-getip.c",
      "<(path)/rawsock-getmac.c",
      "<(path)/rawsock-getroute.c",
      "<(path)/rawsock-pcapfile.c",
      "<(path)/rawsock-pfring.c",
      "<(path)/rte-ring.c",
      "<(path)/script-heartbleed.c",
      "<(path)/script-ntp-monlist.c",
      "<(path)/script-sslv3.c",
      "<(path)/script.c",
      "<(path)/siphash24.c",
      "<(path)/smack1.c",
      "<(path)/smackqueue.c",
      "<(path)/string_s.c",
      "<(path)/syn-cookie.c",
      "<(path)/templ-payloads.c",
      "<(path)/templ-pkt.c",
      "<(path)/xring.c",
      ]
  },{
    "target_name": "masscan",
    "include_dirs": [
        "nan",
        "<(module_root_dir)/src/native/netscan/masscan",
    ],
    "dependencies": [
        "libmasscan",
    ],
    "sources": [
        "src/native/netscan/masscan/masscan.cc",
    ],
    "conditions": [
      ['OS=="linux"', {
        "libraries":[
          "<(module_root_dir)/build/Release/masscan.a"
        ],
        "cflags": [
          "-ggdb",
          "-g"
        ],
      }]
    ],
  },
    {
      "target_name": "copy_modules",
      "variables": {
        "srcpath%": "<(module_root_dir)/build/Release",
      },
      "dependencies" : [ "bignumber", "brotli", "lzma", "bson", "hiredis", "common", "metrics", "snappy", "leveldown", "masscan" ],
      "copies": [
        {
          "files": [ 
            "<(srcpath)/bignumber.node",
            "<(srcpath)/brotli.node",
            "<(srcpath)/bson.node",
            "<(srcpath)/hiredis.node",
            "<(srcpath)/common.node",
            "<(srcpath)/metrics.node",
            "<(srcpath)/snappy.node",
            "<(srcpath)/leveldown.node",
            "<(srcpath)/lzma.node",
            "<(srcpath)/masscan.node"
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
