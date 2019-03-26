// @flow

// Each scope gets a bitset that may contain these flags
// prettier-ignore
export const SCOPE_OTHER = 0b000000000;
export const SCOPE_PROGRAM = 0b000000001;
export const SCOPE_FUNCTION = 0b000000010;
export const SCOPE_ASYNC = 0b000000100;
export const SCOPE_GENERATOR = 0b000001000;
export const SCOPE_ARROW = 0b000010000;
export const SCOPE_SIMPLE_CATCH = 0b000100000;
export const SCOPE_SUPER = 0b001000000;
export const SCOPE_DIRECT_SUPER = 0b010000000;
export const SCOPE_CLASS = 0b100000000;
export const SCOPE_VAR = SCOPE_PROGRAM | SCOPE_FUNCTION;

export type ScopeFlags =
  | typeof SCOPE_OTHER
  | typeof SCOPE_PROGRAM
  | typeof SCOPE_FUNCTION
  | typeof SCOPE_VAR
  | typeof SCOPE_ASYNC
  | typeof SCOPE_GENERATOR
  | typeof SCOPE_ARROW
  | typeof SCOPE_SIMPLE_CATCH
  | typeof SCOPE_SUPER
  | typeof SCOPE_DIRECT_SUPER
  | typeof SCOPE_CLASS;

export function functionFlags(isAsync: boolean, isGenerator: boolean) {
    return (
        SCOPE_FUNCTION |
    (isAsync ? SCOPE_ASYNC : 0) |
    (isGenerator ? SCOPE_GENERATOR : 0)
    );
}

// Used in checkLVal and declareName to determine the type of a binding
export const BIND_NONE = 0; // Not a binding
export const BIND_VAR = 1; // Var-style binding
export const BIND_LEXICAL = 2; // Let- or const-style binding
export const BIND_FUNCTION = 3; // Function declaration
export const BIND_SIMPLE_CATCH = 4; // Simple (identifier pattern) catch binding
export const BIND_OUTSIDE = 5; // Special case for function names as bound inside the function

export type BindingTypes =
  | typeof BIND_NONE
  | typeof BIND_VAR
  | typeof BIND_LEXICAL
  | typeof BIND_FUNCTION
  | typeof BIND_SIMPLE_CATCH
  | typeof BIND_OUTSIDE;
