import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 暂时禁用 Cloudflare 插件以避免连接问题
export default defineConfig({
	plugins: [react()],
});
