import { vitePlugin as remix } from "@remix-run/dev";
import { readFileSync, writeFileSync } from "fs";
import { defineConfig, type Plugin, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import {
  AppPostRegisterRequestBody,
  ChairPostRegisterRequestBody,
  ProviderPostRegisterRequestBody
} from "~/apiClient/apiComponents";

const DEFAULT_HOSTNAME = "localhost";
const DEFAULT_PORT = 3000;

const DEFAULT_URL = `http://${DEFAULT_HOSTNAME}:${DEFAULT_PORT}`;

const getLoginedSearchParamURL = async (target: "app" | "chair") => {
  let response: Response
  if (target === "app") {
    response = await fetch(
      "http://localhost:8080/app/register",
      {
        body: JSON.stringify({
          username: "testIsuconUser",
          firstname: "isucon",
          lastname: "isucon",
          date_of_birth: "11111111",
        } satisfies AppPostRegisterRequestBody),
        method: "POST",
      },
    );
  } else {
    // POST /provider/register => POST /chair/register
    response = await fetch(
      "http://localhost:8080/provider/register",
      {
        body: JSON.stringify({
          name: "isuconProvider"
        } satisfies ProviderPostRegisterRequestBody),
        method: "POST",
      },
    );
    const json = (await response.json()) as Record<string, string>;
    response = await fetch(
      "http://localhost:8080/chair/register",
      {
        headers: {
          Authorization: `Bearer ${json["access_token"]}`
        },
        body: JSON.stringify({
          name: "isuconChair001",
          model: "isuconChair",
        } satisfies ChairPostRegisterRequestBody),
        method: "POST",
      },
    )
  }

  let json: Record<string, string>;
  if (response.status === 500) {
    json = JSON.parse(
      readFileSync(`./${target}LocalLogin`).toString(),
    ) as typeof json;
  } else {
    json = (await response.json()) as typeof json;
    writeFileSync(`./${target}LocalLogin`, JSON.stringify(json));
    console.log("writeFileSync!", json);
  }
  const id: string = json["id"];
  const accessToken: string = json["access_token"];
  const path = target === "app" ? "client" : "driver";
  return `${DEFAULT_URL}/${path}?access_token=${accessToken}&user_id=${id}`;
};

const customConsolePlugin: Plugin = {
  name: "custom-test-user-login",
  configureServer(server) {
    server.httpServer?.once("listening", () => {
      (async () => {
        console.log(
          `logined client page: \x1b[32m  ${await getLoginedSearchParamURL("app")} \x1b[0m`,
        );
        console.log(
          `logined driver page: \x1b[32m  ${await getLoginedSearchParamURL("chair")} \x1b[0m`,
        );
      })().catch((e) => console.log(`LOGIN ERROR: ${e}`));
    });
  },
};

export const config = {
  plugins: [
    remix({
      ssr: false,
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
    customConsolePlugin,
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    host: DEFAULT_HOSTNAME,
    port: DEFAULT_PORT,
    strictPort: true,
  },
  preview: {
    host: DEFAULT_HOSTNAME,
    port: DEFAULT_PORT,
    strictPort: true,
  },
} as const satisfies UserConfig;

export default defineConfig(config);
