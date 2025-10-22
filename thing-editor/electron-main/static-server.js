const express = require('express');
const server = express();
const enumProjects = require('./enum-projects.js');
const fs = require('fs');
const path = require('path');

const editorRoot = path.join(__dirname, '../..');

// Get all game projects
const projects = enumProjects();

// For each project, check if it's a symlink and add a specific static route if it is
projects.forEach(project => {
    const projectPath = path.join(editorRoot, 'games', project.dir);
    try {
        if (fs.lstatSync(projectPath).isSymbolicLink()) {
            const realPath = fs.realpathSync(projectPath);
            server.use('/games/' + project.dir, express.static(realPath));
        }
    } catch(er) {
        console.error('Could not setup static server for project ' + projectPath, er);
    }
});

// Serve the main editor directory
server.use(express.static(editorRoot));

server.listen(5174);
