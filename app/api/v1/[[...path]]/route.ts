import { apiOptions, handleApiRequest } from "@/lib/api/router";

async function handle(
  request: Request,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path } = await ctx.params;
  return handleApiRequest(request, path ?? []);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

export function OPTIONS(request: Request): Response {
  return apiOptions(request);
}
