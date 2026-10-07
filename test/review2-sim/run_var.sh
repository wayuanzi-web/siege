#!/bin/bash
# 其它設定的樣本（找拖很久的對局、看難度和強化的影響）。一次一個 process。
cd "$(dirname "$0")"
node batch.js 1,2,3,4,5,6 newbie 24 0 0 > out/var_d0_newbie.jsonl.tmp && mv out/var_d0_newbie.jsonl.tmp out/var_d0_newbie.jsonl; echo "d0 newbie done $(date +%T)"
node batch.js 1,2,3,4,5,6 newbie 24 0 5 > out/var_d0u5_newbie.jsonl.tmp && mv out/var_d0u5_newbie.jsonl.tmp out/var_d0u5_newbie.jsonl; echo "d0u5 newbie done $(date +%T)"
node batch.js 1,2,3,4,5,6 casual,expert 24 2 0 > out/var_d2.jsonl.tmp && mv out/var_d2.jsonl.tmp out/var_d2.jsonl; echo "d2 done $(date +%T)"
node batch.js 1,2,3,4,5,6 casual 24 1 2 > out/var_u2_casual.jsonl.tmp && mv out/var_u2_casual.jsonl.tmp out/var_u2_casual.jsonl; echo "u2 casual done $(date +%T)"
