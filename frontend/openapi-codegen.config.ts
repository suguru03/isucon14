import { defineConfig } from "@openapi-codegen/cli";
import {
  generateReactQueryComponents,
  generateSchemaTypes,
} from "@openapi-codegen/typescript";
import { readFile, readdir, writeFile } from "fs/promises";
import { join as pathJoin } from "path";
import {
  alternativeAPIURLString,
  alternativeURLExpression,
} from "./api-url.mjs";

const outputDir = "./app/apiClient";

export default defineConfig({
  isucon: {
    from: {
      relativePath: "../openapi/openapi.yaml",
      source: "file",
    },
    outputDir,
    to: async (context) => {
      /**
       * openapi.yamlに定義済みのurl配列
       */
      const targetBaseCandidateURLs = context.openAPIDocument.servers?.map(
        (server) => server.url,
      );
      if (
        targetBaseCandidateURLs === undefined ||
        targetBaseCandidateURLs.length === 0
      ) {
        throw Error("must define servers.url");
      }
      if (targetBaseCandidateURLs.length > 1) {
        throw Error("he servers.url must have only one entry.");
      }

      const filenamePrefix = "API";
      const contextServers = context.openAPIDocument.servers;
      context.openAPIDocument.servers = contextServers?.map((serverObject) => {
        return {
          ...serverObject,
          url: alternativeAPIURLString,
        };
      });
      const { schemasFiles } = await generateSchemaTypes(context, {
        filenamePrefix,
      });
      await generateReactQueryComponents(context, {
        filenamePrefix,
        schemasFiles,
      });

      /**
       * fetch.responseのstatusを内包させる
       */
      await rewriteFile("./app/apiClient/apiFetcher.ts", (content) => {
        return content.replace(
                    "return await response.json();",
                    "return {...await response.json(), _responseStatus: response.status};",
                  )
                  .replace(
                    "| { status: \"unknown\"; payload: string }",
                    "| { status: \"unknown\"; payload: string }\n  | { status: number; payload: string }"
                  )
                  .replace(
                    "error = await response.json();",
                    "error = {\n          status: response.status,\n          payload: await response.text()\n        };"
                  );
      });

      /**
       * viteのdefineで探索可能にする
       */
      await rewriteFileInTargetDir(outputDir, (content) =>
        content.replace(
          `"${alternativeAPIURLString}"`,
          alternativeURLExpression,
        ),
      );
      /**
       * SSE通信などでは、自動生成のfetcherを利用しないため
       */
      await writeFile(
        `${outputDir}/${filenamePrefix}BaseURL.ts`,
        `export const apiBaseURL = ${alternativeURLExpression};\n`,
      );
    },
  },
});

type RewriteFn = (content: string) => string;

/**
 * 指定されたディレクトリ配下のファイルコンテンツをrewriteFnで置き換える
 */
async function rewriteFileInTargetDir(
  dirPath: string,
  rewriteFn: RewriteFn,
): Promise<void> {
  try {
    const files = await readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = pathJoin(dirPath, file.name);
      if (file.isDirectory()) {
        await rewriteFileInTargetDir(filePath, rewriteFn);
        continue;
      }
      if (file.isFile()) {
        await rewriteFile(filePath, rewriteFn);
      }
    }
  } catch (err) {
    if (typeof err === "string") {
      console.error(`CONSOLE ERROR: ${err}`);
    }
  }
}

async function rewriteFile(filePath: string, rewriteFn: RewriteFn) {
  const data = await readFile(filePath, "utf8");
  const rewrittenContent = rewriteFn(data);
  await writeFile(filePath, rewrittenContent);
}
