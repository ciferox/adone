{
  'variables': {
    'driver%': 'libusb'
  },
  'targets': [
    {
      'target_name': 'hidapi',
      'type': 'static_library',
      'conditions': [
        [ 'OS=="mac"', {
          'sources': [ 'src/native/hardware/hid/deps/mac/hid.c' ],
          'include_dirs+': [
            '/usr/include/libusb-1.0/'
          ]
        }],
        [ 'OS=="linux"', {
          'conditions': [
            [ 'driver=="libusb"', {
              'sources': [ 'src/native/hardware/hid/deps/libusb/hid.c' ],
              'include_dirs+': [
                '/usr/include/libusb-1.0/'
              ]
            }],
            [ 'driver=="hidraw"', {
              'sources': [ 'src/native/hardware/hid/deps/linux/hid.c' ]
            }]
          ]
        }],
        [ 'OS=="win"', {
          'sources': [ 'src/native/hardware/hid/deps/windows/hid.c' ],
          'msvs_settings': {
            'VCLinkerTool': {
              'AdditionalDependencies': [
                'setupapi.lib',
              ]
            }
          }
        }]
      ],
      'direct_dependent_settings': {
        'include_dirs': [
          'src/native/hardware/hid/deps/hidapi',
          "nan"
        ]
      },
      'include_dirs': [
        'src/native/hardware/hid/deps/hidapi'
      ],
      'defines': [
        '_LARGEFILE_SOURCE',
        '_FILE_OFFSET_BITS=64',
      ],
      'cflags': ['-g'],
      'cflags!': [
        '-ansi'
      ]
    },
    {
      'target_name': 'hid',
      'sources': [ 'src/native/hardware/hid/hid.cc' ],
      'dependencies': ['hidapi'],
      'defines': [
        '_LARGEFILE_SOURCE',
        '_FILE_OFFSET_BITS=64',
      ],
      'conditions': [
        [ 'OS=="mac"', {
              'LDFLAGS': [
            '-framework IOKit',
            '-framework CoreFoundation'
          ],
          'xcode_settings': {
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'OTHER_LDFLAGS': [
              '-framework IOKit',
              '-framework CoreFoundation'
            ],
          }
        }],
        [ 'OS=="linux"', {
          'conditions': [
            [ 'driver=="libusb"', {
              'libraries': [
                '-lusb-1.0'
              ]
            }],
            [ 'driver=="hidraw"', {
              'libraries': [
                '-ludev',
                '-lusb-1.0'
              ]
            }]
          ],
        }],
        [ 'OS=="win"', {
          'msvs_settings': {
            'VCLinkerTool': {
              'AdditionalDependencies': [
                'setupapi.lib'
              ]
            }
          }
        }]
      ],
      'cflags!': ['-ansi', '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'cflags': ['-g', '-exceptions'],
      'cflags_cc': ['-g', '-exceptions']
    },
    {
      'target_name': 'serial',
      'sources': [
        'src/native/hardware/serial/serialport.cc',
      ],
      'include_dirs': [ "nan" ],
      'conditions': [
        ['OS=="win"',
          {
            'sources': [
              'src/native/hardware/serial/serialport_win.cc'
            ],
            'msvs_settings': {
              'VCCLCompilerTool': {
                'ExceptionHandling': '2',
                'DisableSpecificWarnings': [ '4530', '4506' ],
              },
            },
          },
        ],
        ['OS=="mac"',
          {
            'sources': [
              'src/native/hardware/serial/serialport_unix.cc',
              'src/native/hardware/serial/read-poller.cc',
            ],
            'xcode_settings': {
              'OTHER_LDFLAGS': [
                '-framework CoreFoundation -framework IOKit'
              ]
            }
          }
        ],
        ['OS!="win"',
          {
            'sources': [
              'src/native/hardware/serial/serialport_unix.cc',
              'src/native/hardware/serial/read-poller.cc',
            ],
          }
        ],
      ],
    },
    {
        "target_name": "i2c",
        "conditions": [[
          "OS == 'linux'", {
            "cflags": [
            "-Wno-unused-local-typedefs"
            ]
          }]
        ],
        "include_dirs" : [ "nan" ],
        "conditions": [
        ["OS == 'linux'", {
            "sources": [
            "./src/native/hardware/i2c/i2c.cc"
            ]
        }],
#        ["OS == 'win'", {
#          "sources": [
#            "./src/native/hardware/i2c/win/readPartial.cc",
#            "./src/native/hardware/i2c/win/writePartial.cc",
#            "./src/native/hardware/i2c/win/writeReadPartial.cc",
#            "./src/native/hardware/i2c/win/i2c.cc",
#            "./src/native/hardware/i2c/win/i2c.h"
#          ],
#          'msvs_windows_sdk_version': 'v10.0',
#          'win_delay_load_hook': 'false',
#          'msvs_onecore_vcpp_libs': 1,
#          'msvs_settings': {
#            'VCLinkerTool': {
#              'IgnoreDefaultLibraryNames' : ['kernel32.lib','advapi32.lib', 'ole32.lib' ],
#              'conditions': [
#                [ 'target_arch=="ia32"', {
#                  'AdditionalLibraryDirectories' : [ '$(VCInstallDir)lib\onecore;$(WindowsSDK_LibraryPath_x86);$(UniversalCRT_LibraryPath_x86)' ],
#                } ],
#                [ 'target_arch=="x64"', {
#                  'AdditionalLibraryDirectories' : [ '$(VCInstallDir)lib\onecore\\amd64;$(WindowsSDK_LibraryPath_x64);$(UniversalCRT_LibraryPath_x64)' ],
#                } ],
#                [ 'target_arch=="arm"', {
#                  'AdditionalLibraryDirectories' : [ '$(VCInstallDir)lib\onecore\\arm;$(WindowsSDK_LibraryPath_arm);$(UniversalCRT_LibraryPath_arm)' ],
#                } ],
#              ],
#            },
#            'VCCLCompilerTool': {
#              'AdditionalUsingDirectories': [ '$(VCInstallDir)vcpackages;$(WindowsSdkDir)UnionMetadata;%(AdditionalUsingDirectories)' ],
#              'CompileAsWinRT': 'true',
#            }
#          },
#          'libraries': [
#          '-lonecore.lib',
#          ],
#          'configurations': {
#          'Release': {
#              'msvs_settings': {
#              'VCCLCompilerTool': {
#                  'RuntimeLibrary': '2',
#              }
#              },
#          },
#          'Debug': {
#              'msvs_settings': {
#              'VCCLCompilerTool': {
#                  'RuntimeLibrary': '3',
#              }
#            },
#          }
#          }
#        }]
      ]
    },
    {
      'target_name': 'common',
      'sources': [
        'src/native/common.cc'
      ],
      'cflags!': [ '-O3' ],
      'cflags': [ '-O2' ],
      'include_dirs' : [ "nan" ]
    },
    {
      'target_name': 'bignumber',
      'sources': [ 'src/native/bignumber.cc' ],
      'include_dirs': [ "nan" ],
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
        "src/native/compressors/brotli/deps/enc/backward_references_hq.c",
        "src/native/compressors/brotli/deps/enc/bit_cost.c",
        "src/native/compressors/brotli/deps/enc/block_splitter.c",
        "src/native/compressors/brotli/deps/enc/brotli_bit_stream.c",
        "src/native/compressors/brotli/deps/enc/cluster.c",
        "src/native/compressors/brotli/deps/enc/compress_fragment.c",
        "src/native/compressors/brotli/deps/enc/compress_fragment_two_pass.c",
        "src/native/compressors/brotli/deps/enc/dictionary_hash.c",
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
      "include_dirs": [
        "nan",
        "src/native/compressors/brotli/deps/include"
      ],
      "defines": ["NOMINMAX"],
      "cflags" : ["-O2"],
      "xcode_settings": {
        "OTHER_CFLAGS" : ["-O2"]
      }
    },
    {
      'target_name': 'snappy',
      'include_dirs': [ "nan" ],
      'dependencies': [ 'src/native/compressors/snappy/deps/snappy.gyp:libsnappy' ],
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
      'target_name': "bson",
      'win_delay_load_hook': 'true',
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
            '<!@(grep -w -o sse2 -m 1 /proc/cpuinfo > /dev/null && echo "-msse2" || echo "")',
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
          }], ['OS == "android"', {
              'cflags': [ '-fPIC' ]
            , 'ldflags': [ '-fPIC' ]
            , 'cflags!': [
                  '-fno-tree-vrp'
                , '-fno-exceptions'
                , '-mfloat-abi=hard'
                , '-fPIE'
              ]
            , 'cflags_cc!': [ '-fno-exceptions' ]
            , 'ldflags!': [ '-fPIE' ]
          }], ['target_arch == "arm"', {
              'cflags': [ '-mfloat-abi=hard' ]
          }]
        ],
        "dependencies": [
            "src/native/leveldown/leveldb/leveldb.gyp:leveldb"
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
      "include_dirs" : [ "nan" ],
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
          "conditions": [
            ['OS!="freebsd"', {
              "libraries": [
                "-ldl"
              ]
            }],
            ['OS!="mac"', {
              "libraries": [
                "-lrt"
              ]
            }]
          ],
          "libraries": [
            "-pthread",
            "-lm"
          ]
        },
      }]
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
      "<(path)/rawsock-pcap.c",
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
    }, {
        "target_name": "report",
        "sources": [ "src/native/report/report.cc", "src/native/report/module.cc", "src/native/report/utilities.cc" ],
        "include_dirs": [ 'nan' ],
        "conditions": [
        ["OS=='linux'", {
            "defines": [ "_GNU_SOURCE" ],
            "cflags": [ "-g", "-O2", "-std=c++11", ],
        }],
        ["OS=='win'", {
            "libraries": [ "dbghelp.lib", "Netapi32.lib", "PsApi.lib", "Ws2_32.lib" ],
            "dll_files": [ "dbghelp.dll", "Netapi32.dll", "PsApi.dll", "Ws2_32.dll" ],
        }],
        ],
        "defines": [
        'NODEREPORT_VERSION="<!(node -p \"require(\'./package.json\').version\")"'
        ],
    },
    {
        "target_name": "rpigpio",
        "conditions": [
          ["OS!='win' and OS!='freebsd'", {
            "conditions": [[
                "OS == \"linux\"", {
                "cflags": [
                    "-Wno-unused-local-typedefs"
                ]
                }]
            ],
            "cflags": [
                "-Wall",
                "-O3"
            ],
            "include_dirs" : [ "nan" ],
            "sources": [
                "./src/native/hardware/boards/rpi/deps/pigpio.c",
                "./src/native/hardware/boards/rpi/deps/custom.cext",
                "./src/native/hardware/boards/rpi/deps/command.c",
                "./src/native/hardware/boards/rpi/gpio.cc"
            ],
            "link_settings": {
                "libraries": [
                "-pthread",

                ]
            }
          }]
        ]
    },
    {
      "target_name": "git",
      "dependencies": [
        "src/native/vcs/git/deps/libgit2.gyp:libgit2"
      ],
      "variables": {
        "coverage%": 0
      },
      "sources": [
        "src/native/vcs/git/src/async_baton.cc",
        "src/native/vcs/git/src/lock_master.cc",
        "src/native/vcs/git/src/nodegit.cc",
        "src/native/vcs/git/src/init_ssh2.cc",
        "src/native/vcs/git/src/promise_completion.cc",
        "src/native/vcs/git/src/wrapper.cc",
        "src/native/vcs/git/src/functions/copy.cc",
        "src/native/vcs/git/src/functions/free.cc",
        "src/native/vcs/git/src/convenient_patch.cc",
        "src/native/vcs/git/src/convenient_hunk.cc",
        "src/native/vcs/git/src/filter_registry.cc",
        "src/native/vcs/git/src/str_array_converter.cc",
        "src/native/vcs/git/src/thread_pool.cc",
        "src/native/vcs/git/src/annotated_commit.cc",
        "src/native/vcs/git/src/attr.cc",
        "src/native/vcs/git/src/blame.cc",
        "src/native/vcs/git/src/blame_hunk.cc",
        "src/native/vcs/git/src/blame_options.cc",
        "src/native/vcs/git/src/blob.cc",
        "src/native/vcs/git/src/branch.cc",
        "src/native/vcs/git/src/branch_iterator.cc",
        "src/native/vcs/git/src/buf.cc",
        "src/native/vcs/git/src/cert.cc",
        "src/native/vcs/git/src/cert_hostkey.cc",
        "src/native/vcs/git/src/cert_x509.cc",
        "src/native/vcs/git/src/checkout.cc",
        "src/native/vcs/git/src/checkout_options.cc",
        "src/native/vcs/git/src/cherrypick.cc",
        "src/native/vcs/git/src/cherrypick_options.cc",
        "src/native/vcs/git/src/clone.cc",
        "src/native/vcs/git/src/clone_options.cc",
        "src/native/vcs/git/src/commit.cc",
        "src/native/vcs/git/src/config.cc",
        "src/native/vcs/git/src/config_entry.cc",
        "src/native/vcs/git/src/config_entry.cc",
        "src/native/vcs/git/src/cred.cc",
        "src/native/vcs/git/src/cred_default.cc",
        "src/native/vcs/git/src/cred_username.cc",
        "src/native/vcs/git/src/cred_userpass_payload.cc",
        "src/native/vcs/git/src/cvar_map.cc",
        "src/native/vcs/git/src/describe_format_options.cc",
        "src/native/vcs/git/src/describe_options.cc",
        "src/native/vcs/git/src/describe_result.cc",
        "src/native/vcs/git/src/diff.cc",
        "src/native/vcs/git/src/diff_binary.cc",
        "src/native/vcs/git/src/diff_binary_file.cc",
        "src/native/vcs/git/src/diff_delta.cc",
        "src/native/vcs/git/src/diff_file.cc",
        "src/native/vcs/git/src/diff_find_options.cc",
        "src/native/vcs/git/src/diff_hunk.cc",
        "src/native/vcs/git/src/diff_line.cc",
        "src/native/vcs/git/src/diff_options.cc",
        "src/native/vcs/git/src/diff_perfdata.cc",
        "src/native/vcs/git/src/diff_perfdata.cc",
        "src/native/vcs/git/src/diff_stats.cc",
        "src/native/vcs/git/src/error.cc",
        "src/native/vcs/git/src/fetch.cc",
        "src/native/vcs/git/src/fetch_options.cc",
        "src/native/vcs/git/src/fetch_options.cc",
        "src/native/vcs/git/src/filter.cc",
        "src/native/vcs/git/src/filter.cc",
        "src/native/vcs/git/src/filter_list.cc",
        "src/native/vcs/git/src/filter_source.cc",
        "src/native/vcs/git/src/giterr.cc",
        "src/native/vcs/git/src/graph.cc",
        "src/native/vcs/git/src/hashsig.cc",
        "src/native/vcs/git/src/ignore.cc",
        "src/native/vcs/git/src/index.cc",
        "src/native/vcs/git/src/index_conflict_iterator.cc",
        "src/native/vcs/git/src/index_entry.cc",
        "src/native/vcs/git/src/index_time.cc",
        "src/native/vcs/git/src/indexer.cc",
        "src/native/vcs/git/src/libgit2.cc",
        "src/native/vcs/git/src/mempack.cc",
        "src/native/vcs/git/src/merge.cc",
        "src/native/vcs/git/src/merge_driver_source.cc",
        "src/native/vcs/git/src/merge_file_input.cc",
        "src/native/vcs/git/src/merge_file_options.cc",
        "src/native/vcs/git/src/merge_file_result.cc",
        "src/native/vcs/git/src/merge_options.cc",
        "src/native/vcs/git/src/merge_result.cc",
        "src/native/vcs/git/src/message.cc",
        "src/native/vcs/git/src/note.cc",
        "src/native/vcs/git/src/note_iterator.cc",
        "src/native/vcs/git/src/object.cc",
        "src/native/vcs/git/src/odb.cc",
        "src/native/vcs/git/src/odb_expand_id.cc",
        "src/native/vcs/git/src/odb_object.cc",
        "src/native/vcs/git/src/oid.cc",
        "src/native/vcs/git/src/oid_shorten.cc",
        "src/native/vcs/git/src/oidarray.cc",
        "src/native/vcs/git/src/openssl.cc",
        "src/native/vcs/git/src/packbuilder.cc",
        "src/native/vcs/git/src/patch.cc",
        "src/native/vcs/git/src/pathspec.cc",
        "src/native/vcs/git/src/pathspec_match_list.cc",
        "src/native/vcs/git/src/proxy.cc",
        "src/native/vcs/git/src/proxy_options.cc",
        "src/native/vcs/git/src/push.cc",
        "src/native/vcs/git/src/push_options.cc",
        "src/native/vcs/git/src/push_update.cc",
        "src/native/vcs/git/src/rebase.cc",
        "src/native/vcs/git/src/rebase_operation.cc",
        "src/native/vcs/git/src/rebase_options.cc",
        "src/native/vcs/git/src/refdb.cc",
        "src/native/vcs/git/src/reference.cc",
        "src/native/vcs/git/src/reflog.cc",
        "src/native/vcs/git/src/reflog_entry.cc",
        "src/native/vcs/git/src/refspec.cc",
        "src/native/vcs/git/src/remote.cc",
        "src/native/vcs/git/src/remote_callbacks.cc",
        "src/native/vcs/git/src/remote_callbacks.cc",
        "src/native/vcs/git/src/remote_head.cc",
        "src/native/vcs/git/src/remote_head.cc",
        "src/native/vcs/git/src/repository.cc",
        "src/native/vcs/git/src/repository_init_options.cc",
        "src/native/vcs/git/src/reset.cc",
        "src/native/vcs/git/src/revert.cc",
        "src/native/vcs/git/src/revert_options.cc",
        "src/native/vcs/git/src/revparse.cc",
        "src/native/vcs/git/src/revwalk.cc",
        "src/native/vcs/git/src/signature.cc",
        "src/native/vcs/git/src/smart.cc",
        "src/native/vcs/git/src/stash.cc",
        "src/native/vcs/git/src/stash_apply_options.cc",
        "src/native/vcs/git/src/status.cc",
        "src/native/vcs/git/src/status_entry.cc",
        "src/native/vcs/git/src/status_list.cc",
        "src/native/vcs/git/src/status_options.cc",
        "src/native/vcs/git/src/strarray.cc",
        "src/native/vcs/git/src/submodule.cc",
        "src/native/vcs/git/src/submodule_update_options.cc",
        "src/native/vcs/git/src/tag.cc",
        "src/native/vcs/git/src/time.cc",
        "src/native/vcs/git/src/trace.cc",
        "src/native/vcs/git/src/transaction.cc",
        "src/native/vcs/git/src/transfer_progress.cc",
        "src/native/vcs/git/src/transport.cc",
        "src/native/vcs/git/src/tree.cc",
        "src/native/vcs/git/src/tree_entry.cc",
        "src/native/vcs/git/src/tree_update.cc",
        "src/native/vcs/git/src/treebuilder.cc",
        "src/native/vcs/git/src/writestream.cc",
      ],
      "include_dirs": [
        "src/native/vcs/git/deps/libv8-convert",
        "src/native/vcs/git/deps/libssh2/include",
        "src/native/vcs/git/deps/openssl/openssl/include",
        "nan"
      ],
      "cflags": [
        "-Wall"
      ],
      "conditions": [
        [
            "coverage==1", {
            "cflags": [
                "-ftest-coverage",
                "-fprofile-arcs"
            ],
            "link_settings": {
                "libraries": [
                "-lgcov"
                ]
            },
            }
        ],
        [
            "OS=='mac'", {
            "xcode_settings": {
                "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                "MACOSX_DEPLOYMENT_TARGET": "10.7",

                "WARNING_CFLAGS": [
                "-Wno-unused-variable",
                "-Wint-conversions",
                "-Wmissing-field-initializers",
                "-Wno-c++11-extensions"
                ]
            }
            }
        ],
        [
            "OS=='win'", {
            "defines": [
                "_HAS_EXCEPTIONS=1"
            ],
            "msvs_settings": {
                "VCCLCompilerTool": {
                "AdditionalOptions": [
                    "/EHsc"
                ]
                },
                "VCLinkerTool": {
                "AdditionalOptions": [
                    "/FORCE:MULTIPLE"
                ]
                }
            }
            }
        ],
        [
            "OS=='linux' or OS=='mac'", {
            "libraries": [
                "-lcurl"
            ]
            }
        ],
        [
            "OS=='linux' and '<!(echo \"$CXX\")'=='clang++'", {
            "cflags": [
                "-Wno-c++11-extensions"
            ]
            }
        ],
        [
            "OS=='linux' and '<!(echo \"$CXX\")'!='clang++'", {
            "cflags": [
                "-std=c++0x"
            ]
            }
        ]
      ]
    },
    {
      'target_name': 'libvirt',
      "conditions": [
        ["OS!='win'", {
          'product_prefix': 'lib',
          'sources': [
            'src/native/virtualization/libvirt/domain.cc',
            'src/native/virtualization/libvirt/error.cc',
            'src/native/virtualization/libvirt/event_impl.cc',
            'src/native/virtualization/libvirt/hypervisor.cc',
            'src/native/virtualization/libvirt/interface.cc',
            'src/native/virtualization/libvirt/network.cc',
            'src/native/virtualization/libvirt/network_filter.cc',
            'src/native/virtualization/libvirt/nlv_async_worker.cc',
            'src/native/virtualization/libvirt/node_device.cc',
            'src/native/virtualization/libvirt/node_libvirt.cc',
            'src/native/virtualization/libvirt/secret.cc',
            'src/native/virtualization/libvirt/storage_pool.cc',
            'src/native/virtualization/libvirt/storage_volume.cc',
            'src/native/virtualization/libvirt/worker.cc'
          ],
          "cflags": [
            '-std=c++11',
          ],
          'include_dirs' : [ "nan" ],
          'conditions': [
            ['OS!="win"', {
              'link_settings': {
                'libraries': [
                  '<!@(pkg-config --libs libvirt)'
                ]
              },
              'cflags': [
                '<!@(pkg-config --cflags libvirt)'
              ],
            }],
            ['OS=="mac"', {
              'xcode_settings': {
                'GCC_ENABLE_CPP_RTTI': 'YES',
                'OTHER_CPLUSPLUSFLAGS' : [ '-std=c++11', '-stdlib=libc++' ],
                'OTHER_LDFLAGS': [ '-stdlib=libc++' ],
                'MACOSX_DEPLOYMENT_TARGET': "10.7"
              }
            }]
          ]
        }]
      ]
    },
        {
      "target_name": "fuse",
        "sources": ["src/native/fuse/bindings.cc", "src/native/fuse/abstractions.cc"],
        "include_dirs": [ "nan" ],
        "conditions": [
            ['OS!="win"', {
                'variables':
                {
                    'fuse__include_dirs%': '<!(pkg-config fuse --cflags-only-I | sed s/-I//g)',
                    'fuse__library_dirs%': '',
                    'fuse__libraries%': '<!(pkg-config --libs-only-L --libs-only-l fuse)'
                },
                "include_dirs": [
                    "<@(fuse__include_dirs)"
                ],
                'library_dirs': [
                  '<@(fuse__library_dirs)',
                ],
                "link_settings": {
                    "libraries": [
                        "<@(fuse__libraries)"
                    ]
                }
            }],
            ['OS=="win"', {
                "variables": {
                    'dokan__install_dir%': '$(DokanLibrary1)/include/fuse'
                },
                "include_dirs": [
                    "<(dokan__install_dir)",
                    "$(INCLUDE)"
                ],
                "link_settings": {
                    "libraries": [
                        "<(dokan__library)"
                    ]
                },
                "conditions": [
                    ['target_arch=="x64"', {
                        "variables": { 'dokan__library%': '$(DokanLibrary1_LibraryPath_x64)/dokanfuse1' }
                    }, {
                        "variables": { 'dokan__library%': '$(DokanLibrary1_LibraryPath_x86)/dokanfuse1' }
                    }]
                ]
            }]
        ],
        "configurations": {
            "Debug": {
                "msvs_settings": {
                    "VCCLCompilerTool": {
                        "RuntimeLibrary": 2
                    }
                }
            },
            "Release": {
                "msvs_settings": {
                    "VCCLCompilerTool": {
                        "RuntimeLibrary": 2
                    }
                }
            }
        }
    },
    {
      "target_name": "copy_modules",
      "variables": {
        "srcpath%": "<(module_root_dir)/build/Release",
      },
      "dependencies" : [
        "bignumber",
        "brotli",
        "lzma",
        "bson",
        "hiredis",
        "common",
        "metrics",
        "snappy",
        "leveldown",
        "masscan",
        "hid",
        "serial",
        "report",
        "rpigpio",
        "i2c",
        "git",
        "libvirt",
        "fuse"
      ],
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
            "<(srcpath)/masscan.node",
            "<(srcpath)/hid.node",
            "<(srcpath)/serial.node",
            "<(srcpath)/report.node",
            "<(srcpath)/rpigpio.node",
            "<(srcpath)/i2c.node",
            "<(srcpath)/git.node",
            "<(srcpath)/libvirt.node",
            "<(srcpath)/fuse.node"
          ],
          "destination": "<(module_root_dir)/lib/native"
        }
      ]
    }
  ]
}
