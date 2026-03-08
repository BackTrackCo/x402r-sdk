// Re-export everything from actions for backward compatibility
// This file is deprecated — import from '../actions/index.js' instead
export {
  requireAccount,
  wrapContractCall,
} from '../actions/_internal/error-wrapping.js'
export * from '../actions/index.js'
