import { execSync } from "child_process";

function readGitData(command: string) {
  try {
    return execSync(command, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch (error) {
    return "unknown";
  }
}

const commit = readGitData("git rev-parse --short HEAD");
const timestamp = readGitData("git log -1 --format=%cI");

export const buildInfo = {
  commit,
  timestamp,
};
