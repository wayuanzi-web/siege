"""review4：進關卡的共用寫法（戰局種子固定，不受音效先抽了幾次亂數影響）。"""
START = r"""([l, k, seed, bot]) => { const q = window.__qp; Math.random = () => k; if (q.G.mode !== 'home') q.goHome(); q.UI.sel = l - 1; document.getElementById('btnGo').click(); let s = seed % 2147483646 + 1; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; if (bot) q.aiInit(q.S.team[0], q.BOTS[bot], {aiErr: 1}); return q.S.idx; }"""


def start_args(lvl, seed, bot):
    k = ((seed * 2654435761 + lvl * 97) % 999999937 + 1) / 1000000007
    return [lvl, k, seed * 7919 + lvl, bot if bot and bot != "none" else None]
