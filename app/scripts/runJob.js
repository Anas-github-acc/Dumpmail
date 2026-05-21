import { sendMailWorker } from "../workers/sendMail.worker.js";
import { readMailJob } from "../workers/readMail.worker.js";
import { followUpJob } from "../workers/followUp.worker.js";

const task = process.argv[2];

const handlers = {
  send: sendMailWorker,
  read: readMailJob,
  "follow-up": followUpJob
};

async function main() {
  const handler = handlers[task];

  if (!handler) {
    console.error("Unknown task. Use one of: send, read, follow-up");
    process.exitCode = 1;
    return;
  }

  console.log(`[job] starting ${task}`);
  await handler();
  console.log(`[job] completed ${task}`);
}

main().catch((error) => {
  console.error(`[job] ${task} failed`, error);
  process.exitCode = 1;
});
