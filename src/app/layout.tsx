import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "课件学习系统",
  description: "上传 PDF 课件，分阶段生成可编辑学习材料。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
