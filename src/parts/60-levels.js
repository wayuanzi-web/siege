/* ===== 60-levels: 十二個關卡（第一篇 1–6、第二篇 7–12；魔王城在最後）。每一關雙方用同一座城（castle），各自派自己的兵 =====
   castle  這一關雙方的城樓（藍圖見 40-defs；我方照寫的放左邊，敵城左右鏡射放右邊）；y0 城腳的高度
   ground  地面起伏 [x, y]…（城腳一定在 y=0）；voids 沒有地面的區間（東西掉下去就沒了）；water 水面 { x0, x1, y, cur 水流 }
   me/foe  crew 依兵位 1、2、3… 放什麼兵
   foe.ai  err 落點誤差、think 想多久才開火、gate 這一輪會去找倍增符的機率、hate 會打我方倍增符的機率、lob 偏好吊高、
           skill 連珠砲集滿之後會拿來用的機率（0 = 不會用）、sap 會把牆和柱子也列進目標的機率（列進去也多半還是瞄兵）、
           guard 會不會去打天燈、氣球（0 = 不會）、warm 第一回合的手抖是平常的幾倍
   foe.hp / dmg  敵軍的耐久、傷害倍率；foe.open 第一回合雙方各自挨的第一輪，打到兵只算幾成（雙方一樣；開場不會還沒打就先倒一個）
   gates   倍增符：owner 0 我方（藍）、1 敵方（赤，會擋我方的砲，可以打掉）、2 黃金（兩邊都能用）、3 折損（÷2）
           mult 倍數、h 半高、spots 位置（hop: true 的每回合換下一個）、at 第幾回合開始出現、
           life 出現幾回合、gap 消失後隔幾回合再出現、regap 被打掉後隔幾回合、move {t:'bob', a 振幅, per 週期（秒）}
   objs    機關：mirror 冰鏡、portal 傳送門、geyser 地火（每回合輪流開一個）
   wind    max 最強風力、at 第幾回合開始有風（每回合換一次）
   lantern 天燈：at 第幾回合開始、every 每隔幾回合、spots 出現的位置
   rocks   落石：at、every、n 幾顆（回合開始時預告落點，回合結束時砸下來）、foe 砸到敵城頭上的機率
   rollers 滾石坡上的大石頭：{ x 石頭中心, r 半徑, stake 擋住它的木樁 x, to 往哪一邊的城滾（0 我方、1 敵城）, every 滾下去之後隔幾回合補一顆 }
   bell    戰場中間吊著的大鐘 { x, y 吊點, len 鐵鍊長, w, h, den }
   boss    魔王：p2、p3 血量剩幾成進第二、第三階段；segHp 結界每一段的耐久、regen 打破後隔幾回合補回來；
           orbHp 毀滅光球的耐久、orbGap 第二／第三階段各隔幾輪放一顆；meteors 第三階段每回合幾顆隕石；heal 每顆魔晶每回合回幾成血；
           rest 放完哪些招會累（下一回合是破綻：不放招、打他加倍；沒寫就是隕石雨）
   sudden  第幾回合起雙方的城每回合自己塌一點、之後砲火也開始加重（沒寫就是第 10 回合）
   fall    城破的門檻：城的完整度掉到多少，城防條就歸零、這一邊輸（沒寫就是 FALL_TH 三成）
   blockHp 城樓磚的耐久倍率（沒寫就是 CASTLE_HP）；smashK 雪崩（積雪、冰棚）砸下來的力道倍率
   extra   戰場中間另外放的結構 [{ castle 藍圖名, x 中心, y 底 }]：打不壞的岩石，擋住被轟到地上的兵平平地對射
   weak    自動玩家（敵軍、測試用的我方）想打的要害：weak(side) 回傳 side 這一邊要打的目標（對方城上的格子、對方那一頭的機關）
   tip     主畫面上的關卡說明（兩三句就好：這一關的機關是什麼、最該打哪裡；細節進了關卡輪到玩家的時候再講）
   hints   進了關卡之後輪到你的時候講的訣竅，一回合最多一句：r 第幾回合起可以講、t 內容、ok 還用得上才講（沒寫就一定講） */
