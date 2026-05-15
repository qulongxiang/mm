import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    watch: {
      // 启用轮询模式 - 解决 Windows 重装后文件事件不触发的问题
      usePolling: true,
      // 轮询间隔（毫秒），数值越小越敏感但消耗 CPU，1000 是安全值
      interval: 1000,
    },
    // 明确 HMR 配置，确保 WebSocket 连接正确
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5173, // 与你启动时看到的端口一致
    },
  },
  // 强制重新预构建依赖（清除缓存）
  optimizeDeps: {
    force: true,
  },
});