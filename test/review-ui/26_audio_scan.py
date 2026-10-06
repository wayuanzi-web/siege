"""sfx() 和 musStep() 把例外全部吞掉（try/catch），真的寫錯也不會出現在 console。
   這裡把 AudioParam / AudioScheduledSourceNode 的方法包起來記錄丟出的例外，然後把每一種音效、每一首配樂都播一次。
   也數同時活著的音源節點（看連續很多爆炸時會不會暴增）。  python3 test/review-ui/26_audio_scan.py"""
import asyncio, json, re, pathlib
from playwright.async_api import async_playwright
from common import *

INIT = """(() => { window.__auErr = []; window.__auNodes = {made: 0, live: 0, peak: 0};
  const wrap = (proto, name) => { const f = proto[name]; if (!f) return; proto[name] = function () { try { return f.apply(this, arguments); } catch (e) { window.__auErr.push(name + '(' + [].slice.call(arguments).map(a => typeof a === 'number' ? +a.toFixed(4) : typeof a).join(',') + '): ' + e.message); throw e; } }; };
  for (const n of ['setValueAtTime', 'exponentialRampToValueAtTime', 'linearRampToValueAtTime', 'setTargetAtTime']) wrap(AudioParam.prototype, n);
  const st = AudioScheduledSourceNode.prototype.start; AudioScheduledSourceNode.prototype.start = function () { const N = window.__auNodes; N.made++; N.live++; if (N.live > N.peak) N.peak = N.live; this.addEventListener('ended', () => { N.live--; }); try { return st.apply(this, arguments); } catch (e) { window.__auErr.push('start: ' + e.message); throw e; } };
  wrap(AudioScheduledSourceNode.prototype, 'stop'); wrap(AudioNode.prototype, 'connect'); })()"""

async def main():
    src = (ROOT / 'src/parts/20-audio.js').read_text(encoding='utf8')
    names = sorted(set(re.findall(r"case '([a-z0-9]+)':", src)))
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, init=INIT)
        await pg.mouse.click(400, 30); await pg.wait_for_timeout(200)
        print('ctx state:', await pg.evaluate("window.__qp.AU.ctx && window.__qp.AU.ctx.state"), '| sfx names:', len(names))
        await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.startLevel(0); })()"); await pg.wait_for_timeout(300)      # 不是示範戰局才會出聲
        for n in names:
            for arg in (None, 0, 1, 3, 6):
                await pg.evaluate("([n, a]) => { const q = window.__qp; q.AU.last = {}; q.sfx(n, a === null ? undefined : a); }", [n, arg])
            await pg.wait_for_timeout(25)
        print('after all sfx: swallowed audio exceptions =', await pg.evaluate("window.__auErr.slice(0, 12)"), '| nodes', await pg.evaluate("window.__auNodes"))
        # 配樂七首，各 1.5 秒
        for th in range(7):
            await pg.evaluate("(t) => window.__qp.musStart(t)", th); await pg.wait_for_timeout(1500)
        print('after music: exceptions =', await pg.evaluate("window.__auErr.slice(0, 12)"), '| nodes', await pg.evaluate("window.__auNodes"))
        # 一場真的很吵的戰鬥：連珠 + 倍增
        await pg.evaluate("(() => { const q = window.__qp, S = q.S; q.SV.open = 6; q.startLevel(4); q.aiInit(S.team[0], q.BOTS.expert, {aiErr: 1}); window.__auNodes.peak = 0; })()")
        for i in range(40):
            await pg.wait_for_timeout(1000)
            if (await pg.evaluate("window.__qp.S.state")) != 'play' or (await pg.evaluate("window.__qp.S.round")) >= 4: break
        print('busy battle (real time): peak simultaneous sources =', await pg.evaluate("window.__auNodes.peak"), 'made', await pg.evaluate("window.__auNodes.made"), '| exceptions =', await pg.evaluate("window.__auErr.slice(0, 12)"))
        print('errors:', msgs)
        await b.close()
asyncio.run(main())
