import { initCronJobs } from "./scheduler/cronJobs.js";
import { readMailJob } from "./workers/readMail.worker.js";

export function startApp() {
  initCronJobs();
  // readMailJob();
}