// 某一邊的第幾號兵位還有沒有人、還待在原本的位置上（沒被打倒、也還沒摔下來）
const sideAt = (side, slot) => S.team[side].units.some((u) => u.alive && u.slot === slot);
const atHome = (u) => { const q = u.fr ? frLocal(u.fr, u.x, u.y) : platLocal(u.st, u.x, u.y); return Math.abs(q.x - u.hx0) < 2.2 && Math.abs(q.y - u.hy0) < 1.6; };
const foeAt = (slot) => sideAt(1, slot);
const foeHas = (type) => S.team[1].units.some((u) => u.alive && u.type === type);
// 敵軍第幾號兵還待在原本的位置上：教「怎麼把他弄下來」的訣竅，要他還在上面才講
const foeHome = (slot) => S.team[1].units.some((u) => u.alive && u.slot === slot && atHome(u));
// side 那座城藍圖上第 cx 欄（照藍圖寫的方向，由左數）、由上往下第 row 列的那塊磚（還在原位才算）
const castleB = (side, cx, row) => { const st = S.st[side], b = st.cellB[(st.rows - 1 - row) * st.cols + (st.mirror ? st.cols - 1 - cx : cx)]; return b && !b.dead && b.inPlace ? b : null; };
const foeB = (cx, row) => castleB(1, cx, row);
// 自動玩家想打 side 對面那座城的要害：直接打中那一塊最好
// （瞄的是那一格的位置：長樑、長柱子要打的是指定的那一段，不是整根的正中間）
const tgC = (side, cells, w) => { const out = [], o = 1 - side, st = S.st[o]; for (const [cx, row] of cells) { const b = castleB(o, cx, row); if (b) { const P = cellPt(st, [cx, row, 0.5, 0.5]); out.push({ x: P.x, y: P.y, w, blk: b }); } } return out; };
// 第七關：戰場中間還站著的石碑（由左到右）
const steles = () => { const out = []; for (const q of S.structs) if (q.side === 2 && !q.loose) for (const b of q.blocks) if (!b.dead && b.dom && b.inPlace) out.push(b); return out.sort((a, b) => a.x0 - b.x0); };
// 某一邊的繩索、鐵鍊還在不在（tag）
const ropeLeft = (tag, side) => S.ropes.some((r) => !r.cut && r.side === (side === undefined ? 1 : side) && r.tag === tag);
// 第九關：閘還在、吊籠還吊著
const brakeUp = (side) => S.st[side].blocks.some((b) => b.brake && !b.dead && b.inPlace);
const cageUp = (side) => { const PU = S.st[side].pulley; return !!(PU && !PU.cut); };
// 第八關：side 那一邊的避雷針還立著
const rodUp = (side) => (S.rods || []).some((b) => b.side === side && !b.dead && b.inPlace);
// 天秤歪了沒有
const tilted = (side) => S.pivots.some((o) => o.st.side === (side === undefined ? 1 : side) && Math.abs(o.ang) > 0.15);
// 某一邊還有幾塊某種材質的磚在原位（琉璃、木柱）
const sideLeft = (side, mat, tall) => { let n = 0; for (const b of S.st[side].blocks) if (!b.dead && b.inPlace && b.mat === mat && (!tall || b.h > b.w)) n++; return n; };
const foeLeft = (mat, tall) => sideLeft(1, mat, tall);
// 第十一關：side 那一邊的鐘鳴累積了多少；心柱還在
const bellE = (side) => (S.bell && S.bell.e ? S.bell.e[side] : 0);
const heartUp = (side) => S.st[side].blocks.some((b) => b.heart && !b.dead && b.inPlace);
// 第十關：side 那一邊的共鳴晶柱還沒震過
const resoUp = (side) => S.st[side].blocks.some((b) => b.reso && !b.dead && !b.resoDone);
// 吊燈還吊著
const lampUp = (side) => S.ropes.some((r) => r.side === (side === undefined ? 1 : side) && r.hang && r.hang.hang === 'lamp' && !r.cut && !r.hang.dead && r.a && r.a.inPlace);
// 第五關：某一邊還有幾顆氣球、幾顆浮空晶石；噴流往哪邊吹（1 往敵城、-1 往我方）
const tethersLeft = (side) => S.objs.filter((o) => o.t === 'tether' && o.side === side && o.hp > 0).length;
const liftsLeft = (side) => S.objs.filter((o) => o.t === 'lift' && o.side === side && o.hp > 0).length;
const jetDir = () => { const o = S.objs.find((q) => q.t === 'jet'); return o ? Math.sign(o.U) : 0; };
// 第六關：某一邊的船艙進水的程度（最多的那一艙）
const flooded = (side) => { const P = S.st[side].plat; if (!P || !P.comps) return 0; let f = 0; for (const c of P.comps) f = Math.max(f, c.flood); return f; };
// 第六關：敵船（side）的火藥庫還沒炸
const magLeft = (side) => { const P = S.st[side].plat; return !!(P && P.comps && P.comps.some((c) => c.mag === 1)); };
// 第一關：敵軍望樓腳下的火藥桶還在
const foeKeg = () => S.st[1].blocks.some((b) => b.mat === M_KEG && !b.dead && !b.mag && !b.fuseKeg);
// 第四關：side 那一邊地窖的火藥庫還在
const magUp = (side) => S.st[side].blocks.some((b) => b.mag && !b.dead);
// 第四關：引信點著了沒有
const fuseLit = (side) => { const F = S.st[side].fuse; return !!(F && (F.fronts.length || F.done)); };
// 第二關：擋住滾石的木樁（往 to 那一邊滾的那顆）還在不在
const stakeUp = (to) => S.rollers.some((r) => r.to === to && r.ball && !r.go);
// 第三關：冰棚還架著（積雪還沒崩）
const shelfUp = (side) => S.st[side].blocks.some((b) => !b.dead && b.mat === M_SNOW && b.inPlace);

