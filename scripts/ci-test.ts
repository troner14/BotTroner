#!/usr/bin/env bun
// Script específico para ejecutar tests en CI de manera controlada

import { spawn } from "bun";

async function runCITests() {
    console.log("🚀 Starting CI test execution");
    
    // Configurar environment para CI
    process.env.NODE_ENV = "test";
    process.env.CI = "true";
    process.env.LOG_LEVEL = "error";
    
    try {
        // Ejecutar tests con timeout
        const testProcess = spawn({
            cmd: ["bun", "test", "--coverage", "--timeout", "60000"],
            env: {
                ...process.env,
                NODE_ENV: "test",
                CI: "true",
                LOG_LEVEL: "error"
            },
            stdio: ["inherit", "inherit", "inherit"]
        });
        
        // Timeout de seguridad
        const timeoutId = setTimeout(() => {
            console.log("⏰ Test timeout reached, terminating...");
            testProcess.kill();
            process.exit(1);
        }, 300000); // 5 minutos
        
        const exitCode = await testProcess.exited;
        clearTimeout(timeoutId);
        
        if (exitCode === 0) {
            console.log("✅ All tests passed successfully");
        } else {
            console.log(`❌ Tests failed with exit code: ${exitCode}`);
        }
        
        process.exit(exitCode);
        
    } catch (error) {
        console.error("💥 Error running tests:", error);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (import.meta.main) {
    runCITests();
}