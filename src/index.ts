import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import semver from "semver";
import meow from "meow";
import { getPackages, Package } from "@manypkg/get-packages";
import { DEPENDENCY_TYPES } from "./constants";
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
    `link-monorepos-badly only supports the \`link\`, \`unlink\` and \`upgrade\` commands, not ${input[0]} `
  );
  process.exit(1);
}

let mode = input[0];

let foreignMonorepo = path.resolve(process.cwd(), input[1]);
let localMonorepo = process.cwd();

(async () => {
  let [foreignPackages, localPackages] = await Promise.all([
    getPackages(foreignMonorepo),
    getPackages(localMonorepo)
  ]);

  localPackages.packages.push(localPackages.root);

  if (mode === "upgrade") {
    await upgrade(localPackages.packages, foreignPackages.packages);
    return;
  }

  let foreignPackagesMap = new Map<string, Package>();

  for (let foreignPackage of foreignPackages.packages) {
    foreignPackagesMap.set(foreignPackage.packageJson.name, foreignPackage);
  }

  await Promise.all(
    localPackages.packages.map(pkg => {
      let depsToLink = new Map();
      for (let depType of DEPENDENCY_TYPES) {
        if (pkg.packageJson[depType]) {
          for (let depName in pkg.packageJson[depType]) {
            if (foreignPackagesMap.has(depName)) {
              depsToLink.set(
                depName,
                // @ts-ignore
                pkg.packageJson[depType][depName]
              );
            }
          }
        }
      }

      return Promise.all(
        [...depsToLink.entries()].map(async ([depName, depVersion]) => {
          let nodeModulesDepDir = path.resolve(
            pkg.dir,
            "node_modules",
            depName
          );
          if (mode === "link" || mode === "unlink") {
            await fs.remove(nodeModulesDepDir);
          }
          if (mode === "link") {
            let foreignWorkspace = foreignPackagesMap.get(depName)!;

            await fs.ensureSymlink(foreignWorkspace.dir, nodeModulesDepDir);
            if (
              !semver.satisfies(
                foreignWorkspace.packageJson.version,
                depVersion
              )
            ) {
              console.error(
                `⚠️ ${chalk.green(pkg.packageJson.name)} depends on ${chalk.red(
                  depName + "@" + depVersion
                )} but ${chalk.green(depName)} is at ${chalk.green(
                  foreignWorkspace.packageJson.version
                )} in the foreign monorepo`
              );
            }
            console.log(
              `🎉 linked ${chalk.green(depName)} into ${chalk.green(
                pkg.packageJson.name
              )}`
            );
          } else if (mode === "unlink") {
            console.log(
              `🎉 unlinked ${chalk.green(depName)} from ${chalk.green(
                pkg.packageJson.name
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
