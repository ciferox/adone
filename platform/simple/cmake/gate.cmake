set(
    HUNTER_CACHE_SERVERS
    "https://github.com/ciferox/adone-native-cache"
    CACHE
    STRING
    "Default cache server"
)

option(HUNTER_RUN_UPLOAD "Upload cache binaries" OFF)

set(
    HUNTER_PASSWORDS_PATH
    "${CMAKE_CURRENT_LIST_DIR}/passwords.cmake"
    CACHE
    FILEPATH
    "Hunter passwords"
)

set(HUNTER_GATE_URL "https://github.com/ruslo/hunter/archive/v0.23.33.tar.gz")
set(HUNTER_GATE_SHA1 "acbf4b9b77b5a0160adc1da1cdda35f64b14196a")

if(CMAKE_VERSION VERSION_LESS "3.10")
  message(
      FATAL_ERROR
      "At least CMake version 3.10 required for Adone dependency management."
  )
endif()

include(CMakeParseArguments) # cmake_parse_arguments

option(HUNTER_STATUS_PRINT "Print working status" ON)
option(HUNTER_STATUS_DEBUG "Print a lot info" OFF)
option(HUNTER_TLS_VERIFY "Enable/disable TLS certificate checking on downloads" ON)

set(HUNTER_WIKI "https://github.com/ruslo/hunter/wiki")

function(hunter_gate_status_print)
  if(HUNTER_STATUS_PRINT OR HUNTER_STATUS_DEBUG)
    foreach(print_message ${ARGV})
      message(STATUS "[hunter] ${print_message}")
    endforeach()
  endif()
endfunction()

function(hunter_gate_status_debug)
  if(HUNTER_STATUS_DEBUG)
    foreach(print_message ${ARGV})
      string(TIMESTAMP timestamp)
      message(STATUS "[hunter *** DEBUG *** ${timestamp}] ${print_message}")
    endforeach()
  endif()
endfunction()

function(hunter_gate_wiki wiki_page)
  message("------------------------------ WIKI -------------------------------")
  message("    ${HUNTER_WIKI}/${wiki_page}")
  message("-------------------------------------------------------------------")
  message("")
  message(FATAL_ERROR "")
endfunction()

function(hunter_gate_internal_error)
  message("")
  foreach(print_message ${ARGV})
    message("[hunter ** INTERNAL **] ${print_message}")
  endforeach()
  message("[hunter ** INTERNAL **] [Directory:${CMAKE_CURRENT_LIST_DIR}]")
  message("")
  hunter_gate_wiki("error.internal")
endfunction()

function(hunter_gate_fatal_error)
  cmake_parse_arguments(hunter "" "WIKI" "" "${ARGV}")
  string(COMPARE EQUAL "${hunter_WIKI}" "" have_no_wiki)
  if(have_no_wiki)
    hunter_gate_internal_error("Expected wiki")
  endif()
  message("")
  foreach(x ${hunter_UNPARSED_ARGUMENTS})
    message("[hunter ** FATAL ERROR **] ${x}")
  endforeach()
  message("[hunter ** FATAL ERROR **] [Directory:${CMAKE_CURRENT_LIST_DIR}]")
  message("")
  hunter_gate_wiki("${hunter_WIKI}")
endfunction()

function(hunter_gate_user_error)
  hunter_gate_fatal_error(${ARGV} WIKI "error.incorrect.input.data")
endfunction()

function(hunter_gate_self root version sha1 result)
  string(COMPARE EQUAL "${root}" "" is_bad)
  if(is_bad)
    hunter_gate_internal_error("root is empty")
  endif()

  string(COMPARE EQUAL "${version}" "" is_bad)
  if(is_bad)
    hunter_gate_internal_error("version is empty")
  endif()

  string(COMPARE EQUAL "${sha1}" "" is_bad)
  if(is_bad)
    hunter_gate_internal_error("sha1 is empty")
  endif()

  string(SUBSTRING "${sha1}" 0 7 archive_id)

  if(EXISTS "${root}/cmake/Hunter")
    set(hunter_self "${root}")
  else()
    set(
        hunter_self
        "${root}/_Base/Download/Hunter/${version}/${archive_id}/Unpacked"
    )
  endif()

  set("${result}" "${hunter_self}" PARENT_SCOPE)
