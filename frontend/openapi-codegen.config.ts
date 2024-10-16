import { alternativeAPIURLString, alternativeURLExpression } from './api-url.mjs';
import {
  generateSchemaTypes,
  generateReactQueryComponents,
} from "@openapi-codegen/typescript";
import { defineConfig } from "@openapi-codegen/cli";
import { writeFile, readdir, readFile } from "fs/promises";
import {join as pathJoin} from "path";

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
        const targetBaseCandidateURLs = context.openAPIDocument.servers?.map((server) => server.url);
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
      /**
       * 後で、任意のコードに置き換えるためにAPIのbaseURLをユニーク文字列に置き換える
       */
      context.openAPIDocument.servers = contextServers?.map(
        (serverObject) => {
          return {
            ...serverObject,
            url: alternativeAPIURLString,
          };
        },
      );
      const { schemasFiles } = await generateSchemaTypes(context, {
        filenamePrefix,
      });
      await generateReactQueryComponents(context, {
        filenamePrefix,
        schemasFiles,
      });

      /**
       * viteのdefineで探索可能にする
       */
      await rewriteFileInTargetDir(outputDir, (content) => content.replace(`"${alternativeAPIURLString}"`, alternativeURLExpression))
      
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


/**
 * 指定されたディレクトリ配下のファイルコンテンツをrewriteFnで置き換える
 */
async function rewriteFileInTargetDir(
  dirPath: string,
  rewriteFn: (content: string) => string
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
        const data = await readFile(filePath, 'utf8');
        const rewrittenContent = rewriteFn(data);
        await writeFile(filePath, rewrittenContent);
        }
      }
    } catch (err) {
      if (typeof err === "string") {
        console.error(`CONSOLE ERROR: ${err}`);
      }
  }
}