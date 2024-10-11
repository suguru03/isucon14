import {
  generateSchemaTypes,
  generateReactQueryComponents,
} from "@openapi-codegen/typescript";
import { defineConfig } from "@openapi-codegen/cli";
import { writeFileSync } from "fs";

const outputDir = "./app/apiClient";

export default defineConfig({
  isucon: {
    from: {
      relativePath: "../openapi/openapi.yaml",
      source: "file",
    },
    outputDir,
    to: async (context) => {
      const proxyURL = process.env.PROXY_URL;
      if (proxyURL) {
        console.log(`proxyURL: ${proxyURL}`);
        const contextServers = context.openAPIDocument.servers;
        context.openAPIDocument.servers = contextServers?.map(
          (serverObject) => {
            return {
              ...serverObject,
              url: proxyURL,
            };
          },
        );
      }

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
      const targetBaseURL = targetBaseCandidateURLs[0];

      const filenamePrefix = "API";
      const { schemasFiles } = await generateSchemaTypes(context, {
        filenamePrefix,
      });
      await generateReactQueryComponents(context, {
        filenamePrefix,
        schemasFiles,
      });
      writeFileSync(
        `${outputDir}/${filenamePrefix}BaseURL.ts`,
        `export const apiBaseURL = "${targetBaseURL}";\n`,
      );
    },
  },
});
