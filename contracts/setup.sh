#!/usr/bin/env sh
# Installs the exact library versions HaloPool's tests pass with (libs are not committed).
set -e
cd "$(dirname "$0")"
forge install OpenZeppelin/openzeppelin-contracts@v5.7.0 foundry-rs/forge-std@v1.16.2 --no-git