endfunction()

# Set HUNTER_GATE_ROOT cmake variable to suitable value.
function(hunter_gate_detect_root)
  # Check CMake variable
  string(COMPARE NOTEQUAL "${HUNTER_ROOT}" "" not_empty)
  if(not_empty)
    set(HUNTER_GATE_ROOT "${HUNTER_ROOT}" PARENT_SCOPE)
    hunter_gate_status_debug("HUNTER_ROOT detected by cmake variable")
    return()
  endif()

  # Check environment variable
  string(COMPARE NOTEQUAL "$ENV{HUNTER_ROOT}" "" not_empty)
  if(not_empty)
    set(HUNTER_GATE_ROOT "$ENV{HUNTER_ROOT}" PARENT_SCOPE)
    hunter_gate_status_debug("HUNTER_ROOT detected by environment variable")
    return()
  endif()

  hunter_gate_fatal_error(
      "Can't detect HUNTER_ROOT"
      WIKI "error.detect.hunter.root"
  )
endfunction()

function(hunter_gate_download dir)
  string(
      COMPARE
      NOTEQUAL
      "$ENV{HUNTER_DISABLE_AUTOINSTALL}"
      ""
      disable_autoinstall
  )
  if(disable_autoinstall AND NOT HUNTER_RUN_INSTALL)
    hunter_gate_fatal_error(
        "Hunter not found in '${dir}'"
        "Set HUNTER_RUN_INSTALL=ON to auto-install it from '${HUNTER_GATE_URL}'"
        "Settings:"
        "  HUNTER_ROOT: ${HUNTER_GATE_ROOT}"
        "  HUNTER_SHA1: ${HUNTER_GATE_SHA1}"
        WIKI "error.run.install"
    )
  endif()
  string(COMPARE EQUAL "${dir}" "" is_bad)
  if(is_bad)
    hunter_gate_internal_error("Empty 'dir' argument")
  endif()

  string(COMPARE EQUAL "${HUNTER_GATE_SHA1}" "" is_bad)
  if(is_bad)
    hunter_gate_internal_error("HUNTER_GATE_SHA1 empty")
  endif()

  string(COMPARE EQUAL "${HUNTER_GATE_URL}" "" is_bad)
  if(is_bad)
    hunter_gate_internal_error("HUNTER_GATE_URL empty")
  endif()

  set(done_location "${dir}/DONE")
  set(sha1_location "${dir}/SHA1")

  set(build_dir "${dir}/Build")
  set(cmakelists "${dir}/CMakeLists.txt")

  hunter_gate_status_debug("Locking directory: ${dir}")
  file(LOCK "${dir}" DIRECTORY GUARD FUNCTION)
  hunter_gate_status_debug("Lock done")

  if(EXISTS "${done_location}")
    # while waiting for lock other instance can do all the job
    hunter_gate_status_debug("File '${done_location}' found, skip install")
    return()
  endif()

  file(REMOVE_RECURSE "${build_dir}")
  file(REMOVE_RECURSE "${cmakelists}")

  file(MAKE_DIRECTORY "${build_dir}") # check directory permissions

  # Disabling languages speeds up a little bit, reduces noise in the output
  # and avoids path too long windows error
  file(
      WRITE
      "${cmakelists}"
      "cmake_minimum_required(VERSION 3.2)\n"
      "project(HunterDownload LANGUAGES NONE)\n"
      "include(ExternalProject)\n"
      "ExternalProject_Add(\n"
      "    Hunter\n"
      "    URL\n"
      "    \"${HUNTER_GATE_URL}\"\n"
      "    URL_HASH\n"
      "    SHA1=${HUNTER_GATE_SHA1}\n"
      "    DOWNLOAD_DIR\n"
      "    \"${dir}\"\n"
      "    TLS_VERIFY\n"
      "    ${HUNTER_TLS_VERIFY}\n"
      "    SOURCE_DIR\n"
      "    \"${dir}/Unpacked\"\n"
      "    CONFIGURE_COMMAND\n"
      "    \"\"\n"
      "    BUILD_COMMAND\n"
      "    \"\"\n"
      "    INSTALL_COMMAND\n"
      "    \"\"\n"
      ")\n"
  )

  if(HUNTER_STATUS_DEBUG)
    set(logging_params "")
  else()
    set(logging_params OUTPUT_QUIET)
  endif()

  hunter_gate_status_debug("Run generate")

  # Need to add toolchain file too.
  # Otherwise on Visual Studio + MDD this will fail with error:
  # "Could not find an appropriate version of the Windows 10 SDK installed on this machine"
  if(EXISTS "${CMAKE_TOOLCHAIN_FILE}")
    get_filename_component(absolute_CMAKE_TOOLCHAIN_FILE "${CMAKE_TOOLCHAIN_FILE}" ABSOLUTE)
    set(toolchain_arg "-DCMAKE_TOOLCHAIN_FILE=${absolute_CMAKE_TOOLCHAIN_FILE}")
  else()
    # 'toolchain_arg' can't be empty
    set(toolchain_arg "-DCMAKE_TOOLCHAIN_FILE=")
  endif()

  string(COMPARE EQUAL "${CMAKE_MAKE_PROGRAM}" "" no_make)
  if(no_make)
    set(make_arg "")
  else()
    # Test case: remove Ninja from PATH but set it via CMAKE_MAKE_PROGRAM
    set(make_arg "-DCMAKE_MAKE_PROGRAM=${CMAKE_MAKE_PROGRAM}")
  endif()

  execute_process(
      COMMAND
      "${CMAKE_COMMAND}"
      "-H${dir}"
      "-B${build_dir}"
      "-G${CMAKE_GENERATOR}"
      "${toolchain_arg}"
      ${make_arg}
      WORKING_DIRECTORY "${dir}"
      RESULT_VARIABLE download_result
      ${logging_params}
  )

  if(NOT download_result EQUAL 0)
    hunter_gate_internal_error(
        "Configure project failed."
        "To reproduce the error run: ${CMAKE_COMMAND} -H${dir} -B${build_dir} -G${CMAKE_GENERATOR} ${toolchain_arg} ${make_arg}"
        "In directory ${dir}"
    )
  endif()

  hunter_gate_status_print(
      "Initializing Hunter workspace (${HUNTER_GATE_SHA1})"
      "  ${HUNTER_GATE_URL}"
      "  -> ${dir}"
  )
  execute_process(
      COMMAND "${CMAKE_COMMAND}" --build "${build_dir}"
      WORKING_DIRECTORY "${dir}"
      RESULT_VARIABLE download_result
      ${logging_params}
  )

  if(NOT download_result EQUAL 0)
    hunter_gate_internal_error("Build project failed")
  endif()

  file(REMOVE_RECURSE "${build_dir}")
  file(REMOVE_RECURSE "${cmakelists}")

  file(WRITE "${sha1_location}" "${HUNTER_GATE_SHA1}")
  file(WRITE "${done_location}" "DONE")

  hunter_gate_status_debug("Finished")
