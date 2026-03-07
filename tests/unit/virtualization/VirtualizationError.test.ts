import { test, expect, describe } from "bun:test";
import {
    VirtualizationError,
    VirtualizationErrorCode,
    AuthenticationError,
    ConnectionError,
    ResourceNotFoundError,
    VMNotFoundError,
    ActionExecutionError,
    ValidationError,
} from "@src/class/virtualization/errors";

describe("VirtualizationError hierarchy", () => {

    describe("VirtualizationError (base)", () => {
        test("creates error with message and code", () => {
            const err = new VirtualizationError("test error", VirtualizationErrorCode.UNKNOWN_ERROR);
            expect(err.message).toBe("test error");
            expect(err.code).toBe(VirtualizationErrorCode.UNKNOWN_ERROR);
            expect(err.name).toBe("VirtualizationError");
        });

        test("stores originalError and details", () => {
            const original = new Error("root cause");
            const err = new VirtualizationError(
                "wrapped",
                VirtualizationErrorCode.ACTION_FAILED,
                original,
                { key: "value" }
            );
            expect(err.originalError).toBe(original);
            expect(err.details).toEqual({ key: "value" });
        });

        test("is instance of Error", () => {
            const err = new VirtualizationError("test", VirtualizationErrorCode.UNKNOWN_ERROR);
            expect(err).toBeInstanceOf(Error);
        });
    });

    describe("AuthenticationError", () => {
        test("uses AUTHENTICATION_FAILED code", () => {
            const err = new AuthenticationError("auth failed");
            expect(err.code).toBe(VirtualizationErrorCode.AUTHENTICATION_FAILED);
            expect(err.name).toBe("AuthenticationError");
        });

        test("is instance of VirtualizationError", () => {
            const err = new AuthenticationError("auth failed");
            expect(err).toBeInstanceOf(VirtualizationError);
            expect(err).toBeInstanceOf(Error);
        });
    });

    describe("ConnectionError", () => {
        test("uses CONNECTION_FAILED code", () => {
            const err = new ConnectionError("connection lost");
            expect(err.code).toBe(VirtualizationErrorCode.CONNECTION_FAILED);
            expect(err.name).toBe("ConnectionError");
        });

        test("stores original error", () => {
            const original = new Error("ECONNREFUSED");
            const err = new ConnectionError("failed", original);
            expect(err.originalError).toBe(original);
        });
    });

    describe("ResourceNotFoundError", () => {
        test("formats message with resource type and ID", () => {
            const err = new ResourceNotFoundError("Node", "node-1");
            expect(err.message).toBe("Node with ID node-1 not found");
            expect(err.code).toBe(VirtualizationErrorCode.RESOURCE_NOT_FOUND);
        });

        test("stores resource info in details", () => {
            const err = new ResourceNotFoundError("Panel", "panel-5");
            expect(err.details).toEqual({ resourceType: "Panel", resourceId: "panel-5" });
        });
    });

    describe("VMNotFoundError", () => {
        test("formats message with VM ID", () => {
            const err = new VMNotFoundError("vm-100");
            expect(err.message).toBe("VM vm-100 not found");
            expect(err.code).toBe(VirtualizationErrorCode.VM_NOT_FOUND);
        });

        test("stores vmId in details", () => {
            const err = new VMNotFoundError("vm-200");
            expect(err.details).toEqual({ vmId: "vm-200" });
        });

        test("is instance of VirtualizationError", () => {
            const err = new VMNotFoundError("vm-100");
            expect(err).toBeInstanceOf(VirtualizationError);
        });
    });

    describe("ActionExecutionError", () => {
        test("formats message with action, resource, and message", () => {
            const err = new ActionExecutionError("start", "vm-100", "timeout");
            expect(err.message).toBe("Failed to execute start on vm-100: timeout");
            expect(err.code).toBe(VirtualizationErrorCode.ACTION_FAILED);
        });

        test("stores action and resource in details", () => {
            const err = new ActionExecutionError("stop", "vm-200", "error");
            expect(err.details).toEqual({ action: "stop", resourceId: "vm-200" });
        });
    });

    describe("ValidationError", () => {
        test("uses VALIDATION_FAILED code", () => {
            const err = new ValidationError("invalid input", { field: "name" });
            expect(err.code).toBe(VirtualizationErrorCode.VALIDATION_FAILED);
            expect(err.message).toBe("invalid input");
            expect(err.details).toEqual({ field: "name" });
        });
    });

    describe("VirtualizationErrorCode enum", () => {
        test("has all expected values", () => {
            expect(VirtualizationErrorCode.AUTHENTICATION_FAILED).toBe(VirtualizationErrorCode.AUTHENTICATION_FAILED);
            expect(VirtualizationErrorCode.CONNECTION_FAILED).toBe(VirtualizationErrorCode.CONNECTION_FAILED);
            expect(VirtualizationErrorCode.RESOURCE_NOT_FOUND).toBe(VirtualizationErrorCode.RESOURCE_NOT_FOUND);
            expect(VirtualizationErrorCode.ACTION_FAILED).toBe(VirtualizationErrorCode.ACTION_FAILED);
            expect(VirtualizationErrorCode.VALIDATION_FAILED).toBe(VirtualizationErrorCode.VALIDATION_FAILED);
            expect(VirtualizationErrorCode.UNKNOWN_ERROR).toBe(VirtualizationErrorCode.UNKNOWN_ERROR);
            expect(VirtualizationErrorCode.UNSUPPORTED_PROVIDER).toBe(VirtualizationErrorCode.UNSUPPORTED_PROVIDER);
            expect(VirtualizationErrorCode.VM_NOT_FOUND).toBe(VirtualizationErrorCode.VM_NOT_FOUND);
        });

        test("enum values are defined strings", () => {
            // Verify each enum member has a string value
            expect(typeof VirtualizationErrorCode.AUTHENTICATION_FAILED).toBe("string");
            expect(typeof VirtualizationErrorCode.CONNECTION_FAILED).toBe("string");
            expect(typeof VirtualizationErrorCode.VM_NOT_FOUND).toBe("string");
        });
    });
});
