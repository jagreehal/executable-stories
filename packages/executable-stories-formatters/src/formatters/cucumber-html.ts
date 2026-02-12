/**
 * CucumberHtmlFormatter — produces the official Cucumber HTML report.
 *
 * Thin wrapper: reuses CucumberMessagesFormatter to generate NDJSON envelopes,
 * then pipes them through @cucumber/html-formatter's CucumberHtmlStream.
 */

import { Readable, Writable } from "node:stream";
import { CucumberHtmlStream } from "@cucumber/html-formatter";
import { CucumberMessagesFormatter } from "./cucumber-messages/index";
import type { CucumberMessagesOptions } from "./cucumber-messages/index";
import type { TestRunResult } from "../types/test-result";

export interface CucumberHtmlOptions {
  /** Options forwarded to the underlying CucumberMessagesFormatter */
  messages?: CucumberMessagesOptions;
}

export class CucumberHtmlFormatter {
  private messagesFormatter: CucumberMessagesFormatter;

  constructor(options: CucumberHtmlOptions = {}) {
    this.messagesFormatter = new CucumberMessagesFormatter(options.messages);
  }

  /**
   * Format a TestRunResult into official Cucumber HTML.
   *
   * Returns a Promise because CucumberHtmlStream is a Node.js Transform stream.
   */
  async format(run: TestRunResult): Promise<string> {
    return this.formatToString(run);
  }

  /**
   * Format a TestRunResult into official Cucumber HTML string.
   */
  async formatToString(run: TestRunResult): Promise<string> {
    // 1. Generate NDJSON envelopes as plain objects
    const envelopes = this.messagesFormatter.format(run);

    // 2. Create the Cucumber HTML stream
    const htmlStream = new CucumberHtmlStream();

    // 3. Collect output chunks
    const chunks: Buffer[] = [];
    const collector = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    // 4. Pipe HTML stream output to collector
    htmlStream.pipe(collector);

    // 5. Write each envelope through the stream
    for (const envelope of envelopes) {
      const accepted = htmlStream.write(envelope);
      if (!accepted) {
        await new Promise<void>((resolve) => htmlStream.once("drain", resolve));
      }
    }

    // 6. End the stream and wait for completion
    await new Promise<void>((resolve, reject) => {
      collector.on("finish", resolve);
      collector.on("error", reject);
      htmlStream.end();
    });

    return Buffer.concat(chunks).toString("utf8");
  }
}
