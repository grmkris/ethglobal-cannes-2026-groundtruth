#!/usr/bin/env node
import { argv } from "process"

if (argv[2] === "setup") {
  const { runSetup } = await import("./setup.js")
  await runSetup()
} else {
  await import("./stdio.js")
}
