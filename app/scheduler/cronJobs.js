import cron from "node-cron";
import { cronConfig } from "../config/cron.config.js";
import { sendMailJob } from "../workers/sendMail.worker.js";
import { readMailJob } from "../workers/readMail.worker.js";
import { followUpJob } from "../workers/followUp.worker.js";
// import { ingestCSVs } from "../csv/csvReader.js";

export function initCronJobs() {
  cron.schedule(cronConfig.SEND, sendMailJob);
  cron.schedule(cronConfig.READ, readMailJob);
  // cron.schedule(cronConfig.FOLLOW_UP, followUpJob);
  // cron.schedule(cronConfig.CSV_IMPORT, () =>
  //   ingestCSVs("src/data/input")
  // );
}
