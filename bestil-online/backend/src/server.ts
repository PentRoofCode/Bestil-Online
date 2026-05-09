import { env } from "@/config/env";
import { createApp } from "@/app";
import { logger } from "@/utils/logger";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Server running on http://localhost:${env.PORT}`);
});
