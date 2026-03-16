import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "租呗（最懂年轻人的租房工具）",
  description: "租呗内测版 1.0：房源管理、地图标点、通勤计算。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
