import { initCronJobs } from "./scheduler/cronJobs.js";
import { startApiServer } from "./server.js";
import { readMailJob } from "./workers/readMail.worker.js";

export function startApp() {
  initCronJobs();
  startApiServer();
  // readMailJob();
}
