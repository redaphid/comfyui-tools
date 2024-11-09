#! /usr/bin/env bun
import { parseArgs } from "util";
import log from "loglevel";
import { existsSync, readFileSync } from "fs";
import { modifyWorkflow, invokeComfyUI } from "@hypnodes/comfyui-api-nodes";

const usage = () =>
  `
Usage: comfyui-workflow [options] <export-api.json>

generates image(s) using ComfyUI, with the workflow modified to use the given options.

Options:
  -o, --options The options to modify the workflow with, in JSON format.
  -h, --help    Show this help message

The app requires the following environment variables:
  COMFYUI_URL: The URL of the ComfyUI server.
  COMFYUI_USERNAME: The username for basic auth.
  COMFYUI_PASSWORD: The password for basic auth.
`.trim();

const args = () => {
  const {
    values: { help, options = "{}", verbose = false },
    positionals: [workflowFilename],
  } = parseArgs({
    options: {
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
      verbose: {
        type: "boolean",
        short: "v",
        default: false,
      },
      options: {
        type: "string",
        short: "o",
      },
    },
    allowPositionals: true,
  });

  return {
    help,
    options,
    verbose,
    workflowFilename,
  };
};

/**
 * @param {string} json
 * @returns {boolean}
 */
const isValidJson = (json) => {
  try {
    JSON.parse(json);
    return true;
  } catch (e) {
    return false;
  }
};

const main = async () => {
  let { help, options, verbose, workflowFilename } = args();

  log.setLevel("info");
  if (verbose) {
    log.setLevel("trace");
  }

  if (help) {
    log.info(usage());
    process.exit(0);
  }

  let argsError = false;

  if (!options) {
    log.error("Options are required");
    argsError = true;
  }

  if (!isValidJson(options)) {
    log.error("Options must be valid JSON");
    argsError = true;
  }

  if (!workflowFilename) {
    log.error("A workflow file is required");
    argsError = true;
  }

  if (!existsSync(workflowFilename)) {
    log.error(`The workflow file ${workflowFilename} does not exist`);
    argsError = true;
  }

  const rawOriginalWorkflow = readFileSync(workflowFilename, "utf8");
  if (!isValidJson(rawOriginalWorkflow)) {
    log.error("The workflow file must be valid JSON");
    argsError = true;
  }

  if (argsError) {
    log.error(usage());
    process.exit(1);
  }

  const originalWorkflow = JSON.parse(rawOriginalWorkflow);
  const workflow = modifyWorkflow(originalWorkflow, JSON.parse(options));
  log.debug(workflow);

  await invokeComfyUI(workflow, {
    url: process.env.COMFYUI_URL ?? "http://localhost:8188",
    username: process.env.COMFYUI_USERNAME,
    password: process.env.COMFYUI_PASSWORD,
  });

  process.exit(0);
};
main();
