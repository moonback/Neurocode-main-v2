// vite.main.config.mts
import { defineConfig } from "file:///C:/Users/Mayss/Documents/GitHub/Neurocode-main/node_modules/vite/dist/node/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Mayss\\Documents\\GitHub\\Neurocode-main";
var vite_main_config_default = defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      external: ["better-sqlite3", "node-pty"]
    }
  },
  plugins: [
    {
      name: "restart",
      closeBundle() {
        process.stdin.emit("data", "rs");
      }
    }
  ]
});
export {
  vite_main_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5tYWluLmNvbmZpZy5tdHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxNYXlzc1xcXFxEb2N1bWVudHNcXFxcR2l0SHViXFxcXE5ldXJvY29kZS1tYWluXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxNYXlzc1xcXFxEb2N1bWVudHNcXFxcR2l0SHViXFxcXE5ldXJvY29kZS1tYWluXFxcXHZpdGUubWFpbi5jb25maWcubXRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9NYXlzcy9Eb2N1bWVudHMvR2l0SHViL05ldXJvY29kZS1tYWluL3ZpdGUubWFpbi5jb25maWcubXRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWdcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBleHRlcm5hbDogW1wiYmV0dGVyLXNxbGl0ZTNcIiwgXCJub2RlLXB0eVwiXSxcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAge1xuICAgICAgbmFtZTogXCJyZXN0YXJ0XCIsXG4gICAgICBjbG9zZUJ1bmRsZSgpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5lbWl0KFwiZGF0YVwiLCBcInJzXCIpO1xuICAgICAgfSxcbiAgICB9LFxuICBdLFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9WLFNBQVMsb0JBQW9CO0FBQ2pYLE9BQU8sVUFBVTtBQURqQixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLDJCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixVQUFVLENBQUMsa0JBQWtCLFVBQVU7QUFBQSxJQUN6QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixjQUFjO0FBQ1osZ0JBQVEsTUFBTSxLQUFLLFFBQVEsSUFBSTtBQUFBLE1BQ2pDO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
