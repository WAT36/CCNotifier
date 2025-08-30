/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // ← これが超重要（out/ に静的ファイル出力）
  images: { unoptimized: true }, // next/image を使うなら必須
  // trailingSlash: true,        // 各ページを /page/index.html にしたいなら
};
module.exports = nextConfig;
