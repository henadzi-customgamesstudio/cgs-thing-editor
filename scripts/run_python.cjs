const { spawn } = require('child_process');
const path = require('path');

/**
 * Executes a python script and pipes output to the editor notification system.
 * @param {Function} notify - The notification function provided by the editor server.
 * @param {string} scriptPath - Relative path to the python script from project root.
 * @param {...string} args - Arguments to pass to the python script.
 * @returns {Promise<any>}
 */
module.exports = function (notify, scriptPath, ...args) {
    return new Promise((resolve, reject) => {
        const projectRoot = path.resolve(__dirname, '../');
        const absScriptPath = path.join(projectRoot, scriptPath);

        notify(`Starting Python script: ${scriptPath}...`);

        const venvPython = path.join(projectRoot, '.venv/bin/python3');
        const systemPython = 'python3';

        // Simple check if venv python exists? Or just try it?
        // Since we know we created it, let's try to use it. 
        // A more robust solution would check fs.existsSync(venvPython), but let's assume it for now or try-catch.
        // Actually, let's keep it simple: use venv python path. If we want fallback we need more logic.
        // Given the error context, forcing venv is the fix.

        let pythonCommand = systemPython;
        // Check if venv exists synchronously to decide
        const fs = require('fs');

        notify(`Debug: projectRoot=${projectRoot}`);
        notify(`Debug: venvPython=${venvPython}`);
        notify(`Debug: absScriptPath=${absScriptPath}`);

        if (fs.existsSync(venvPython)) {
            pythonCommand = venvPython;
            notify('Debug: Using venv python');
        } else {
            notify('Debug: Using system python (venv not found)');
        }

        const pythonProcess = spawn(pythonCommand, [absScriptPath, ...args], {
            cwd: projectRoot
        });

        pythonProcess.stdout.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
                console.log(`[Python stdout]: ${message}`);
                notify(message);
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
                console.error(`[Python stderr]: ${message}`);
                // Notify treats everything as info, but for potential errors we might want to flag it?
                // For now just pipe to notify so user sees it in editor.
                notify(`Error: ${message}`);
            }
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                notify(`Script finished successfully.`);
                resolve('Success');
            } else {
                notify(`Script exited with code ${code}.`);
                reject(new Error(`Script exited with code ${code}`));
            }
        });

        pythonProcess.on('error', (err) => {
            notify(`Failed to start python process: ${err.message}`);
            reject(err);
        });
    });
};
