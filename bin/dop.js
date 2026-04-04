#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { spawn } = require('child_process');
const open = require('open');
const path = require('path');

yargs(hideBin(process.argv))
  .scriptName('dop')
  .completion('completion', 'Generate completion script for zsh/bash')
  .command('dashboard', 'Start the local dashboard and open the browser', () => {}, async () => {
    console.log("Starting DOP Web Dashboard...");
    const dopWebPath = path.join(__dirname, '..', 'dop-web');

    const nextProcess = spawn('npm', ['run', 'dev'], {
      cwd: dopWebPath,
      stdio: 'inherit',
    });

    // Wait a brief moment for the Next.js server to boot up, then open default browser
    setTimeout(async () => {
      console.log("Opening dashboard at http://localhost:3000 ...");
      try {
        await open('http://localhost:3000');
      } catch(err) {
        console.error("Failed to open browser: ", err);
      }
    }, 2500);

    nextProcess.on('close', (code) => {
      process.exit(code);
    });
  })
  .demandCommand(1, 'Please provide a valid command.')
  .help()
  .parse();
