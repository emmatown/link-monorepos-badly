#!/usr/bin/env node
let fs = require("fs-extra");
let path = require("path");
let chalk = require("chalk");
let semver = require("semver");
let meow = require("meow");
let getWorkspaces = require("get-workspaces").default;

let cmd = process.argv[2];
const { input } = meow(
  `
    Usage
      $ link-monorepos-badly [command] [../foreign/monorepo/path]
    Commands
      link         link a foreign monorepo to the local monorepo
      unlink       unlink foreign packages
    `,
  {}
);

if (input[0] !== "link" && input[0] !== "unlink") {
  console.error(
    `link-monorepos-badly only supports the \`link\` and \`unlink\` commands, not ${
      input[0]
    } `
  );
  process.exit(1);
}

let mode = input[0];

let foreignMonorepo = path.join(process.cwd(), input[1]);
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
    foreignWorkspacesMap.set(foreignWorkspace.name, foreignWorkspace);
  }

  await Promise.all(
    localWorkspaces.map(workspace => {
      let depsToLink = new Map();
      for (let depType of depTypes) {
        if (workspace.config[depType]) {
          for (let depName in workspace.config[depType]) {
            if (foreignWorkspacesMap.has(depName)) {
              console.log("added", depName);
              depsToLink.set(depName, workspace.config[depType][depName]);
            }
          }
        }
      }

      return Promise.all(
        [...depsToLink.entries()].map(async ([depName, depVersion]) => {
          let nodeModulesDepDir = path.resolve(
            workspace.dir,
            "node_modules",
            depName
          );
          await fs.remove(nodeModulesDepDir);
          if (mode === "link") {
            await fs.ensureSymlink(
              foreignWorkspacesMap.get(depName).dir,
              nodeModulesDepDir
            );
          }
          if (
            mode === "link" &&
            !semver.satisfies(
              foreignWorkspacesMap.get(depName).config.version,
              depVersion
            )
          ) {
            console.log(
              `⚠️ ${chalk.green(workspace.name)} depends on ${chalk.red(
                depName + "@" + depVersion
              )} but ${chalk.green(depName)} is at ${chalk.green(
                foreignWorkspacesMap.get(depName).config.version
              )} in the foreign monorepo`
            );
          }

          console.log(
            mode === "link"
              ? `🎉 linked ${chalk.green(depName)} into ${chalk.green(
                  workspace.name
                )}`
              : `🎉 unlinked ${chalk.green(depName)} from ${chalk.green(
                  workspace.name
                )}`
          );
        })
      );
    })
  );
})();
