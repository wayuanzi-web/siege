#!/bin/sh
# 靜態檢查：把所有 src/parts/*.js 接成一份，找「用到卻沒宣告的名字」之類的錯（畫面那一半的程式 Node 測試跑不到，少見的分支只能靠這個）
# 用法：sh test/lint.sh        （第一次會把 eslint 裝到暫存目錄）
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR=${LINT_DIR:-${TMPDIR:-/tmp}/qianpao-lint}
mkdir -p "$DIR"; cd "$DIR"
[ -d node_modules/eslint ] || { npm init -y >/dev/null 2>&1; npm i eslint@9 globals --no-audit --no-fund >/dev/null 2>&1; }
cat "$ROOT"/src/parts/*.js > all.js
cat "$ROOT"/src/parts/*.js "$ROOT"/src/webparts/90-web.js > web.js
cp "$ROOT"/src/webparts/sw.js sw.js
cat > eslint.config.mjs <<'CFG'
import globals from 'globals';
const rules = { 'no-undef': 'error', 'no-dupe-keys': 'error', 'no-redeclare': 'error', 'no-const-assign': 'error', 'no-unreachable': 'warn', 'no-dupe-args': 'error', 'no-func-assign': 'error', 'no-self-assign': 'warn', 'no-dupe-else-if': 'warn', 'no-duplicate-case': 'error', 'use-isnan': 'error', 'valid-typeof': 'error', 'no-unsafe-negation': 'error', 'no-obj-calls': 'error', 'no-sparse-arrays': 'warn', 'no-constant-binary-expression': 'warn' };
export default [
  { files: ['all.js', 'web.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser, planck: 'readonly', process: 'readonly' } }, rules },
  { files: ['sw.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.serviceworker } }, rules },
];
CFG
npx eslint all.js web.js sw.js && echo "lint: 沒有問題"