endfunction()

# Must be a macro so master file 'cmake/Hunter' can
# apply all variables easily just by 'include' command
# (otherwise PARENT_SCOPE magic needed)
macro(HunterGate)
  if(HUNTER_GATE_DONE)
    # variable HUNTER_GATE_DONE set explicitly for external project
    # (see `hunter_download`)
    set_property(GLOBAL PROPERTY HUNTER_GATE_DONE YES)
  endif()

  # First HunterGate command will init Hunter, others will be ignored
  get_property(_hunter_gate_done GLOBAL PROPERTY HUNTER_GATE_DONE SET)

  if(_hunter_gate_done)
    hunter_gate_status_debug("Secondary HunterGate (use old settings)")
    hunter_gate_self(
        "${HUNTER_CACHED_ROOT}"
        "${HUNTER_VERSION}"
        "${HUNTER_SHA1}"
        _hunter_self
    )
    include("${_hunter_self}/cmake/Hunter")
  else()
    set(HUNTER_GATE_LOCATION "${CMAKE_CURRENT_SOURCE_DIR}")

    string(COMPARE NOTEQUAL "${PROJECT_NAME}" "" _have_project_name)
    if(_have_project_name)
      hunter_gate_fatal_error(
          "Please set HunterGate *before* 'project' command. "
          "Detected project: ${PROJECT_NAME}"
          WIKI "error.huntergate.before.project"
      )
    endif()

    string(COMPARE EQUAL "${HUNTER_GATE_SHA1}" "" _empty_sha1)
    string(COMPARE EQUAL "${HUNTER_GATE_URL}" "" _empty_url)
    string(
        COMPARE
        NOTEQUAL
        "${HUNTER_GATE_UNPARSED_ARGUMENTS}"
        ""
        _have_unparsed
    )

    if(_have_unparsed)
      hunter_gate_user_error(
          "HunterGate unparsed arguments: ${HUNTER_GATE_UNPARSED_ARGUMENTS}"
      )
    endif()
    if(_empty_sha1)
      hunter_gate_user_error("SHA1 suboption of HunterGate is mandatory")
    endif()
    if(_empty_url)
      hunter_gate_user_error("URL suboption of HunterGate is mandatory")
    endif()

    hunter_gate_detect_root() # set HUNTER_GATE_ROOT

    # Beautify path, fix probable problems with windows path slashes
    get_filename_component(
        HUNTER_GATE_ROOT "${HUNTER_GATE_ROOT}" ABSOLUTE
    )
    hunter_gate_status_debug("HUNTER_ROOT: ${HUNTER_GATE_ROOT}")
    if(NOT HUNTER_ALLOW_SPACES_IN_PATH)
      string(FIND "${HUNTER_GATE_ROOT}" " " _contain_spaces)
      if(NOT _contain_spaces EQUAL -1)
        hunter_gate_fatal_error(
            "HUNTER_ROOT (${HUNTER_GATE_ROOT}) contains spaces."
            "Set HUNTER_ALLOW_SPACES_IN_PATH=ON to skip this error"
            "(Use at your own risk!)"
            WIKI "error.spaces.in.hunter.root"
        )
      endif()
    endif()

    string(
        REGEX
        MATCH
        "[0-9]+\\.[0-9]+\\.[0-9]+[-_a-z0-9]*"
        HUNTER_GATE_VERSION
        "${HUNTER_GATE_URL}"
    )
    string(COMPARE EQUAL "${HUNTER_GATE_VERSION}" "" _is_empty)
    if(_is_empty)
      set(HUNTER_GATE_VERSION "unknown")
    endif()

    hunter_gate_self(
        "${HUNTER_GATE_ROOT}"
        "${HUNTER_GATE_VERSION}"
        "${HUNTER_GATE_SHA1}"
        _hunter_self
    )

    set(_master_location "${_hunter_self}/cmake/Hunter")
    if(EXISTS "${HUNTER_GATE_ROOT}/cmake/Hunter")
      # Hunter downloaded manually (e.g. by 'git clone')
      set(_unused "xxxxxxxxxx")
      set(HUNTER_GATE_SHA1 "${_unused}")
      set(HUNTER_GATE_VERSION "${_unused}")
    else()
      get_filename_component(_archive_id_location "${_hunter_self}/.." ABSOLUTE)
      set(_done_location "${_archive_id_location}/DONE")
      set(_sha1_location "${_archive_id_location}/SHA1")

      # Check Hunter already downloaded by HunterGate
      if(NOT EXISTS "${_done_location}")
        hunter_gate_download("${_archive_id_location}")
      endif()

      if(NOT EXISTS "${_done_location}")
        hunter_gate_internal_error("hunter_gate_download failed")
      endif()

      if(NOT EXISTS "${_sha1_location}")
        hunter_gate_internal_error("${_sha1_location} not found")
      endif()
      file(READ "${_sha1_location}" _sha1_value)
      string(COMPARE EQUAL "${_sha1_value}" "${HUNTER_GATE_SHA1}" _is_equal)
      if(NOT _is_equal)
        hunter_gate_internal_error(
            "Short SHA1 collision:"
            "  ${_sha1_value} (from ${_sha1_location})"
            "  ${HUNTER_GATE_SHA1} (HunterGate)"
        )
      endif()
      if(NOT EXISTS "${_master_location}")
        hunter_gate_user_error(
            "Master file not found:"
            "  ${_master_location}"
            "try to update Hunter/HunterGate"
        )
      endif()
    endif()
    include("${_master_location}")
    set_property(GLOBAL PROPERTY HUNTER_GATE_DONE YES)
  endif()
endmacro()