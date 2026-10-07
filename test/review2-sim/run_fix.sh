#!/bin/bash
# 建議修法的對照組：同樣的種子（casual、每關 32 場），只在記憶體裡套修法
cd "$(dirname "$0")"
R2PATCH=nocrush,center node batch.js 1,2,3,4,5,6 casual 32 > out/fix_struct.jsonl.tmp 2>/dev/null && mv out/fix_struct.jsonl.tmp out/fix_struct.jsonl; echo "struct done $(date +%T)"
R2PATCH=nocrush,center,shieldpin,pinforce,firereach node batch.js 1,2,3,4,5,6 casual 32 > out/fix_all.jsonl.tmp 2>/dev/null && mv out/fix_all.jsonl.tmp out/fix_all.jsonl; echo "all done $(date +%T)"