const LEVELS = [
  {
    name: '望樓對峙', tag: '基本玩法・倍增符・火藥桶', theme: 0, castle: 'TOWER', fall: 0.3,
    tip: '雙方輪流開火，全隊打同一個落點。把敵城打塌（上面的城防條歸零）就贏。前面的木頭望樓腳下夾著一桶火藥；後面是石砌的主樓。穿過藍色倍增符，一發變多發',
    hints: [{ r: 1, t: '敵軍望樓腳下夾著一桶火藥：打中它，炸斷細腳，望樓連上面兩個兵一起倒下來', ok: () => foeKeg() },
      { r: 2, t: '砲彈穿過藍色倍增符會變多發：拖曳的時候看虛線有沒有穿過符', ok: () => foeHome(1) || foeHome(3) },
      { r: 3, t: '望樓倒了城還沒破：再把後面的主樓打掉一大塊（屋頂、木柱、樓板），城防條歸零就贏' },
      { r: 4, t: '摔下城的兵沒有死，會從地上接著打；中間的小山擋著，地上的兵要吊高才打得到對面' }],
    ground: [[-40, 3], [0, 0], [42, 0], [46.5, 1.3], [51, 5.6], [56, 7.2], [61, 5.6], [65.5, 1.3], [70, 0], [112, 0], [152, 3]],
    me: { crew: ['rocket', 'bolt', 'rocket'] },
    foe: { crew: ['rocket', 'rocket', 'bolt'], hp: 1.0, dmg: 0.85, open: 0.5, ai: { err: 7.5, think: 1.3, gate: 0, sap: 0, guard: 0, warm: 1.6 } },
    weak: (side) => tgC(side, [[8, 8], [10, 8]], 0.9).concat(tgC(side, [[1, 7], [5, 7], [1, 5], [5, 5]], 0.7)),
    gates: [
      { owner: 0, mult: 3, h: 6.5, spots: [[50, 36]] },
      { owner: 0, mult: 5, h: 5.5, spots: [[60, 44], [58, 31], [64, 38]], at: 2, hop: true }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 48], [52, 27], [60, 26]] }
  },
  {
    name: '滾石坡', sayTop: 1, tag: '滾地砲・滾石・風向', theme: 1, castle: 'GATE',
    tip: '把砲彈打在山坡往敵城那一面：砲彈一路滾下坡、越滾越重，撞破敵城門樓的大門。門樓塌了，再滾進去撞斷主樓腳下的木柱。坡上的木樁擋著兩顆大滾石',
    hints: [{ r: 1, t: '瞄山頂右邊一點的坡面：砲彈一路滾下去、越滾越重（超過 ×2）；落在這一面上半坡、衝得夠快的也會翻過山頂' },
      { r: 2, t: '右邊那根木樁擋著一顆大滾石：滾下去的砲彈撞得斷它，滾石就衝下坡撞破敵城的大門', ok: () => stakeUp(1) },
      { r: 3, t: '門樓塌了以後，滾下坡的砲彈、滾石會一路滾到主樓腳下：主樓一樓只有兩根木柱撐著' },
      { r: 4, t: '小心左邊那顆：敵軍打斷它的木樁，滾石就往你這邊衝過來', ok: () => stakeUp(0) }],
    ground: [[-40, 4], [0, 0], [40.5, 0], [44, 1.4], [47, 4.6], [50.6, 5.4], [53.6, 9.8], [56, 10.8], [58.4, 9.8], [61.4, 5.4], [65, 4.6], [68, 1.4], [71.5, 0], [112, 0], [152, 4]],
    me: { crew: ['rocket', 'bolt', 'stone', 'bomb'] },
    foe: { crew: ['bomb', 'rocket', 'stone', 'rocket'], hp: 0.75, dmg: 0.75, open: 0.55, ai: { err: 5.2, think: 1.2, gate: 0.5, sap: 0.25, warm: 1.6 } },
    wind: { max: 6, at: 2 }, sudden: 8,
    rollers: [{ x: 49.1, r: 2.35, stake: 45.9, to: 0, every: 2 }, { x: 62.9, r: 2.35, stake: 66.1, to: 1, every: 2 }],
    // 滾地砲：落在山坡往對方那一面的砲彈一路滾下去（每往下滾一格高度威力多 k 倍，最多 max 倍）
    roll: { x0: 41, x1: 71, k: 0.15, max: 2.6, top: 10.8 },
    ampAim: (side) => { const d = side === 0 ? 1 : -1, out = []; for (const dx of [1.4, 3, 4.6, 6.2]) { const x = MID + d * dx; out.push({ x, y: groundYRaw(x) + 0.4, lo: 0.9, hi: 2.9 }); } return out; },
    weak: (side) => tgC(side, [[9, 6], [5, 6]], 0.8),
    lantern: { at: 3, every: 3, spots: [[56, 48], [50, 30], [62, 28]] }
  },
  {
    name: '冰崖雪崩', tag: '冰鏡・結霜・雪崩', theme: 2, castle: 'ICE', stress: 1, snow: 1, smashK: 0.35, blockHp: 2.6,
    tip: '崖頂的冰棚壓著一大片積雪：打掉撐著它的冰柱，雪崩砸垮敵城頂樓。下面兩層是石砌的：用中間的冰鏡把砲彈彈成平射，打進最底層，打到的磚會結霜變脆',
    hints: [{ r: 1, t: '敵城崖頂的冰棚壓著一大堆雪，外端只靠兩根冰柱撐著：打掉冰柱（火一烤就化），雪崩砸垮頂樓', ok: () => shelfUp(1) },
      { r: 2, t: '左邊那面冰鏡的亮面朝上：砲彈打上去會被彈平，直直打進敵城最底層（前牆很薄），打到的磚會結霜、變脆' },
      { r: 3, t: '冰鏡每回合換一個角度；背面是厚冰，打到會擋下來' },
      { r: 4, t: '中間那塊雪岩擋著平射：被轟到地上的兵要吊高才打得到對面' }],
    ground: [[-40, 3], [0, 0], [41, 0], [44, -2], [68, -2], [71, 0], [112, 0], [152, 3]],
    extra: [{ castle: 'ROCK_FROST', x: 56, y: -2.3 }],
    me: { crew: ['fire', 'bolt', 'bomb', 'rocket'] },
    foe: { crew: ['ice', 'rocket', 'bomb', 'fire'], hp: 0.9, dmg: 0.8, open: 0.55, ai: { err: 7.0, think: 1.2, gate: 0.6, hate: 0.15, lob: 1, skill: 0.4, sap: 0.4, warm: 1.7 } },
    // 冰鏡：兩邊各一面，亮面朝著對方的城上空。從自己這邊吊高打下來的砲彈，被亮面彈成平射，打進對方的底層；彈過的砲彈結霜。
    // 背面是厚冰（擋下砲彈）。每回合換一個角度
    objs: [
      { t: 'mirror', side: 0, one: 1, frost: 1, x: 47.5, y: 11.5, len: 3.2, angs: [-0.52, -0.66, -0.4] },
      { t: 'mirror', side: 1, one: 1, frost: 1, x: 64.5, y: 11.5, len: 3.2, angs: [0.52, 0.66, 0.4] }
    ],
    weak: (side) => tgC(side, [[6, 4], [7, 4], [6, 3], [6, 5]], 1.05),
    lantern: { at: 3, every: 3, spots: [[48, 48], [64, 48]] }
  },
  {
    name: '引信火藥塔', tag: '地火・引信・地窖火藥庫', theme: 3, castle: 'POWDER',
    tip: '讓砲彈穿過正在噴的地火：砲彈著火，威力多五成。著火的砲彈燒到敵塔頂垂下來的引信頭，引信就點著了：每一輪砲擊往下燒一段，燒到哪一層的火藥桶就炸哪一層，最後燒進地窖的火藥庫',
    hints: [{ r: 1, t: '中間正在噴的地火：砲彈從火柱裡穿過去就著火（威力 ×1.5），燒得到引信頭', ok: () => !fuseLit(1) },
      { r: 2, t: '敵塔頂的窗外垂著引信頭：點著了它就一輪一輪往下燒，一層炸完炸下一層', ok: () => !fuseLit(1) },
      { r: 3, t: '你的引信被點著了！它燒進地窖之前，趕快把敵塔打垮', ok: () => fuseLit(0) && magUp(0) },
      { r: 4, t: '地窖的火藥庫藏在城腳裡面：引信燒到它，整座塔腳炸垮', ok: () => magUp(1) }],
    ground: [[-40, 5], [0, 0], [38, 0], [41, -3.5], [71, -3.5], [74, 0], [112, 0], [152, 5]],
    extra: [{ castle: 'ROCK_EMBER', x: 51, y: -3.8 }, { castle: 'ROCK_EMBER', x: 61, y: -3.8 }],
    me: { crew: ['fire', 'rocket', 'bomb', 'ice'] },
    foe: { crew: ['fire', 'bomb', 'rocket', 'fire'], hp: 1.35, dmg: 1.25, open: 0.55, ai: { err: 4.4, think: 1.1, gate: 0.65, hate: 0.2, skill: 0.5, sap: 0.45, warm: 2.2 } },
    objs: [
      { t: 'geyser', x: 46, w: 2.8, hgt: 45 },
      { t: 'geyser', x: 56, w: 2.8, hgt: 48 },
      { t: 'geyser', x: 66, w: 2.8, hgt: 45 }
    ],
    // 地火：穿過正在噴的地火的砲彈著火（威力多五成），而且點得著引信頭、點得著地窖火藥庫的通風口
    ampAim: (side) => { const out = []; for (const o of S.objs) if (o.t === 'geyser' && o.on) for (const h of [12, 22, 32]) out.push({ x: o.x, y: o.base + h }); return out; },
    rocks: { at: 2, every: 2, n: 1, foe: 0.38 },
    lantern: { at: 3, every: 3, spots: [[56, 26], [45, 47], [67, 47]] }
  },
  {
    name: '雲海浮島', tag: '噴流・浮空晶石・會晃的浮島', theme: 4, castle: 'SKY', y0: 6,
    tip: '兩座城都蓋在浮島上，兩顆氣球吊著、底下兩顆浮空晶石托著。打碎晶石，那一頭沉下去；再打破那一頭的氣球，整座島歪下去、城滑進雲海。中間的噴流每回合換方向',
    hints: [{ r: 1, t: '這一回合噴流往敵城吹：把砲彈打進白色氣流帶，會被捲住加速、直衝過去（威力 ×1.8）', ok: () => jetDir() > 0 },
      { r: 2, t: '浮島底下兩顆紫色浮空晶石：打碎一顆，那一頭沉下去、繩子吃滿重量，再打一下就斷', ok: () => liftsLeft(1) >= 2 },
      { r: 3, t: '噴流每兩回合換一個高度：低的時候正好打得到浮空晶石，高的時候打得到氣球', ok: () => liftsLeft(1) >= 1 && tethersLeft(1) >= 2 },
      { r: 4, t: '噴流往你這邊吹的回合，砲彈穿過去會被減速：吊高越過它，或從底下鑽過去', ok: () => jetDir() < 0 }],
    voids: [[-60, 172]],
    me: { crew: ['rocket', 'zap', 'bolt', 'bomb'] },
    foe: { crew: ['bal', 'rocket', 'flak', 'zap'], hp: 1.0, dmg: 0.7, open: 0.55, ai: { err: 3.7, think: 1.1, gate: 0.75, hate: 0.25, skill: 0.5, sap: 0.5, warm: 1.8 } },
    // 噴流：每回合換方向（第一回合往敵城吹）、每兩回合換高度（中＝一樓、低＝浮空晶石、高＝氣球）
    objs: [{ t: 'jet', x0: 37, x1: 75, lv: [18, 8, 43.5], hh: 3.2, U: 92, kx: 5, ky: 7, kc: 10, gain: 1.8 }],
    ampAim: (side) => { const o = S.objs.find((q) => q.t === 'jet'), d = side === 0 ? 1 : -1; if (!o || o.U * d <= 0) return []; const xe = d > 0 ? o.x0 + 2 : o.x1 - 2; return [{ x: xe, y: o.y }, { x: xe + d * 5, y: o.y }, { x: xe + d * 10, y: o.y + 1 }]; },
    weak: (side) => { const out = []; for (const o of S.objs) if (o.t === 'lift' && o.side !== side && o.hp > 0) out.push({ x: o.x, y: o.y, w: 1.25, obj: o }); return out; },
    lantern: { at: 3, every: 3, spots: [[56, 26], [50, 48], [62, 12]] }
  },
  {
    name: '怒海艦城', sayTop: 1, tag: '打水漂・火藥庫・翻船', theme: 6, castle: 'SHIP', y0: -5.2, blockHp: 2.6,
    tip: '兩邊都是戰船：甲板上前後兩座樓，船身也算城。平平打出去，砲彈在海面上打水漂（一跳多三成），撞進敵船的吃水線：船艙進水，那一頭沉下去，樓就滑進海裡。中艙底下是火藥庫',
    hints: [{ r: 1, t: '仰角壓低、力道加大，平平打到海面：砲彈會彈起來（最多三跳，一跳 ×1.3），撞進敵船船身', ok: () => flooded(1) < 0.5 },
      { r: 2, t: '敵船中艙底下是火藥庫：把中艙的船身打到剩一半，整艙炸開', ok: () => magLeft(1) },
      { r: 3, t: '專打同一頭的船艙：船艙破了一直進水，那一頭沉下去，甲板一歪，樓連人滑進海裡', ok: () => flooded(1) < 0.95 },
      { r: 4, t: '城防條算的是兩座樓加上船身：樓打垮、船身打穿，都會讓它往下掉' }],
    ground: [[-60, -40], [172, -40]],
    water: { x0: -60, x1: 172, y: 0, cur: 0.6, rho: 0.85, sea: 1 },
    // 打水漂：往下的速度不到橫向的 slope 倍、而且夠快（vmin）才會彈；彈起來保留 keep 的往下速度再加 up，橫向乘 fric，威力乘 gain
    skip: { slope: 0.78, keep: 0.55, up: 4, fric: 0.9, gain: 1.3, max: 3, vmin: 30 },
    ampAim: (side) => { const d = side === 0 ? 1 : -1, out = []; for (const dx of [-12, -6, 0, 6]) out.push({ x: MID + d * dx, y: 0.3, lo: 0.42, hi: 1.15 }); return out; },
    me: { crew: ['rocket', 'bomb', 'bolt', 'fire'] },
    foe: { crew: ['bomb', 'rocket', 'fire', 'bolt'], hp: 1.05, dmg: 1.0, open: 0.55, ai: { err: 3.6, think: 1.1, gate: 0.8, hate: 0.3, skill: 0.6, sap: 0.55, warm: 1.8 } },
    wind: { max: 6, at: 3 },
    lantern: { at: 3, every: 3, spots: [[52, 46], [58, 26]] }
  },
  {
    name: '石林骨牌', sayTop: 1, tag: '石碑骨牌・石墩・投石兵', theme: 7, castle: 'SPIRE', stress: 1,
    tip: '戰場中間兩排石碑，一塊比一塊高：推倒最矮的那塊，一路倒過去，最高的砸進敵城前面的亭子。後面石柱頂上那棟樓只靠兩根細石頸撐著；石柱本身只踩著兩個石墩',
    hints: [{ r: 1, t: '右邊那排石碑：砸中最靠中間那塊矮的上半截，整排往右倒，最高的那塊砸進敵城', ok: () => steles().some((b) => b.x0 > 56) },
      { r: 2, t: '敵城的石柱只踩著兩個石墩（中間是空的）：打掉朝戰場那一個，整根石柱往前倒', ok: () => foeHome(1) || foeHome(2) },
      { r: 3, t: '石柱頂上那棟樓只靠兩根細石頸撐著：打斷一根，整棟樓就往那一邊翻下去', ok: () => foeHome(1) || foeHome(2) },
      { r: 4, t: '左邊那排會往你這邊倒：敵軍推倒它之前，可以先把它往中間推倒', ok: () => steles().some((b) => b.x0 < 56) }],
    ground: [[-40, 3], [0, 0], [112, 0], [152, 3]],
    me: { crew: ['stone', 'rocket', 'bolt', 'bomb'] },
    foe: { crew: ['rocket', 'bomb', 'stone', 'bolt'], hp: 1.0, dmg: 0.9, open: 0.55, ai: { err: 4.2, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 2.0 } },
    extra: [{ castle: 'P5', x: 41.2, y: 0 }, { castle: 'P4', x: 46, y: 0 }, { castle: 'P3', x: 50.6, y: 0 }, { castle: 'P3', x: 61.4, y: 0 }, { castle: 'P4', x: 66, y: 0 }, { castle: 'P5', x: 70.8, y: 0 }, { castle: 'ROCK_KARST', x: 56, y: 0 }],
    weak: (side) => {
      const out = tgC(side, [[3, 11], [6, 11], [3, 5], [1, 5], [6, 9], [8, 9]], 0.95), st = steles(), o = 1 - side;
      // 對面那一排最靠中間的那塊石碑：上半截、偏自己這一邊一點，往對面推倒
      const row = st.filter((b) => (o === 1 ? b.x0 > 56 : b.x0 < 56)).sort((a, b) => Math.abs(a.x0 - 56) - Math.abs(b.x0 - 56));
      if (row.length >= 2) { const b = row[0], p = b.body.getPosition(), d = o === 1 ? -1 : 1; out.push({ x: p.x + d * b.w * 0.5, y: p.y + b.h * 0.3, w: 1.15, blk: b }); }
      return out;
    },
    lantern: { at: 3, every: 3, spots: [[52, 49], [59, 28]] }
  },
  {
    name: '懸空寺', tag: '吊殿・雷雲・避雷針', theme: 8, castle: 'CLIFF', stress: 1, fall: 0.4,
    tip: '兩座寺的殿都用鐵鍊吊在岩簷底下：下殿吊在上殿底下、鐵鍊細；上殿的鐵鍊粗。先打斷下殿的鐵鍊讓它掉下深谷，再對付上殿。穿過中間雷雲的砲彈帶電，落地引雷劈鐵鍊',
    hints: [{ r: 1, t: '中間那團雷雲：砲彈穿過去會帶電，落地時引一道雷劈下來，鐵鍊一劈就傷（雷打鐵鍊三倍痛）', ok: () => ropeLeft('up') },
      { r: 2, t: '敵寺岩簷頂上那根避雷針會把附近的雷全部引走：先用轟天砲把它打斷', ok: () => rodUp(1) },
      { r: 3, t: '下殿的鐵鍊比較細：打斷一條，整間殿歪下去，人滑進深谷；兩條都斷，整間掉下去', ok: () => ropeLeft('low') },
      { r: 4, t: '上殿的鐵鍊粗得多：用雷、轟天砲、大石頭專打同一條', ok: () => !ropeLeft('low') && ropeLeft('up') }],
    ground: [[-40, 3], [0, 0], [112, 0], [152, 3]],
    voids: [[13.8, 98.2]],
    me: { crew: ['rocket', 'zap', 'bolt', 'bomb'] },
    foe: { crew: ['fire', 'zap', 'bolt', 'bomb'], hp: 1.0, dmg: 1.0, open: 0.55, ai: { err: 2.5, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 2.0 } },
    // 雷雲：每回合換一個位置；避雷針保護左右 rodR 以內
    rodR: 15,
    objs: [{ t: 'cloud', x: 56, y: 42, rx: 7.5, ry: 4.6, spots: [[56, 42], [52, 36], [60, 46], [56, 30]] }],
    ampAim: (side) => { const o = S.objs.find((q) => q.t === 'cloud'); if (!o) return []; return [{ x: o.x, y: o.y }, { x: o.x - (side === 0 ? 1 : -1) * o.rx * 0.5, y: o.y + 1 }, { x: o.x + (side === 0 ? 1 : -1) * o.rx * 0.5, y: o.y - 1 }]; },
    weak: (side) => { const out = tgC(side, [[7, 0], [7, 1]], 1.0); return out; },
    lantern: { at: 3, every: 3, spots: [[52, 50], [60, 27]] }
  },
  {
    name: '吊籠寨', tag: '吊籠・閘・彈簧板', theme: 9, castle: 'CAGE', stress: 1,
    tip: '岩臂上一間瞭望棚、底下用鋼纜吊著一個鐵籠，各站兩個兵，兩樣都算城。打斷岩柱腳下的絞盤（閘），吊籠就一輪一輪往下沉（城防條跟著掉），沉到底鋼纜就斷。峽谷正中間的彈簧板會把掉下去的砲彈彈上來',
    hints: [{ r: 1, t: '敵寨岩柱腳下那台木頭絞盤是閘：打斷它，吊籠開始慢慢往下沉，沉到底鋼纜就斷', ok: () => brakeUp(1) },
      { r: 2, t: '峽谷正中間石柱頂上的彈簧板：砲彈打在上面會彈起來（威力 ×1.25），從底下打吊籠', ok: () => cageUp(1) },
      { r: 3, t: '閘斷了以後，打碎配重桶裡的石頭：配重一輕，吊籠沉得更快', ok: () => !brakeUp(1) && cageUp(1) },
      { r: 4, t: '岩臂上的瞭望棚很窄：牆一打掉，兵很容易被炸下岩臂', ok: () => foeHome(1) || foeHome(2) },
      { r: 5, t: '吊籠上面那段鋼纜：轟天砲、大石頭打得斷，斷了整個籠子掉下去', ok: () => cageUp(1) }],
    ground: [[-40, 4], [0, 0], [26.8, 0], [27.2, -3], [84.8, -3], [85.2, 0], [112, 0], [152, 4]],
    voids: [[27.2, 84.8]],
    wind: { max: 6, at: 3 },
    me: { crew: ['rocket', 'bolt', 'stone', 'bomb'] },
    foe: { crew: ['bomb', 'rocket', 'ice', 'bolt'], hp: 1.0, dmg: 1.1, open: 0.55, ai: { err: 3.0, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 1.8 } },
    // 彈簧板：峽谷正中間一根石柱頂上兩片（左邊那片稍微往右斜、幫我方；右邊那片往左斜、幫敵軍）
    objs: [{ t: 'spring', side: 0, one: 1, x: 53.2, y: -4.2, len: 2.6, ang: -0.16, boost: 1.12, gain: 1.25, max: 3 }, { t: 'spring', side: 1, one: 1, x: 58.8, y: -4.2, len: 2.6, ang: 0.16, boost: 1.12, gain: 1.25, max: 3 }],
    weak: (side) => { const o = 1 - side, st = S.st[o], out = []; for (const b of st.blocks) if (b.brake && !b.dead && b.inPlace) { const p = b.body.getPosition(); out.push({ x: p.x, y: p.y, w: 1.2, blk: b }); } const PU = st.pulley; if (PU && PU.mode === 'free' && !PU.cut) for (const b of PU.pan.stones) if (!b.dead) { const p = b.body.getPosition(); out.push({ x: p.x, y: p.y, w: 1.0, blk: b }); } return out; },
    lantern: { at: 3, every: 3, spots: [[52, 50], [59, 28]] }
  },
  {
    name: '琉璃宮', tag: '稜鏡・共鳴晶柱・吊燈', theme: 10, castle: 'GLASS', stress: 1,
    tip: '兩座宮殿是石頭的骨架、琉璃的牆和屋頂，琉璃一撞就碎。共鳴晶柱藏在石台的地窖裡：重重打中一次，頂樓的琉璃震碎；再打一次，震到二樓；打碎它，整座宮殿的琉璃一起碎，剩下石頭骨架再打垮。穿過中間的稜鏡，一發分成三發',
    hints: [{ r: 1, t: '打進中間那顆稜鏡：一發分成三發往上、正中、往下散開，紅的著火、黃的引雷、藍的結霜', ok: () => foeLeft(M_GLASS) >= 10 },
      { r: 2, t: '敵宮石台前面那扇小琉璃窗後面就是共鳴晶柱：打中一次震碎一層琉璃，打到碎掉，整座宮殿的琉璃一起碎（石頭骨架要另外打）', ok: () => resoUp(1) },
      { r: 3, t: '大廳天花板吊著一盞水晶吊燈，正下方就是一個兵：把天花板打穿，吊燈砸下來', ok: () => foeHome(1) && lampUp() }],
    ground: [[-40, 3], [0, 0], [40, 0], [43, -3.5], [69, -3.5], [72, 0], [112, 0], [152, 3]],
    extra: [{ castle: 'ROCK_CRYSTAL', x: 56, y: -3.8 }],
    me: { crew: ['rocket', 'stone', 'zap', 'bomb'] },
    foe: { crew: ['bomb', 'ice', 'zap', 'rocket'], hp: 0.85, dmg: 0.8, open: 0.55, ai: { err: 4.0, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 2.0 } },
    objs: [{ t: 'prism', x: 56, y: 31, r: 3.3, spread: 0.17 }],
    weak: (side) => tgC(side, [[7, 9]], 1.3).concat(tgC(side, [[10, 9]], 0.9), tgC(side, [[5, 4]], 0.6)),
    lantern: { at: 3, every: 3, spots: [[51, 50], [60, 22]] }
  },
  {
    name: '古寺撞鐘', tag: '大鐘共振・心柱・連層崩塌', theme: 11, castle: 'PAGODA', stress: 1, blockHp: 3.2, fall: 0.1,
    tip: '戰場正中間吊著一口大鐘。打在鐘上會把它往對面推，力道也會累積成鐘鳴：滿了「噹」一聲，震波打在對面整座木塔上。塔的一樓有一根心柱擋震。五重塔整座榫接，要打到連一樓都垮了，城防條才見底（守軍全倒也算贏）',
    hints: [{ r: 1, t: '打中間那口大鐘：力道累積到滿就「噹」一聲，震波把敵塔每一塊木頭都震傷', ok: () => bellE(0) < 0.95 },
      { r: 2, t: '敵塔一樓正中間的紅色粗柱是心柱：它還在，鐘鳴只震裂柱子；打斷它，柱子整排震斷、兵也會被震暈', ok: () => heartUp(1) },
      { r: 3, t: '一輪打得夠重，大鐘會盪過去撞進敵塔；每一層只有兩根柱子，斷一根，另一根撐不住也跟著斷，上面一層層壓下來', ok: () => foeHome(1) || foeHome(2) },
      { r: 4, t: '火油兵點著的柱子會越燒越細：塔是木頭和瓦蓋的，火一路往上延燒', ok: () => foeLeft(M_WOOD, 1) >= 4 }],
    ground: [[-40, 3], [0, 0], [112, 0], [152, 3]],
    wind: { max: 5, at: 3 },
    bell: { x: 56, y: 50.5, len: 34, w: 6.8, h: 7.4, den: 2.6, e: 180 },
    extra: [{ castle: 'ROCK_MAPLE', x: 56, y: -0.3 }],
    me: { crew: ['fire', 'rocket', 'stone', 'bomb'] },
    foe: { crew: ['bomb', 'fire', 'rocket', 'bolt'], hp: 0.95, dmg: 0.75, open: 0.5, ai: { err: 4.3, think: 1.1, gate: 0.7, hate: 0.25, skill: 0.5, sap: 0.6, warm: 2.0 } },
    weak: (side) => tgC(side, [[5, 10]], 1.15).concat(tgC(side, [[1, 10], [9, 10], [2, 8], [8, 8], [3, 6]], 0.95)),
    lantern: { at: 3, every: 3, spots: [[48, 45], [64, 45]] }
  },
  {
    name: '魔王城', tag: '魔王・預告招式・黑洞・聖光符', theme: 5, castle: 'KEEP',
    tip: '打倒魔王就贏；你的城塌了就輸。他每回合先預告要放哪一招（連射、光球、隕石、召喚）。把魔王城打塌，他會從寶座上摔下來（扣一大截血、下一回合是破綻）。城腳的兩顆魔晶讓他回血、補結界',
    hints: [{ r: 1, t: '魔王從第二回合起會在頭上預告招式：暗黑連射、隕石雨開護罩擋（你的城塌了也會輸）；毀滅光球打爆會掉頭砸回他身上' },
      { r: 2, t: '魔王喘不過氣了：這一回合是破綻，打他傷害加倍！（他放完暗黑連射、隕石雨，或是從寶座上摔下來，都會累一回合）', ok: () => S.boss && S.boss.tired && S.turn === 0 },          // 輪到敵軍才講就沒用了：放掉，下一次破綻再講
      { r: 2, t: '敵城城腳正面嵌著兩顆紫色魔晶：打碎它們，魔王不能回血、結界補不回來、也叫不回魔兵', ok: () => coresLeft(1) > 0 },
      { r: 3, t: '把魔王城打塌：他會從寶座上摔下來，扣一大截血，下一回合打他傷害加倍', ok: () => S.boss && !S.boss.castleFell },
      { r: 4, t: '黑洞會把砲彈吸過去、甩出來：擦過它，穿過繞著它轉的金色聖光符，一發變三發（太靠近會被吞掉）', ok: () => S.boss && S.boss.phase >= 2 }],
    ground: [[-40, 3], [0, 0], [112, 0], [152, 3]],
    voids: [[41.5, 70.5]],
    extra: [{ castle: 'ROCK_DEMON', x: 56, y: -12.4 }],
    me: { crew: ['rocket', 'zap', 'bomb', 'fire'] },
    foe: { crew: ['boss', 'rocket', 'bomb', 'fire'], hp: 0.8, dmg: 0.5, open: 0.55, ai: { err: 4.8, think: 1.1, gate: 0.7, hate: 0.25, skill: 0.5, sap: 0.6, warm: 1.8 } },
    weak: (side) => side === 1 ? tgC(side, [[10, 10], [9, 10], [3, 2], [7, 2]], 0.8) : tgC(side, [[10, 10], [9, 10]], 0.7),          // 敵軍也會打我方大殿的木柱（吊燈砸我方的兵）；我方的自動玩家專打魔晶
    boss: { p2: 0.72, p3: 0.4, segHp: 60, regen: 2, orbHp: 30, meteors: 3, heal: 0.015, rest: ['barrage', 'meteor'] },          // rest：放完暗黑連射、隕石雨會累，下一回合是破綻
    objs: [{ t: 'hole', x: 56, y: 33, G: 2300, R: 15, rs: 1.7, on: false }],
    gates: [
      { owner: 2, mult: 3, h: 4.4, spots: [[56, 33, 0]], move: { t: 'orbit', per: 11, rx: 9.5, ry: 7.5 }, phase: 2 },
      { owner: 2, mult: 3, h: 4.4, spots: [[56, 33, 0.5]], move: { t: 'orbit', per: 11, rx: 9.5, ry: 7.5 }, phase: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 22], [48, 48], [62, 48]] },
    sudden: 14
  }
];
