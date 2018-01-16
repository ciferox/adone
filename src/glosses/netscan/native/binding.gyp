{
  'targets': [
    {
      "target_name": "libmasscan",
      "type": "shared_library",
      "variables": {
        'path': 'src/masscan/src',
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
    },
    {
      "target_name": "masscan",
      "include_dirs": [
          "<(adone_native_dir)/nan",
          "<(adone_native_dir)/adone",
          "src/masscan",
      ],
      "dependencies": [
          "libmasscan",
      ],
      "sources": [
          "src/masscan.cc",
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
      ]
    }
  ]
}
