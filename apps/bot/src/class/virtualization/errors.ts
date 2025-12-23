
export enum VirtualizationErrorCode {
    AUTHENTICATION_FAILED = 'AUTH_FAILED',
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    ACTION_FAILED = 'ACTION_FAILED',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    UNSUPPORTED_PROVIDER = 'UNSUPPORTED_PROVIDER',
    VM_NOT_FOUND = 'VM_NOT_FOUND'
}

export class VirtualizationError extends Error {
    constructor(
        public message: string,
        public code: VirtualizationErrorCode,
        public originalError?: unknown,
        public details?: Record<string, any>
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class AuthenticationError extends VirtualizationError {
    constructor(message: string, originalError?: unknown, details?: Record<string, any>) {
        super(message, VirtualizationErrorCode.AUTHENTICATION_FAILED, originalError, details);
    }
}

export class ConnectionError extends VirtualizationError {
    constructor(message: string, originalError?: unknown, details?: Record<string, any>) {
        super(message, VirtualizationErrorCode.CONNECTION_FAILED, originalError, details);
    }
}

export class ResourceNotFoundError extends VirtualizationError {
    constructor(resourceType: string, resourceId: string, originalError?: unknown) {
        super(
            `${resourceType} with ID ${resourceId} not found`, 
            VirtualizationErrorCode.RESOURCE_NOT_FOUND, 
            originalError,
            { resourceType, resourceId }
        );
    }
}

export class VMNotFoundError extends VirtualizationError {
    constructor(vmId: string) {
        super(`VM ${vmId} not found`, VirtualizationErrorCode.VM_NOT_FOUND, undefined, { vmId });
    }
}

export class ActionExecutionError extends VirtualizationError {
    constructor(action: string, resourceId: string, message: string, originalError?: unknown) {
        super(
            `Failed to execute ${action} on ${resourceId}: ${message}`,
            VirtualizationErrorCode.ACTION_FAILED,
            originalError,
            { action, resourceId }
        );
    }
}

export class ValidationError extends VirtualizationError {
    constructor(message: string, details?: Record<string, any>) {
        super(message, VirtualizationErrorCode.VALIDATION_FAILED, undefined, details);
    }
}
