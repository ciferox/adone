{
  'targets': [
    {
      'target_name': 'common',
      'sources': [
        'common.cc'
      ],
      'cflags!': [ '-O3' ],
      'cflags': [ '-O2' ],
      'include_dirs' : [
        "<(adone_root_dir)/nan",
        "<(adone_root_dir)/src/native"
      ]
    }
  ]
}
