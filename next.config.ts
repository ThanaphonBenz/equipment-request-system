import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ย้ายปุ่ม dev ของ Next.js ไปขวาล่าง ไม่ให้บังโปรไฟล์ใน sidebar
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
