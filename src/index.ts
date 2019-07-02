import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import semver from "semver";
import meow from "meow";
import getWorkspaces from "get-workspaces";
import { DEPENDENCY_TYPES, Workspace } from "./constants";
import upgrade from "./upgrade";

const { input } = meow(
  `
    Usage
      $ link-monorepos-badly [command] [../foreign/monorepo/path]
    Commands
      link         link a foreign monorepo to the local monorepo
      unlink       unlink foreign packages
      upgrade      upgrade versions of packages from a foreign monorepo in the local monorepo
    `,
  {}
);

if (input[0] !== "link" && input[0] !== "unlink" && input[0] !== "upgrade") {
  console.error(
    `link-monorepos-badly only supports the \`link\`, \`unlink\` and \`upgrade\` commands, not ${
      input[0]
    } `
  );
  process.exit(1);
}

let mode = input[0];

let foreignMonorepo = path.join(process.cwd(), input[1]);
let localMonorepo = process.cwd();

(async () => {
  let [_foreignWorkspaces, _localWorkspaces] = await Promise.all([
    getWorkspaces({
      tools: ["bolt", "yarn", "root"],
      cwd: foreignMonorepo
    }),
    getWorkspaces({
      tools: ["bolt", "yarn", "root"],
      cwd: localMonorepo
    })
  ]);

  if (_foreignWorkspaces === null || _localWorkspaces === null) {
    throw new Error("Workspaces could not be found");
  }

  let foreignWorkspaces = _foreignWorkspaces as Workspace[];
  let localWorkspaces = _localWorkspaces as Workspace[];

  let localRootPkgJson = require(path.join(localMonorepo, "package.json"));

  let localRootWorkspace: Workspace = {
    name: localRootPkgJson.name,
    dir: localMonorepo,
    config: localRootPkgJson
  };

  if (mode === "upgrade") {
    await upgrade(
      localWorkspaces.concat(localRootWorkspace),
      foreignWorkspaces
    );
    return;
  }

  let foreignWorkspacesMap = new Map<string, Workspace>();

  for (let foreignWorkspace of foreignWorkspaces) {
    foreignWorkspacesMap.set(foreignWorkspace.name, foreignWorkspace);
  }

  await Promise.all(
    localWorkspaces.map(workspace => {
      let depsToLink = new Map();
      for (let depType of DEPENDENCY_TYPES) {
        if (workspace.config[depType]) {
          for (let depName in workspace.config[depType]) {
            if (foreignWorkspacesMap.has(depName)) {
              depsToLink.set(
                depName,
                // @ts-ignore
                workspace.config[depType][depName]
              );
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
          if (mode === "link" || mode === "unlink") {
            await fs.remove(nodeModulesDepDir);
          }
          if (mode === "link") {
            let foreignWorkspace = foreignWorkspacesMap.get(
              depName
            ) as Workspace;

            await fs.ensureSymlink(foreignWorkspace.dir, nodeModulesDepDir);
            if (
              !semver.satisfies(foreignWorkspace.config.version, depVersion)
            ) {
              console.error(
                `⚠️ ${chalk.green(workspace.name)} depends on ${chalk.red(
                  depName + "@" + depVersion
                )} but ${chalk.green(depName)} is at ${chalk.green(
                  foreignWorkspace.config.version
                )} in the foreign monorepo`
              );
            }
            console.log(
              `🎉 linked ${chalk.green(depName)} into ${chalk.green(
                workspace.name
              )}`
            );
          } else if (mode === "unlink") {
            console.log(
              `🎉 unlinked ${chalk.green(depName)} from ${chalk.green(
                workspace.name
              )}`
            );
          }
        })
      );
    })
  );
  if (mode === "unlink") {
    console.log(
      "Make sure to reinstall now that the foreign packages have been unlinked!"
    );
  }
})();
