{
  'targets': [
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
      "target_name": "copy_modules",
      "variables": {
        "srcpath%": "<(module_root_dir)/build/Release",
      },
      "dependencies" : [
        "bignumber",
        "common",
        "metrics",
        "libvirt"
      ],
      "copies": [
        {
          "files": [
            "<(srcpath)/bignumber.node",
            "<(srcpath)/common.node",
            "<(srcpath)/metrics.node",
            "<(srcpath)/libvirt.node"
          ],
          "destination": "<(module_root_dir)/lib/native"
        }
      ]
    }
  ]
}
