// Bun plugin to handle @/ path aliases in tests
import { plugin } from "bun";

await plugin({
  name: "path-aliases",
  async setup(build) {
    // Handle @/lib/* → ./lib/*
    build.onResolve({ filter: /^@\/lib\/(.+)$/ }, (args) => {
      const resolvedPath = args.path.replace("@/lib/", "./lib/");
      return {
        path: new URL(resolvedPath, import.meta.url).pathname,
        external: false,
      };
    });

    // Handle @/components/* → ./components/*
    build.onResolve({ filter: /^@\/components\/(.+)$/ }, (args) => {
      const resolvedPath = args.path.replace("@/components/", "./components/");
      return {
        path: new URL(resolvedPath, import.meta.url).pathname,
        external: false,
      };
    });
  },
});
