import { createProxyHandler } from "@/lib/proxy-factory";

export const POST = createProxyHandler({
  path: "/api/silson-search",
  logTag: "silson-search",
  serviceName: "실손의료비 검색",
});
