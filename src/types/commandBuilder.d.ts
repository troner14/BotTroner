import { RunOptions, autocomplete_type } from "./commands"; 

export type runCommand = (options: RunOptions) => Promise<void> | void;
export type autocompleteCommand = (options: autocomplete_type) => Promise<void> | void;