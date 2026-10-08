#!/bin/bash
# 把幾個量測再跑一次，輸出存成檔案（給之後對照）
cd /home/claude/siege
timeout 1500 python3 test/review8/perf8.py 844x390 2 > test/review8/perf8_out.txt 2>&1
timeout 600 python3 test/review8/demo_hitch.py 844x390 2 > test/review8/demo_hitch_out.txt 2>&1
timeout 600 node test/review8/claims.js > test/review8/claims_out.txt 2>&1
timeout 300 node test/review8/chain.js > test/review8/chain_out.txt 2>&1
timeout 300 python3 test/review8/keys.py > test/review8/keys_out.txt 2>&1
timeout 1800 python3 test/rsoak.py 1 6,7,8,9,10,11,12 --monkey > test/review8/rsoak_monkey.txt 2>&1
echo done > test/review8/rerun_done.txt
