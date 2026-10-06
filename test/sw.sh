#!/bin/bash
# test/sw.sh <場數> <bot> "關卡 hp dmg err" ...：一次試好幾組設定（兩個兩個平行跑），每組印一行
N=$1; BOT=$2; shift 2
i=0
for cfg in "$@"; do
  set -- $cfg
  ( node "$(dirname "$0")/tune.js" $1 $N $BOT $2 $3 $4 | tr '\n' ' ' | sed -E 's/\([^)]*\)//g; s/ +/ /g'; echo ) &
  i=$((i+1)); if [ $((i % 2)) -eq 0 ]; then wait; fi
done
wait
