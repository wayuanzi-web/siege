#!/bin/bash
# 主要的對局樣本：每一關 casual 64 場、newbie 32 場、expert 24 場（標準難度、沒有強化；種子跟 test/table.js 一樣從 9000 起算）
# 一次只跑一個 process。輸出 out/main_L<n>.jsonl（每場一行）
cd "$(dirname "$0")"
for L in ${LEVELS:-1 2 3 4 5 6}; do
  f=out/main_L$L.jsonl; : > $f.tmp
  node batch.js $L casual 64 >> $f.tmp
  node batch.js $L newbie 32 >> $f.tmp
  node batch.js $L expert 24 >> $f.tmp
  mv $f.tmp $f
  echo "L$L done $(date +%T) $(wc -l < $f) games"
done
