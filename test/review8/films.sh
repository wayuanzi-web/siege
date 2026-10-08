#!/bin/bash
# 第二篇招牌坍塌連拍（留資訊列）
cd /home/claude/siege
F="python3 test/review8/film.py"
$F 6 "bomb@89.9,10" 0.5,1.2,2,3,4.5,7 L6tower --nosay
$F 6 "bomb@100.1,1.6 ; bomb@106.9,1.6,0.3" 0.5,1.2,2,3,4.5,7 L6back --nosay
$F 7 "rocket@39.4,9.2" 0.6,1.4,2.2,3,4,6 L7domino --nosay
$F 7 "bomb@86.5,20.4" 0.4,1,1.8,2.6,3.6,5 L7neck --nosay
$F 8 "cut@stay" 0.4,1.2,2.4,3.6,5,7 L8chains --nosay
$F 8 "cut@bell" 0.3,0.7,1.1,1.6,2.4,4 L8bell --nosay
$F 9 "cut@front" 0.3,0.8,1.4,2.2,3.2,5 L9front --nosay
$F 9 "cut@back" 0.3,0.8,1.4,2.2,3.2,5 L9back --nosay
$F 10 "bomb@89.9,28.9" 0.2,0.5,0.9,1.4,2.2,3.5 L10reso --nosay
$F 10 "cut@lamp" 0.2,0.5,0.8,1.2,2,3 L10lamp --nosay
$F 11 "bomb@76.3,8.5" 0.5,1.2,2,3,4,6 L11pillar --nosay
$F 12 "cut@lamp" 0.2,0.5,0.8,1.2,2,3 L12lamp --nosay
