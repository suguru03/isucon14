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

      const targetBaseURL = targetBaseCandidateURLs[0];

      const filenamePrefix = "API";
      const placeholderTextForAPIURL = "API_BASE_URL_A9fXkLz8YmNp";
      const alternativeAPIBaseURL = `process.env.API_BASE_URL || "${targetBaseURL}"`
      const contextServers = context.openAPIDocument.servers;
      /**
       * 後で、任意のコードに置き換えるためにAPIのbaseURLをユニーク文字列に置き換える
       */
      context.openAPIDocument.servers = contextServers?.map(
        (serverObject) => {
          return {
            ...serverObject,
            url: placeholderTextForAPIURL,
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
      await rewriteFileInTargetDir(outputDir, (content) => {
        return content.replace(`"${placeholderTextForAPIURL}"`, alternativeAPIBaseURL);
      })
      
      /**
       * SSE通信などでは、自動生成のfetcherを利用しないため
       */
      await writeFile(
        `${outputDir}/${filenamePrefix}BaseURL.ts`,
        `export const apiBaseURL = ${alternativeAPIBaseURL};\n`,
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
    console.error(`CONSOLE ERROR: ${err}`);
  }
}