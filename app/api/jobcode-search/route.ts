import { createProxyHandler } from "@/lib/proxy-factory";

export const POST = createProxyHandler({
  path: "/api/search",
  logTag: "jobcode-search",
  serviceName: "직업코드 검색",
});
