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
        "src/native/vcs/git/src/git_buf_converter.cc",
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
          "OS=='linux' or OS.endswith('bsd')", {
            "cflags": [
              "-std=c++11"
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
      "target_name": "copy_modules",
      "variables": {
        "srcpath%": "<(module_root_dir)/build/Release",
      },
      "dependencies" : [
        "bignumber",
        "common",
        "metrics",
        "git",
        "libvirt"
      ],
      "copies": [
        {
          "files": [
            "<(srcpath)/bignumber.node",
            "<(srcpath)/common.node",
            "<(srcpath)/metrics.node",
            "<(srcpath)/git.node",
            "<(srcpath)/libvirt.node"
          ],
          "destination": "<(module_root_dir)/lib/native"
        }
      ]
    }
  ]
}
