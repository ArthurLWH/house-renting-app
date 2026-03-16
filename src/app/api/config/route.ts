import { NextResponse } from "next/server";

export async function GET() {
  // 这是公开信息（地图 JS key），可以安全下发给前端
  return NextResponse.json({
    amapJsKey:
      process.env.NEXT_PUBLIC_AMAP_JS_KEY ||
      process.env.AMAP_JS_KEY ||
      null,
    securityJsCode:
      process.env.AMAP_SECURITY_JSCODE ||
      null,
  });
}

