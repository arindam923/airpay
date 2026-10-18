import { paymentsRouter } from "./payments";
import { apiKeysRouter } from "./apikeys";
import { webhooksRouter } from "./webhooks";
import { settingsRouter } from "./settings";
import { onboardingRouter } from "./onboarding";
import { linksRouter } from "./links";
import { invoicesRouter } from "./invoices";

export const appRouter = {
  payments: paymentsRouter,
  apiKeys: apiKeysRouter,
  webhooks: webhooksRouter,
  settings: settingsRouter,
  onboarding: onboardingRouter,
  links: linksRouter,
  invoices: invoicesRouter,
};

export type AppRouter = typeof appRouter;
