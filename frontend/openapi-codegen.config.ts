import {
  generateSchemaTypes,
  generateReactQueryComponents,
} from "@openapi-codegen/typescript";
import { defineConfig } from "@openapi-codegen/cli";

export default defineConfig({
  isucon: {
    from: {
      relativePath: "../openapi/openapi.yaml",
      source: "file",
    },
    outputDir: "./app/apiClient",
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
      const filenamePrefix = "API";
      const { schemasFiles } = await generateSchemaTypes(context, {
        filenamePrefix,
      });
      await generateReactQueryComponents(context, {
        filenamePrefix,
        schemasFiles,
      });
    },
  },
});
