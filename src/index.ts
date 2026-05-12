import { Command } from "commander";

const program = new Command();

program
  .name("csb")
  .description("Claude Sandbox CLI")
  .version("0.1.0");

program.parse();
