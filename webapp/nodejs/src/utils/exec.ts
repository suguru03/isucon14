import { spawn } from "node:child_process";

export const exec = async (cmd: string[]) =>
  new Promise((resolve, reject) => {
    const proc = spawn(cmd[0], cmd.slice(1));
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data) => {
      stdout += data;
    });
    proc.stderr.on("data", (data) => {
      stderr += data;
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(`command failed with code ${code}\n${stderr}\n${stdout}`),
        );
      }
    });
  });
