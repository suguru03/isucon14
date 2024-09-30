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
    outputDir: "./fetcher",
    to: async (context) => {
      const filenamePrefix = "isucon";
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
