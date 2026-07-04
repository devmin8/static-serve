#!/usr/bin/env bun

import { resolve } from "node:path";
import { startServer } from "./server";

type CliOptions = {
  root: string;
  port: number;
  host: string;
};

function parseArgs(argv: string[]): CliOptions {
  let root = ".";
  let port = Number(Bun.env.PORT ?? 3000);
  let host = Bun.env.HOST ?? "0.0.0.0";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "-p" || arg === "--port") {
      if (!next) throw new Error(`${arg} requires a port`);
      port = Number(next);
      index += 1;
      continue;
    }

    if (arg === "-h" || arg === "--host") {
      if (!next) throw new Error(`${arg} requires a host`);
      host = next;
      index += 1;
      continue;
    }

    if (arg === "--help") {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    root = arg;
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${port}`);
  }

  return { root: resolve(root), port, host };
}

function printHelp() {
  console.log(`static-serve

Usage:
  static-serve [directory] [--port 3000] [--host 0.0.0.0]

Options:
  -p, --port   Port to listen on
  -h, --host   Host to bind
  --help       Show this help
`);
}

try {
  const options = parseArgs(Bun.argv.slice(2));
  const server = await startServer(options);
  const displayHost = options.host === "0.0.0.0" ? "localhost" : options.host;

  console.log(`Serving ${server.root}`);
  console.log(`Directory listing: http://${displayHost}:${server.port}/`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`static-serve: ${message}`);
  process.exit(1);
}
