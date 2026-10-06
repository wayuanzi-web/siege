#!/bin/bash
# 一關的整套影片：bash test/review-play/batch.sh <關卡> [seed=7] [bot=casual]
L=$1; SEED=${2:-7}; BOT=${3:-casual}
cd "$(dirname "$0")/../.."
for r in 0 1 2 3; do python3 test/review-play/film2.py $L --skip=$r --bot=$BOT --seed=$SEED --scale=1.5 --frames=16 --dt=0.2 2>&1 | grep -v "^console: \[\]"; done
for r in 0 1 2; do python3 test/review-play/film2.py $L --side=1 --skip=$r --bot=$BOT --seed=$SEED --scale=1.5 --frames=16 --dt=0.2 2>&1 | grep -v "^console: \[\]"; done
python3 test/review-play/film2.py $L --end --bot=$BOT --seed=$SEED --scale=1.5 --frames=20 --dt=0.2 --cols=5 --lead=0.8 2>&1 | grep -v "^console: \[\]"
python3 test/review-play/story.py $L --bot=$BOT --seed=$SEED --cols=2 --scale=1.18 --max=14 2>&1 | grep -v "^console: \[\]"
