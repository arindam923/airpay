import { paymentsRouter } from "./payments";
import { apiKeysRouter } from "./apikeys";
import { webhooksRouter } from "./webhooks";
import { settingsRouter } from "./settings";
import { onboardingRouter } from "./onboarding";
import { linksRouter } from "./links";

export const appRouter = {
  payments: paymentsRouter,
  apiKeys: apiKeysRouter,
  webhooks: webhooksRouter,
  settings: settingsRouter,
  onboarding: onboardingRouter,
  links: linksRouter,
};

export type AppRouter = typeof appRouter;
