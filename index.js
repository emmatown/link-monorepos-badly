#!/usr/bin/env node
let fs = require("fs-extra");
let path = require("path");
let chalk = require("chalk");
let getWorkspaces = require("get-workspaces").default;

let foreignMonorepo = path.join(__dirname, process.argv[0]);
let localMonorepo = process.cwd();

let depTypes = ["dependencies", "peerDependencies"];

(async () => {
  let [foreignWorkspaces, localWorkspaces] = await Promise.all([
    getWorkspaces({
      tools: ["bolt", "yarn", "root"],
      cwd: foreignMonorepo
    }),
    getWorkspaces({
      tools: ["bolt", "yarn", "root"],
      cwd: localMonorepo
    })
  ]);

  let foreignWorkspacesMap = new Map();

  for (let foreignWorkspace of foreignWorkspaces) {
    foreignWorkspacesMap.set(foreignWorkspace.name, foreignWorkspace.dir);
  }

  for (let workspace of localWorkspaces) {
    let depsToLink = new Set();
    for (let depType of depTypes) {
      if (workspace.config[depType]) {
        for (let depName in workspace.config[depType]) {
          if (foreignWorkspacesMap.has(depName)) {
            depsToLink.add(depName);
          }
        }
      }
    }
    for (let depName of depsToLink) {
      console.log(
        `linked ${chalk.green(depName)} into ${chalk.green(workspace.name)}`
      );
      let nodeModulesDepDir = path.resolve(
        workspace.dir,
        "node_modules",
        depName
      );
      await fs.remove(nodeModulesDepDir);
      await fs.ensureSymlink(
        foreignWorkspacesMap.get(depName),
        nodeModulesDepDir
      );
    }
  }
})();
