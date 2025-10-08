#!/usr/bin/env bun
// Script específico para ejecutar tests en CI de manera controlada

async function runCITests() {
    console.log("🚀 Starting CI test execution");
    
    // Configurar environment para CI
    process.env.NODE_ENV = "test";
    process.env.CI = "true";
    process.env.LOG_LEVEL = "error";
    
    // Timeout global de emergencia - si pasa de 4 minutos, matar todo
    const emergencyTimeout = setTimeout(() => {
        console.log("🚨 Emergency timeout reached! Force killing process...");
        process.exit(1);
    }, 240000); // 4 minutos
    
    try {
        console.log("📋 Running tests with 60 second timeout per test...");
        
        // Usar Bun.spawn con configuración más estricta
        const proc = Bun.spawn([
            "bun", "test", 
            "--coverage", 
            "--timeout", "60000",
            "--bail", "1"  // Parar en el primer error
        ], {
            env: {
                ...process.env,
                NODE_ENV: "test",
                CI: "true",
                LOG_LEVEL: "error",
                FORCE_COLOR: "0"  // Deshabilitar colores en CI
            },
            stdio: ["inherit", "pipe", "pipe"]
        });
        
        let output = "";
        let errorOutput = "";
        
        // Capturar output
        const decoder = new TextDecoder();
        
        if (proc.stdout) {
            for await (const chunk of proc.stdout) {
                const text = decoder.decode(chunk);
                output += text;
                process.stdout.write(text);
            }
        }
        
        if (proc.stderr) {
            for await (const chunk of proc.stderr) {
                const text = decoder.decode(chunk);
                errorOutput += text;
                process.stderr.write(text);
            }
        }
        
        console.log("⏳ Waiting for test process to complete...");
        const exitCode = await proc.exited;
        
        clearTimeout(emergencyTimeout);
        
        console.log(`🏁 Test process completed with exit code: ${exitCode}`);
        
        if (exitCode === 0) {
            console.log("✅ All tests passed successfully");
        } else {
            console.log(`❌ Tests failed with exit code: ${exitCode}`);
        }
        
        // Forzar salida inmediata
        setTimeout(() => {
            console.log("🔚 Force exiting...");
            process.exit(exitCode);
        }, 1000);
        
        return exitCode;
        
    } catch (error) {
        clearTimeout(emergencyTimeout);
        console.error("💥 Error running tests:", error);
        
        setTimeout(() => {
            process.exit(1);
        }, 500);
    }
}

// Ejecutar si se llama directamente
if (import.meta.main) {
    runCITests();
}