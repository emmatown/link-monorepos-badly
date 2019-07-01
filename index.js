#!/usr/bin/env node
let fs = require("fs-extra");
let path = require("path");
let chalk = require("chalk");
let getWorkspaces = require("get-workspaces").default;

let foreignMonorepo = path.join(process.cwd(), process.argv[2]);
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

  await Promise.all(
    localWorkspaces.map(workspace => {
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
      return Promise.all(
        depsToLink.map(async depName => {
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
          console.log(
            `🎉 linked ${chalk.green(depName)} into ${chalk.green(
              workspace.name
            )}`
          );
        })
      );
    })
  );
})();
