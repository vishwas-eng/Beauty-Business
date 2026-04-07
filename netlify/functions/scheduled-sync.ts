import type { Config, Handler } from "@netlify/functions";
import { handler as runAutomationHandler } from "./run-automation";

export const config: Config = {
  schedule: "*/15 * * * *"
};

export const handler: Handler = async () => {
  const response = await runAutomationHandler({
    httpMethod: "POST",
    body: JSON.stringify({})
  } as any, {} as any);
  return (response ?? {
    statusCode: 200,
    body: JSON.stringify({ ok: true })
  }) as any;
};
