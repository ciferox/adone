# Copyright (c) 2015, Ruslan Baratov
# All rights reserved.

cmake_minimum_required(VERSION 3.0)

include(hunter_internal_error)
include(hunter_status_print)
include(hunter_assert_not_empty_string)
include(hunter_user_error)

function(hunter_set_config_location hunter_self result)
  hunter_assert_not_empty_string("${hunter_self}")
  hunter_assert_not_empty_string("${result}")

  if(HUNTER_GATE_FILEPATH)
    set(config_location "${HUNTER_GATE_FILEPATH}")
  else()
    set(config_location "${hunter_self}/cmake/configs/default.cmake")
    if(NOT EXISTS ${config_location})
      hunter_internal_error("${config_location} not found")
    endif()
  endif()

  if(NOT EXISTS "${config_location}")
    hunter_user_error("Config not found: ${config_location}")
  endif()

  set("${result}" "${config_location}" PARENT_SCOPE)
endfunction()
