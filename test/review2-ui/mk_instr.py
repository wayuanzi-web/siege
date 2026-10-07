"""做一份「加了觀測點」的 index.html 給測試用（不動 src/）：
   - __qp 多露出 SAY、HUD、say、sayClear
   - say() / sayDrop() 每次被呼叫都記到 window.__sayLog
輸出到 test/review2-ui/out/index_instr.html；回傳它的 file:// 網址。只用來「看」佇列，重現問題一律用原版。"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = pathlib.Path(__file__).resolve().parent / 'out' / 'index_instr.html'


def build():
    s = (ROOT / 'src/dist/index.html').read_text(encoding='utf8')
    reps = [
        ("function say(txt, alert, key) {", "function say(txt, alert, key) { (window.__sayLog || (window.__sayLog = [])).push({op: 'say', t: performance.now(), txt, alert: !!alert, key: key || '', dup: !!((SAY.cur && SAY.cur.txt === txt) || SAY.q.some((m) => m.txt === txt)), qlen: SAY.q.length, cur: SAY.cur ? SAY.cur.txt : null});"),
        ("function sayDrop(m) {", "function sayDrop(m) { (window.__sayLog || (window.__sayLog = [])).push({op: 'drop', t: performance.now(), txt: m.txt, key: m.key, waited: performance.now() - m.at});"),
        ("  SAY.cur = m; SAY.t0 = now; SAY.dur = sayDur(m.txt);", "  SAY.cur = m; SAY.t0 = now; SAY.dur = sayDur(m.txt); (window.__sayLog || (window.__sayLog = [])).push({op: 'show', t: now, txt: m.txt, alert: m.alert, waited: now - m.at, dur: SAY.dur});"),
        ("function sayClear() {", "function sayClear() { (window.__sayLog || (window.__sayLog = [])).push({op: 'clear', t: performance.now(), had: (SAY.cur ? 1 : 0) + SAY.q.length});"),
        ("window.__qp = { S, SH,", "window.__qp = { SAY, HUD, say, sayClear, uiEvent, S, SH,"),
    ]
    for a, b in reps:
        assert s.count(a) == 1, (a, s.count(a))
        s = s.replace(a, b)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(s, encoding='utf8')
    return OUT.as_uri()


if __name__ == '__main__':
    print(build())
