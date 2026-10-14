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
   fall    城破的門檻：城的完整度掉到多少，城防條就歸零、這一邊輸（沒寫就是 FALL_TH 三成；藍圖的 gf 是一樓，一樓只佔完整度的 STUMP_K：塌到只剩一樓就破城）
   blockHp 城樓磚的耐久倍率（沒寫就是 CASTLE_HP）；smashK 雪崩（積雪、冰棚）、礦坑的懸石砸下來的力道倍率
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
// 第十四關：side 那一邊的葉輪還裝在軸上
const rotorUp = (side) => { const R = S.st[side].rotor; return !!(R && !R.fallen); };
// 第十五關：鐵水鍋還吊著
const potUp = (side) => S.ropes.some((r) => !r.cut && r.side === side && r.hang && r.hang.hang === 'pot' && !r.hang.hangFree);
const couplerUp = (side) => !!(S.st[side] && S.st[side].car && !S.st[side].car.cut);          // 第十六關：連結器還在
const boilerUp = (side) => S.st[side].blocks.some((b) => b.boiler && !b.dead);
const propsUp = (side) => S.st[side].blocks.some((b) => b.drop && !b.dead && b.inPlace);          // 第十七關：懸石還在
const gasUp = (side) => S.st[side].blocks.some((b) => b.gas && !b.dead);
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
    name: '望樓對峙', tag: '基本玩法・倍增符・火藥桶', theme: 0, castle: 'TOWER', fall: 0.3, blockHp: 2.6,
    tip: '雙方輪流開火，全隊打同一個落點。把敵城打塌（上面的城防條歸零）就贏。前面的木頭望樓腳下夾著一桶火藥；後面是石砌的主樓。穿過藍色倍增符，一發變多發',
    hints: [{ r: 1, t: '敵軍望樓腳下夾著一桶火藥：打中它，炸斷細腳，望樓連上面兩個兵一起倒下來', ok: () => foeKeg() },
      { r: 2, t: '砲彈穿過藍色倍增符會變多發：拖曳的時候看虛線有沒有穿過符', ok: () => foeHome(1) || foeHome(3) },
      { r: 3, t: '望樓倒了城還沒破：再把後面的主樓打掉一大塊（屋頂、木柱、樓板）。城防條歸零以後，血最多的守軍扛起帥旗死守：打倒他就贏' },
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
    name: '雲海浮島', tag: '噴流・浮空晶石・會晃的浮島', theme: 4, castle: 'SKY', y0: 6, blockHp: 2.5,
    tip: '兩座城都蓋在浮島上，兩顆氣球吊著、底下兩顆浮空晶石托著。打碎晶石，那一頭沉下去；再打破那一頭的氣球，整座島歪下去、城滑進雲海。中間的噴流每回合換方向',
    hints: [{ r: 1, t: '這一回合噴流往敵城吹：把砲彈打進白色氣流帶，會被捲住加速、直衝過去（威力 ×1.8）', ok: () => jetDir() > 0 },
      { r: 2, t: '浮島底下兩顆紫色浮空晶石：打碎一顆，那一頭沉下去、繩子吃滿重量，再打一下就斷', ok: () => liftsLeft(1) >= 2 },
      { r: 3, t: '噴流每兩回合換一個高度：低的時候正好打得到浮空晶石，高的時候打得到氣球', ok: () => liftsLeft(1) >= 1 && tethersLeft(1) >= 2 },
      { r: 4, t: '噴流往你這邊吹的回合，砲彈穿過去會被減速：吊高越過它，或從底下鑽過去', ok: () => jetDir() < 0 }],
    voids: [[-60, 172]],
    me: { crew: ['rocket', 'zap', 'bolt', 'bomb'] },
    foe: { crew: ['bal', 'rocket', 'flak', 'zap'], hp: 1.1, dmg: 1.25, open: 0.55, ai: { err: 3.3, think: 1.1, gate: 0.75, hate: 0.25, skill: 0.5, sap: 0.5, warm: 1.8 } },
    // 噴流：每回合換方向（第一回合往敵城吹）、每兩回合換高度（中＝一樓、低＝浮空晶石、高＝氣球）
    objs: [{ t: 'jet', x0: 37, x1: 75, lv: [18, 8, 43.5], hh: 3.2, U: 92, kx: 5, ky: 7, kc: 10, gain: 1.8 }],
    ampAim: (side) => { const o = S.objs.find((q) => q.t === 'jet'), d = side === 0 ? 1 : -1; if (!o || o.U * d <= 0) return []; const xe = d > 0 ? o.x0 + 2 : o.x1 - 2; return [{ x: xe, y: o.y }, { x: xe + d * 5, y: o.y }, { x: xe + d * 10, y: o.y + 1 }]; },
    weak: (side) => { const out = []; for (const o of S.objs) if (o.t === 'lift' && o.side !== side && o.hp > 0) out.push({ x: o.x, y: o.y, w: 1.25, obj: o }); return out; },
    lantern: { at: 3, every: 3, spots: [[56, 26], [50, 48], [62, 12]] }
  },
  {
    name: '怒海艦城', sayTop: 1, tag: '打水漂・火藥庫・翻船', theme: 6, castle: 'SHIP', y0: -5.2, blockHp: 3.8,
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
    name: '琉璃宮', tag: '稜鏡・共鳴晶柱・吊燈', theme: 10, castle: 'GLASS', stress: 1, blockHp: 2.8,
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
    name: '古寺撞鐘', tag: '大鐘共振・心柱・連層崩塌', theme: 11, castle: 'PAGODA', stress: 1, blockHp: 6,
    tip: '戰場正中間吊著一口大鐘。打在鐘上會把它往對面推，力道也會累積成鐘鳴：滿了「噹」一聲，震波打在對面整座木塔上。塔的一樓有一根心柱擋震。五重塔整座榫接，上面四層都塌了（只剩一樓）就算破城（守軍全倒也算贏）',
    hints: [{ r: 1, t: '打中間那口大鐘：力道累積到滿就「噹」一聲，震波把敵塔每一塊木頭都震傷', ok: () => bellE(0) < 0.95 },
      { r: 2, t: '敵塔一樓正中間的紅色粗柱是心柱：它還在，鐘鳴只震裂柱子；打斷它，柱子整排震斷、兵也會被震暈', ok: () => heartUp(1) },
      { r: 3, t: '一輪打得夠重，大鐘會盪過去撞進敵塔；每一層只有兩根柱子，斷一根，另一根撐不住也跟著斷，上面一層層壓下來', ok: () => foeHome(1) || foeHome(2) },
      { r: 4, t: '火油兵點著的柱子會越燒越細：塔是木頭和瓦蓋的，火一路往上延燒', ok: () => foeLeft(M_WOOD, 1) >= 4 }],
    ground: [[-40, 3], [0, 0], [112, 0], [152, 3]],
    wind: { max: 5, at: 3 },
    bell: { x: 56, y: 50.5, len: 34, w: 6.8, h: 7.4, den: 2.6, e: 180 },
    extra: [{ castle: 'ROCK_MAPLE', x: 56, y: -0.3 }],
    me: { crew: ['fire', 'rocket', 'stone', 'bomb'] },
    foe: { crew: ['bomb', 'fire', 'rocket', 'bolt'], hp: 0.95, dmg: 1.0, open: 0.5, ai: { err: 4.3, think: 1.1, gate: 0.7, hate: 0.25, skill: 0.5, sap: 0.6, warm: 2.0 } },
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
    foe: { crew: ['boss', 'rocket', 'bomb', 'fire'], hp: 0.8, dmg: 0.32, open: 0.55, ai: { err: 4.8, think: 1.1, gate: 0.7, hate: 0.25, skill: 0.5, sap: 0.6, warm: 1.8 } },
    weak: (side) => side === 1 ? tgC(side, [[10, 10], [9, 10], [3, 2], [7, 2]], 0.8) : tgC(side, [[10, 10], [9, 10]], 0.7),          // 敵軍也會打我方大殿的木柱（吊燈砸我方的兵）；我方的自動玩家專打魔晶
    boss: { p2: 0.72, p3: 0.4, segHp: 60, regen: 2, orbHp: 30, meteors: 3, heal: 0.015, rest: ['barrage', 'meteor'] },          // rest：放完暗黑連射、隕石雨會累，下一回合是破綻
    objs: [{ t: 'hole', x: 56, y: 33, G: 2300, R: 15, rs: 1.7, on: false }],
    gates: [
      { owner: 2, mult: 3, h: 4.4, spots: [[56, 33, 0]], move: { t: 'orbit', per: 11, rx: 9.5, ry: 7.5 }, phase: 2 },
      { owner: 2, mult: 3, h: 4.4, spots: [[56, 33, 0.5]], move: { t: 'orbit', per: 11, rx: 9.5, ry: 7.5 }, phase: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 22], [48, 48], [62, 48]] },
    sudden: 14
  },
  /* ===== 第三篇（第 13–18 關）：每邊六個兵、誤傷、弱點暴擊、冰能滅火；環境每回合在變 ===== */
  {
    name: '潮汐水寨', sayTop: 1, tag: '潮汐・暴潮・水塔', theme: 12, castle: 'TIDE', y0: -8, stress: 1, blockHp: 3.0, damp: 0.55, rules: { ff: 1, crit: 1, elem: 1 },          // damp：泡著海水的木頭燒得慢（火只燒一半多、延燒少一半：全木頭的水寨不會被第一輪的火燒垮）
    tip: '海上的高腳水寨：甲板架在木樁上。潮水四回合一輪：退潮（第二回合起每四回合）木樁整根露出來，打得到、燒得著；漲潮泡在水裡，打在水面上就炸了。大潮（第四回合起每四回合）那一回合結束時暴潮淹上甲板，退下去會把沒有牆擋著的兵拖下海。主屋屋頂上一座大水塔，打破它，水從頂樓一路灌下來',
    hints: [{ r: 1, t: '潮水還淹著敵寨木樁的下半截（打在水面上就炸了、火被撲滅、黏在水下的炸藥泡水啞掉）：先打上面的屋子，下一回合退潮，木樁整根露出來再打', ok: () => tideNow() !== 0 },
      { r: 2, t: '退潮了：敵寨的木樁整根露在水面上，這時候打得到、火也燒得著。前面望樓腳下那兩根一斷，望樓連人翻進海裡', ok: () => tideNow() === 0 },
      { r: 3, t: '敵寨主屋屋頂上那座大水塔：打破它，水從頂樓一路灌下來，把屋裡的兵往前沖；前牆打掉了就沖出屋外', ok: () => tankUp(1) },
      { r: 4, t: '大潮：這一回合結束時暴潮會淹上甲板，退下去的時候把沒有牆、沒有門擋著的兵拖下海。先把敵寨的門、前牆打掉', ok: () => tideNow() === 2 }],
    ground: [[-60, -8], [172, -8]],
    water: { x0: -60, x1: 172, y: -3, cur: 0, rho: 0.85, sea: 1 },
    // 潮汐：四回合一輪（低、中、高、中），水面高度；k0 3：第一回合從「落潮」開始（第二回合退潮、第四回合大潮：開場的木樁半截泡在水裡，第一輪砲火打不垮整座望樓）；
    // 大潮（高）那一回合結束時暴潮：水面猛漲 surge、再退下去；deck：甲板底（比這裡低、或在自己城外泡水的兵會被沖走）
    tide: { lv: [-5.5, -3, -0.5, -3], k0: 3, surge: 7, deck: 2.2 },
    extra: [{ castle: 'ROCK_REEF', x: 56, y: -8 }],
    me: { crew: ['chain', 'bomb', 'fire', 'drill', 'rocket', 'eng'] },
    foe: { crew: ['bomb', 'chain', 'rocket', 'fire', 'sniper', 'wind'], hp: 1.1, dmg: 1.15, open: 0.55, ai: { err: 3.4, think: 1.1, gate: 0.6, hate: 0.2, skill: 0.6, sap: 0.6, warm: 1.8 } },
    weak: (side) => tideWeak(side),
    lantern: { at: 3, every: 3, spots: [[52, 41], [60, 30]] }          // 高的那一個放低一點：這一關的提示框在上面
  },
  {
    name: '颶風風車', sayTop: 1, tag: '轉動的葉輪・吊艙・颶風', theme: 13, castle: 'MILL', stress: 1, blockHp: 2.3, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '兩座城前面各一具大風車：四支帆架的尖端各吊一個吊艙，各站一個兵。每回合結束，葉輪照風向轉 45 度，吊艙轉到新的位置。打斷帆架，吊艙連人掉下去；打掉塔腰的軸座，整具葉輪掉下來。颱風天：第二回合起砲彈飛到一半會撞上反吹的陣風，第三回合起中場的小山上不時捲起龍捲風',
    hints: [{ r: 1, t: '敵城風車的四個吊艙各站一個兵，吊在帆架的尖端：打斷那支帆架（木頭的，火油燒得動），吊艙連人掉下去', ok: () => rotorUp(1) },
      { r: 2, t: '每回合結束，葉輪照這一回合的風向轉 45 度：吊艙會轉到新的位置（轉到正下方的最好打）', ok: () => rotorUp(1) },
      { r: 3, t: '葉輪的轉軸裝在敵塔塔腰的鐵軸座上，藏在石牆中間：把牆打開、打掉軸座，整具葉輪連吊艙一起掉下來', ok: () => rotorUp(1) },
      { r: 4, t: '掉下來的兵沒有死，會從地上接著打；中間的小山擋著，地上的兵要吊高才打得到對面' }],
    ground: [[-40, 3], [0, 0], [41, 0], [46, 2.2], [51, 6.4], [56, 7.6], [61, 6.4], [66, 2.2], [71, 0], [112, 0], [152, 3]],
    wind: { max: 7, at: 1 },
    // 陣風：第二回合起，砲彈飛到第 t0–t1 秒的時候風向反過來（最大 max；標準難度瞄準的虛線畫 0.95 秒，畫得到風轉向的那一點）；
    // 龍捲風：第三回合起每三回合一道，在中場 x0–x1 之間（高 h、半徑 R）
    gust: { at: 2, max: 8, t0: 0.5, t1: 0.9 },
    tornado: { at: 3, every: 3, x0: 50, x1: 62, h: 32, R: 3.4, up: 150, damp: 2.4 },
    me: { crew: ['fire', 'cluster', 'rocket', 'wind', 'bomb', 'eng'] },
    foe: { crew: ['rocket', 'fire', 'cluster', 'bolt', 'bomb', 'stone'], hp: 1.15, dmg: 1.08, open: 0.55, ai: { err: 3.3, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.55 } },
    weak: (side) => millWeak(side),
    lantern: { at: 3, every: 3, spots: [[52, 41], [60, 31]] }
  },
  {
    name: '熔岩鑄城', sayTop: 1, tag: '鐵懸臂・鐵水鍋・岩漿上漲', theme: 14, castle: 'FORGE', y0: -4, stress: 1, blockHp: 1.4, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '兩座鑄城蓋在岩漿湖邊的懸崖上：崖頂一間哨屋，半腰伸出一座鐵造的鑄造台（靠吊臂垂下來的兩條鐵鍊吊著），崖腳的岩台上是熔爐。兩條鐵鍊都打斷，鑄造台連人掉進岩漿；吊臂上還吊著一鍋鐵水。岩漿每回合漲一截，火山彈每回合亂落。鐵城最怕磁暴、雷、酸',
    hints: [{ r: 1, t: '敵城半腰那座鑄造台是插在崖壁上的鐵懸臂，靠吊臂垂下來的兩條鐵鍊吊著：兩條都打斷，整座台往下垂、斷掉，連人掉進岩漿（鏈彈、雷、磁暴打鐵鍊最痛）', ok: () => ropeLeft('up') && ropeLeft('mid') },
      { r: 2, t: '敵城吊臂中間吊著一鍋鐵水，正下方是鑄造台：打斷吊它的鐵鍊，鐵水鍋砸穿鑄造台的屋頂，鐵水澆在兵身上（鑄造台先掉了，鐵水鍋就只會掉進岩漿裡）', ok: () => potUp(1) },
      { r: 3, t: '整座城是鐵造的：磁暴把附近的鐵一把吸過去、雷劈鐵兩倍痛、酸蝕鐵也快；火和冰燒不太動' },
      { r: 4, t: '岩漿每回合漲一截：漲上崖腳的岩台，熔爐的鐵地板發紅變軟，撐不了多久（兩邊都一樣）。在那之前先把敵城打塌', ok: () => !lavaReach(1) }],
    ground: [[-40, 36], [-12, 35], [3.0, 33.4], [3.4, -4], [108.6, -4], [109, 33.4], [124, 35], [152, 36]],
    voids: [[17, 95]],
    water: { x0: 17, x1: 95, y: -6.5, rho: 1.6, cur: 0, lava: 1 },
    // 岩漿：開場在 y0，每回合結束漲 dy，最高漲到 max（下層鑄造台的鐵樑泡進去一半）
    lava: { y0: -6.5, dy: 2.2, max: 4.4 },
    // 火山彈：第二回合起每回合兩顆，兩座城一樣機會（預告紅圈、回合結束砸下來，落地濺開一團岩漿）
    rocks: { at: 2, every: 1, n: 2, sym: 1 },
    extra: [{ castle: 'ROCK_VOLC', x: 56, y: -10 }],
    me: { crew: ['chain', 'zap', 'bomb', 'magnet', 'acid', 'eng'] },
    foe: { crew: ['bomb', 'zap', 'rocket', 'magnet', 'chain', 'acid'], hp: 1.15, dmg: 1.2, open: 0.55, ai: { err: 3.2, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.5 } },
    lantern: { at: 3, every: 3, spots: [[52, 41], [60, 31]] }
  },
  {
    name: '鋼鐵列車', sayTop: 1, tag: '連結器・鍋爐・隧道', theme: 15, castle: 'TRAIN', stress: 1, blockHp: 1.5, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '兩列裝甲列車並排狂奔：外側那節車廂用連結器掛在火車頭後面，連結器打斷了，車廂連人被甩下車；火車頭的大鍋爐打爆了，蒸汽炸開整個砲室。路邊的東西每回合換一樣（水塔、號誌橋、小山），每四回合鑽一次隧道：頂上整片岩頂、中間一道隔牆，要從縫裡吊過去',
    hints: [{ r: 1, t: '敵車外側那節車廂（兩個兵）靠一個連結器掛在火車頭後面：打斷它，整節車廂連人被甩下車（鏈彈、重砲、雷打得動；炸在它旁邊也算）', ok: () => couplerUp(1) },
      { r: 2, t: '火車頭的大鍋爐（圓滾滾的那一截）：打爆了，蒸汽炸開，旁邊的砲室、砲塔一起遭殃', ok: () => boilerUp(1) },
      { r: 3, t: '下一回合要鑽隧道：頂上整片岩頂，兩條軌道中間還有一道隔牆，平射會打在牆上，要從隔牆和岩頂之間的縫吊過去。隧道裡沒有風', ok: () => passKind(S.round + 1) === 'tunnel' },
      { r: 4, t: '路邊的東西每回合換一樣：水塔、號誌橋擋得高，小山擋得低。看清楚這一回合中間擋著什麼再瞄' }],
    ground: [[-40, 0], [152, 0]],
    wind: { max: 6, at: 1 },
    // 中場：每回合換一樣路邊的東西（第 1、5、9…回合是水塔，接著號誌橋、小山、隧道）
    pass: { seq: ['tower', 'gantry', 'hill', 'tunnel'] },
    me: { crew: ['bomb', 'chain', 'zap', 'drill', 'rocket', 'eng'] },
    foe: { crew: ['bomb', 'rocket', 'chain', 'zap', 'cluster', 'magnet'], hp: 1.1, dmg: 1.1, open: 0.55, ai: { err: 3.3, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    weak: (side) => trainWeak(side),
    lantern: { at: 3, every: 3, spots: [[52, 18], [60, 11]] }
  },
  {
    name: '地底礦坑', sayTop: 1, tag: '岩頂・懸石・沼氣', theme: 16, castle: 'MINE', stress: 1, blockHp: 3.4, smashK: 1, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '礦坑深處：頂上整片岩頂，砲彈吊不高，只能壓低了打。敵城頂樓上面四根坑木頂著兩大塊懸石：坑木打斷了，懸石整塊砸穿頂樓。岩壁裡藏著一包沼氣，炸到、燒到就炸成一大團火。中間的礦脈打得碎，越打越低。城是石頭造的，酸蝕得最快',
    hints: [{ r: 1, t: '頂上是岩頂：砲彈吊太高會撞在岩頂上炸掉。壓低仰角、力道加大，從礦脈上面擦過去', ok: () => true },
      { r: 2, t: '敵城頂樓上面那四根坑木頂著兩大塊懸石：打斷一塊懸石底下的兩根，整塊砸穿頂樓，壓住底下的兵（火油燒得動坑木）', ok: () => propsUp(1) },
      { r: 3, t: '敵城後面的岩壁裡有一包沼氣（發綠光的那一格）：炸到、燒到就炸成一大團火，衝進上層那一間', ok: () => gasUp(1) },
      { r: 4, t: '中間的礦脈打得碎：越打越低，敵城的上層慢慢露出來（最底下一排岩心打不碎）。城的牆、樓板都是石頭：酸蝕得最快' }],
    ground: [[-40, 0], [152, 0]],
    ceil: 24.5,
    extra: [{ castle: 'SEAM', x: 56, hp: 2.5 }],
    me: { crew: ['fire', 'drill', 'bomb', 'acid', 'chain', 'eng'] },
    foe: { crew: ['fire', 'bomb', 'rocket', 'drill', 'acid', 'stone'], hp: 1.15, dmg: 1.2, open: 0.55, ai: { err: 3.3, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    weak: (side) => mineWeak(side),
    lantern: { at: 3, every: 3, spots: [[52, 20], [60, 15]] }
  },
  {
    name: '機關巨獸', sayTop: 1, tag: '魔王・巨獸踩城・斷腿拆甲射核心', theme: 17, castle: 'BASTION', stress: 1, blockHp: 2.8, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '敵方沒有城：一頭機關巨獸每回合朝你的城走一段，走到城下就每回合踩城。打掉護膝甲、打斷膝關節，牠踉蹌一回合（不走，下一回合是破綻，傷害加倍）；打爛頭就不能噴火、咬人。血剩六成牠跪下來放出小機械兵，剩不到三成倒地爬行、胸口的核心露出來（打核心最痛），蓄力一回合就光束橫掃：開護罩擋。巨獸是鐵造的：雷、酸、磁暴打牠最痛',
    hints: [{ r: 1, t: '巨獸每回合結束往前走一段：走到你的城下，每回合都會踩城。在那之前把牠打倒，或打斷牠的腿拖慢牠', ok: () => true },
      { r: 2, t: '膝蓋前面那片護膝甲打掉，膝關節就露出來：打斷膝關節，那條腿斷了，巨獸踉蹌一回合（不走，下一回合打牠傷害加倍）', ok: () => S.beast && S.beast.legs.some((L) => !L.broken) },
      { r: 3, t: '巨獸每回合一開始會預告招式：噴火燒得著你城上的木頭；咬人會把一個兵叼起來甩到牠背後（落地不死，站在那裡照樣打）。開著護罩都擋得住', ok: () => S.beast && !!S.beast.P.head && !S.beast.P.head.dead },
      { r: 4, t: '鏈彈打中巨獸的腳會纏住牠：那一回合結束只走一半。黏性炸藥黏在牠身上，你下一輪開火時炸開' }],
    ground: [[-40, 0], [152, 0]],
    wind: { max: 4, at: 2 },
    me: { crew: ['zap', 'acid', 'magnet', 'chain', 'sapper', 'eng'] },
    foe: { crew: ['rocket', 'bomb', 'sniper'], mechs: 2, hp: 1.0, dmg: 0.9, open: 0.55, ai: { err: 3.6, think: 1.1, gate: 0, hate: 0.2, skill: 0.6, sap: 0.6, warm: 1.6 } },
    // 機關巨獸：開場站在哪（軀幹中心 x）、血量；血剩幾成進第二、第三階段
    beast: { x: 93, hp: 1300, p2: 0.6, p3: 0.28 },
    weak: (side) => beastWeak(side),
    lantern: { at: 3, every: 3, spots: [[60, 30], [68, 24]] },
    sudden: 16
  },
  /* ===== 第四篇（第 19–24 關）：工匠營的新兵（鉤索手、秤砣兵、門術師、鏡盾兵……），戰場本身就是一具大機關（54-craft） ===== */
  {
    name: '天秤孤峰', sayTop: 1, tag: '巨樑傾斜・鉤索・千斤鐵砣', theme: 18, castle: 'SCALE', stress: 1, blockHp: 1.4, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '兩座城蓋在同一根巨樑的兩頭，巨樑架在中間的尖峰上：每回合結束照兩邊的重量傾斜，重的那頭沉下去，樑上的大石球就滾過去撞那頭的城。把敵城的磚打下深谷，敵城變輕翹起來、你這頭反而沉；秤砣兵的鐵砣壓在敵城上，它那頭就沉。鉤索手鉤住的柱子，下一輪收繩扯出來',
    hints: [{ r: 1, t: '巨樑架在中間的尖峰上：回合結束照兩邊的重量傾斜，重的那頭沉下去，樑上的大石球就滾過去撞那頭的城。把敵城的磚打下深谷，敵城反而變輕翹起來', ok: () => true },
      { r: 2, t: '秤砣兵的鐵砣砸穿木樓板就留在城裡：丟在敵城上，敵城那頭變重往下沉；疊兩三顆，底下的樓板就撐不住', ok: () => true },
      { r: 2, t: '鉤索手鉤住的那一塊，你下一輪開火時收繩扯過來：鉤敵城前面望樓的高木腳，整座望樓往前倒', ok: () => foeHome(5) || foeHome(6) },
      { r: 3, t: '敵城最後面的配重塔壓著一堆鐵塊：塔一塌，鐵塊掉下深谷，敵城那頭一下子變輕翹起來（你這頭跟著沉）', ok: () => foeB(1, 3) || foeB(1, 4) }],
    ground: [[-60, -60], [172, -60]], voids: [[-60, 172]],
    // 天秤：支點 x、樑面高 y、樑長、樑厚；樑中間的尖峰（由下往上疊的幾截 [寬, 高]）；底下的岩峰 [頂的半寬, 底的半寬, 底的高度]；
    // 力矩 ÷ 總重 ÷ arm × gain 就是該歪的角度（最多 max 弧度，一回合最多轉 step）；balls：樑上的大石球 [我方那一半的 x, 半徑]（敵方那一半鏡射）
    saw: { x: 56, y: 0, len: 109, th: 2.6, spire: [[8, 4], [6, 4], [4.2, 4], [2.4, 3.6]], peak: [1.8, 16, -70], gain: 1.6, arm: 30, max: 0.08, step: 0.035, balls: [[47, 1.5], [50.3, 1.3]], ballDen: 4 },
    me: { crew: ['hook', 'weight', 'hook', 'weight', 'hook', 'weight'] },
    foe: { crew: ['weight', 'hook', 'weight', 'hook', 'weight', 'hook'], hp: 1.0, dmg: 0.8, open: 0.55, ai: { err: 4.0, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    weak: (side) => tgC(side, [[1, 8], [1, 9], [0, 6], [2, 6]], 0.9).concat(tgC(side, [[9, 8], [11, 8], [9, 6], [11, 6]], 0.95)),
    lantern: { at: 3, every: 3, spots: [[50, 30], [62, 22]] }
  },
  {
    name: '鏡門天塹', sayTop: 1, tag: '通天石壁・古門・門術師・銅鏡', theme: 19, castle: 'GORGE', stress: 1, blockHp: 0.75, sudden: 8, weightLife: 1, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '中間一道通天的石壁，砲彈怎麼吊都過不去。打進你這一側的古門，砲彈從對面的頭頂往下砸；古門每回合換一次通到哪裡（敵城前樓、敵城主樓，有時通回自己頭上）。門術師的門珠落在敵城上，就在那上空開一道出口、你城前開一道入口。城頂是一層一層的厚頂，鏡盾兵的銅鏡會把砸下來的砲彈彈開',
    hints: [{ r: 1, t: '中間的石壁一路通到天上，砲彈過不去：打進你這一側的古門，從對面頭頂砸下來。門上寫著這一回合通到哪裡', ok: () => archNext(S.round) !== 'self' },
      { r: 2, t: '門術師的門珠落在敵城上，就在那上空開一道出口、你城前開一道入口：之後全隊打進入口，從出口往下砸（打進去越陡、砸得越直）', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'warp') },
      { r: 3, t: '這一回合古門通回你自己頭上：別打進去，改打門術師開在你城前的那道門', ok: () => archNext(S.round) === 'self' },
      { r: 2, t: '敵城的鏡盾兵舉著銅鏡擋在頭頂：砸在鏡子上的砲彈會被彈開，鏡子挨幾下重的才碎。往沒有鏡子的地方砸', ok: () => foeHas('mirror') }],
    ground: [[-40, 0], [152, 0]],
    // 天塹：中間一道通天的石壁（x0–x1，從 y0 一路到 top）；古門：我方那一座在 (x, y)（敵方鏡射），半徑 r，
    // 每回合照 seq 換一次通到哪裡，出口在 ey 那麼高；warpIn：門術師開的入口（我方，敵方鏡射）
    wall: { x0: 52.6, x1: 59.4, y0: -4, top: 160 },
    arches: { x: 45.4, y: 26, r: 4.4, ey: 38, seq: ['front', 'back', 'front', 'self'] },
    warpIn: [39.6, 12],
    me: { crew: ['warp', 'weight', 'mirror', 'hook', 'weight', 'weight'] },
    foe: { crew: ['warp', 'hook', 'weight', 'mirror', 'weight', 'weight'], hp: 1.1, dmg: 1.1, open: 0.55, ai: { err: 2.4, think: 1.1, gate: 1, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    lantern: { at: 3, every: 3, spots: [[30, 48], [82, 48]] }
  },
  {
    name: '古木藤城', sayTop: 1, tag: '古藤綁城・種藤師・迴旋斧', theme: 20, castle: 'GROVE', blockHp: 1.0, vines: 1, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '兩座城是蓋在千年古樹上的樹屋，整座城的磚用古藤綁在一起、綁在樹幹上：磚不會一塊一塊掉；古藤斷了、那兩塊磚還貼在原位的話，下一回合結束會自己長回來（燒斷的不會）。飛斧手的迴旋斧砍中哪一塊，綁在那塊上的古藤全斷，斧頭再飛回他手上；種藤師的藤種打進敵城的磚裡，每回合長一次、勒一次，第三次把那一塊連旁邊的勒碎',
    hints: [{ r: 1, t: '整座城用古藤綁在一起，磚不會一塊一塊掉：先用迴旋斧砍斷古藤（鐵砣砸、鉤索扯也會扯斷），沒了古藤吊著的那一段就會掉下來。斷了的古藤，下一回合結束會自己長回來', ok: () => true },
      { r: 2, t: '種藤師的藤種打進敵城的磚裡：每回合結束長一次、勒一次，第三次把那一塊連旁邊的勒碎。敵軍種在你城上的藤，砍得掉、炸得斷，種藤師倒了也會枯', ok: () => true },
      { r: 2, t: '迴旋斧砍中東西就飛回飛斧手手上，回程碰到敵城再砍一下；砍木頭最痛', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'axe') },
      { r: 3, t: '敵城最前面的瞭望台架在中層平台的最外端：把平台和它的柱子之間的古藤砍斷，再打柱子，整座往下掉', ok: () => foeHome(5) }],
    ground: [[-40, 0], [152, 0]],
    extra: [{ castle: 'BIGTREE', x: 56, y: 0 }],
    me: { crew: ['vine', 'axe', 'vine', 'axe', 'hook', 'weight'] },
    foe: { crew: ['axe', 'vine', 'axe', 'vine', 'weight', 'hook'], hp: 1.0, dmg: 1.1, open: 0.55, ai: { err: 2.5, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    lantern: { at: 3, every: 3, spots: [[56, 30], [56, 40]] }
  },
  {
    name: '流沙古城', sayTop: 1, tag: '流沙・地道・震地鼓', theme: 21, castle: 'DUNE', stress: 1, blockHp: 1.2, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '兩座古城泡在流沙坑裡，每回合結束往下陷一點：陷進沙裡的磚不算城防，陷在沙裡的兵不能開火（最底下那層最先被埋）。地道兵的鑽地彈落地鑽進地底，往敵城城腳挖，你下一輪開火時從城腳底下炸開；震地鼓手先把鼓樁打進敵城，之後每一輪擂鼓震一圈。炸開的地道、震過的鼓都會把沙挖鬆，那座城陷得更快',
    hints: [{ r: 1, t: '兩座城泡在流沙坑裡，每回合結束往下陷一點：陷進沙裡的磚不算城防，陷在沙裡的兵不能開火。最底下那層的兵最先被埋', ok: () => true },
      { r: 2, t: '地道兵的鑽地彈落在地上就鑽進地底，往敵城城腳挖；你下一輪開火時從城腳底下炸開，還把那座城底下的沙挖鬆，讓它陷得更快', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'mole') },
      { r: 2, t: '震地鼓手先把鼓樁打進敵城或城前的沙上，之後你每一輪開火他就擂一次鼓：每根鼓樁震一圈，底層的磚、兵受傷，流沙越震越鬆', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'drum') },
      { r: 2, t: '敵軍的地道正往你的城腳挖（地上一道隆起的土）：還沒挖到城底下以前，炸在它上面就塌了', ok: () => S.objs.some((o) => o.t === 'mole' && o.side === 1 && o.st === 'dig') }],
    ground: pitGround('DUNE', 16),
    // 流沙：base 每回合本來就陷多少，step 一回合最多陷多少，max 最深陷到多深
    sand: { base: 0.35, step: 1.8, max: 6.8 },
    extra: [{ castle: 'COLOSSUS', x: 56, y: -3.4 }],
    me: { crew: ['weight', 'hook', 'mole', 'drum', 'mole', 'drum'] },
    foe: { crew: ['hook', 'weight', 'drum', 'mole', 'drum', 'mole'], hp: 1.0, dmg: 1.0, open: 0.55, ai: { err: 3.2, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    wind: { max: 4 },
    lantern: { at: 3, every: 3, spots: [[48, 28], [64, 28]] }
  },
  {
    name: '無月夜襲', sayTop: 1, tag: '黑夜・照明箭・滑翔翼', theme: 22, castle: 'NIGHTFORT', stress: 1, blockHp: 1.4, night: { dark: 0.9 }, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '沒有月亮的晚上，只有燈籠、照明箭、著火的東西四周看得到：看不見的地方，你的瞄準虛線畫不出來，敵軍也瞄不準。照明弓手先把敵寨照亮再打；滑翔奇兵的滑翔翼過了最高點，會轉向前方最亮的地方俯衝。燈籠照亮的是掛著它的寨子',
    hints: [{ r: 1, t: '黑夜裡看不見的地方，瞄準虛線畫不出來：先讓照明弓手把敵寨照亮（照明箭亮到下一回合結束），再照著亮的地方打', ok: () => true },
      { r: 2, t: '滑翔奇兵的滑翔翼過了最高點，會自己轉向前方最亮的地方俯衝：敵寨的燈籠、你射的照明箭、著火的木頭', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'glider') },
      { r: 2, t: '燈籠照亮的是掛著它的寨子：敵寨的燈還亮著，你就看得到那一帶；被打滅了，那一帶要靠照明箭才看得見', ok: () => S.objs.some((o) => o.t === 'torch' && o.side === 1 && o.hp > 0) },
      { r: 3, t: '你寨子裡的燈籠一樣照亮你自己：被敵軍的照明箭插到的兵，走到哪裡亮到哪裡', ok: () => true }],
    ground: [[-40, 0], [152, 0]],
    extra: [{ castle: 'NIGHTROCK', x: 56, y: 0 }],
    me: { crew: ['flare', 'glider', 'flare', 'glider', 'axe', 'hook'] },
    foe: { crew: ['glider', 'flare', 'glider', 'flare', 'hook', 'axe'], hp: 1.0, dmg: 1.0, open: 0.55, ai: { err: 3.0, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    lantern: { at: 3, every: 3, spots: [[56, 26], [44, 36], [68, 36]] }
  },
  {
    name: '天空要塞', sayTop: 1, tag: '首領・浮空要塞・反重力・時砂', theme: 23, stress: 1, blockHp: 3.6, aerie: { alt: [3, -2, 3, -3, 2, -3], cannon: { first: 2, every: 2 } }, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '敵軍是一座浮在雲海上的天空要塞，四顆浮空晶石托著：碎一顆那一角就沉，全碎了整座掉進雲海。要塞每回合升降；艦長還在，每兩回合主砲轟你一次（開護罩擋）。反重力師讓磚浮起來、下一輪再砸下去；時砂術士讓這一輪的砲擊下一輪再打一次',
    hints: [{ r: 1, t: '天空要塞底下四顆紫色浮空晶石托著：碎一顆那一角就沉下去，碎得越多歪得越兇，全碎了整座掉進雲海', ok: () => aerieLifts() > 0 },
      { r: 2, t: '要塞的主砲在充能：這一輪敵軍砲擊時會轟過來，開護罩擋住（打倒最上面的要塞艦長，主砲就停了）', ok: () => S.aerie && S.aerie.charge && S.turn === 0 },
      { r: 2, t: '反重力師的反重力彈落在哪裡，那一團的磚就慢慢浮起來（離開原位就不算城防）；你下一輪開火時反重力一收，全部重重砸下去', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'antigrav') },
      { r: 3, t: '時砂術士還活著，你這一輪的整輪砲擊，下一輪會原樣再打一次（回聲）：打得準的那一輪最值得', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'time') }],
    ground: [[-40, 0], [152, 0]], voids: [[47, 200]],
    me: { castle: 'BASTION', crew: ['antigrav', 'time', 'glider', 'antigrav', 'time', 'flare'] },
    foe: { castle: 'AERIE', y0: 12, crew: ['captain', 'glider', 'axe', 'weight', 'hook', 'glider'], hp: 1.35, dmg: 1.2, open: 0.55, ai: { err: 2.3, think: 1.1, gate: 0, hate: 0.2, skill: 0.6, sap: 0.6, warm: 1.6 } },
    weak: (side) => { const out = []; for (const o of S.objs) if (o.t === 'lift' && o.side !== side && o.hp > 0) out.push({ x: o.x, y: o.y, w: 1.3, obj: o }); return out; },
    lantern: { at: 3, every: 3, spots: [[44, 40], [50, 26]] },
    sudden: 14
  },
  /* ---- 第五篇「破規」：每一關打破一條前面一直成立的規則 ---- */
  {
    name: '疊城對決', sayTop: 1, tag: '築城・磚組・狼煙線', theme: 24, castle: 'STACKER', blockHp: 1.6, fall: 0.25, rules: { ff: 1, crit: 1, elem: 1 },
    stack: { start: 2, line: 10, cap: 13, time: 12, mats: [[M_WOOD, 0.45], [M_STONE, 0.4], [M_IRON, 0.15]] },
    tip: '城不是現成的：每回合開火前，先在自己的城頂疊一塊磚組（左右拖、點一下轉向、按「放下」）。停穩的磚組算進城防，還會多一個兵站上去（最多六個）；城頂第一次疊過狼煙線，連珠立刻集滿。壓頂術士在敵城頂變出大石板把它壓歪，固樑匠把自己的城頂鉚起來',
    hints: [{ r: 1, t: '先築城：左右拖動磚組、點一下畫面轉向、按「放下」。擱得平、擱在城基上面的才站得穩；停穩了，城下待命的兵就上來一個站在上面', ok: () => true },
      { r: 1, t: '城頂疊過那條虛線（狼煙線），你的連珠立刻集滿：疊得高兵也多，但越高越容易被打歪', ok: () => S.stack && !S.stack.beacon[0] },
      { r: 2, t: '壓頂術士的壓頂石落在敵城上，會在那裡的城頂變出一塊歪斜的大石板：打在敵城疊得最高、最歪的那一邊，壓得它倒下來', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'press') },
      { r: 3, t: '固樑匠每一輪開火時，會把你城頂的幾塊磚鉚在一起（一起晃、不容易散）：他站得越久，你的城越結實', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'rivet') }],
    ground: [[-40, 0], [152, 0]],
    me: { crew: ['press', 'rivet', 'press', 'rivet', 'axe', 'weight'] },
    foe: { crew: ['rivet', 'press', 'rivet', 'press', 'weight', 'axe'], hp: 1.0, dmg: 1.0, open: 0.55, ai: { err: 3.0, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    wind: { max: 3, at: 3 },
    sudden: 12
  },
  {
    name: '煉金沸城', sayTop: 1, tag: '液體・反應・藥水', theme: 25, castle: 'ALCHEMY', blockHp: 1.6, flux: 1, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '城裡的水、油、岩漿都會流：頂樓的水槽、中間的熔爐、一樓的火油桶打破了就倒出來，順著破洞往下流。水碰岩漿凝成黑石，油碰到火整片燒起來，雷打到水整片帶電，冰把水凍住。水甕兵、油壺兵往敵城灌水、灌油；煉金師每回合抽一瓶藥水（火、冰、雷），看清楚是哪一瓶再打',
    hints: [{ r: 1, t: '先讓油壺兵把火油灌進敵城（油會順著樓板往下流），再用煉金師的火藥水一點，整片燒起來', ok: () => true },
      { r: 1, t: '煉金師這一回合抽到哪一瓶藥水，看他手上那瓶的顏色：紅是火、藍是冰、黃是雷', ok: () => S.team[0].units.some((u) => u.alive && u.def.alch) },
      { r: 2, t: '水甕兵把水灌進敵城的房間，泡在水裡的兵被雷藥水一打，整片一起電暈、這一輪不能開火', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'jar') },
      { r: 3, t: '敵城中間那一層的熔爐打破了，岩漿會往下流：流到一樓的火油桶就燒起來；碰到水就凝成一塊黑石，把破洞堵住', ok: () => true }],
    ground: [[-40, 0], [44, 0], [46.5, -3.4], [65.5, -3.4], [68, 0], [152, 0]],
    me: { crew: ['jar', 'oilpot', 'alch', 'jar', 'oilpot', 'alch'] },
    foe: { crew: ['oilpot', 'jar', 'alch', 'oilpot', 'jar', 'alch'], hp: 1.0, dmg: 1.15, open: 0.55, ai: { err: 2.8, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    wind: { max: 3, at: 2 },
    sudden: 12
  },
  {
    name: '預告戰場', sayTop: 1, tag: '預告・齒輪砲台・誘餌', theme: 26, castle: 'GEARFORT', blockHp: 2.2, tele: 1, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '每回合一開始，敵軍就把這一輪要打哪裡定好（紅色虛線、紅圈），角度力道鎖死，你打完他照著打：打倒開火的兵，那一發就不會來；推擊手把他推開，他從新的位置照原本的角度打；轉向術士讓他的砲口往上轉。城前的齒輪砲台跟著主人開火，被對方的砲彈打中就轉一格',
    hints: [{ r: 1, t: '從敵兵砲口拉出來的紅色虛線，是他們這一輪已經鎖定的彈道（紅圈是落點）：你打完他們才照著打。打倒開火的那個兵，那一發就不會來', ok: () => true },
      { r: 1, t: '推擊手把敵兵推開：他會從新的位置、照原本的角度和力道打出去，紅線跟著挪。推得夠遠，他就打在自己城上', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'shove') },
      { r: 2, t: '轉向術士炸到的敵兵，砲口往上轉一截（看紅線怎麼變）；被轉兩次的，砲彈會往後掉、砸在他自己頭上', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'swivel') },
      { r: 2, t: '齒輪砲台每一輪跟著主人開火（一串銅色的點是它會打到哪）。你的砲彈打中敵軍的齒輪，它就轉一格：打上緣砲口往上抬、打下緣往下壓，抬過頭就砸到它自己的城', ok: () => true },
      { r: 3, t: '誘餌兵的草人插在哪裡，敵軍下一次預告就會有幾個兵改瞄它：插在敵城上，讓他們砸自己', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'decoy') }],
    ground: [[-40, 0], [152, 0]],
    extra: [{ castle: 'GEARPOST', x: 46.2, y: 0 }, { castle: 'GEARPOST', x: 65.8, y: 0 }],
    gears: [{ side: 0, x: 46.2, y: 6.8 + 2.0 }, { side: 1, x: 65.8, y: 6.8 + 2.0 }],
    me: { crew: ['shove', 'swivel', 'decoy', 'bomb', 'shove', 'swivel'] },
    foe: { crew: ['swivel', 'shove', 'bomb', 'axe', 'shove', 'swivel'], hp: 1.1, dmg: 1.3, open: 0.55, ai: { err: 2.6, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    wind: { max: 3, at: 2 },
    sudden: 12
  },
  {
    name: '群星引力', sayTop: 1, tag: '太空・衛星引力・推進・引力錨', theme: 27, castle: 'ASTRO', blockHp: 2.0, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '兩座城蓋在小行星上，中間是太空：砲彈的重力小、飛得又平又遠，經過中間的衛星會被吸彎（小月每回合繞著它換位置）。推進兵的砲彈飛到一半，點一下畫面就猛衝；引力錨釘在敵城上，把整片城吸得歪向它；拖網把磚和兵拖出城外，掉進太空就回不來',
    hints: [{ r: 1, t: '太空裡重力小，砲彈飛得又平又遠；經過衛星和小月會被吸彎，虛線已經算進去了', ok: () => true },
      { r: 1, t: '推進兵的砲彈飛在半空的時候，點一下畫面（或按空白鍵）它就往前猛衝：本來不夠遠的落點，加速一下就到了', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'boost') },
      { r: 2, t: '引力錨釘在敵城的哪一塊磚上，就把附近的磚往它那邊猛吸一陣子：釘在樓板、牆腳的邊上，整片城會歪過去垮下來', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'anchor') },
      { r: 2, t: '拖網網住落點附近的幾塊磚和兵，往你這邊拖：打在敵城朝你這一面的邊上，拖出城外的就掉進太空', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'net') },
      { r: 3, t: '被轟出城、掉到小行星下面或落在衛星上的兵就飄進太空了：別讓自己的兵站在城的邊上', ok: () => true }],
    ground: [[-40, -30], [-6, -12], [-3, -4], [-0.5, 0], [44.5, 0], [47, -4], [49.5, -12], [56, -30], [62.5, -12], [65, -4], [67.5, 0], [112.5, 0], [115, -4], [118, -12], [152, -30]],
    voids: [[-40, -6], [49.5, 62.5], [118, 152]],
    space: { gk: 0.45, moons: [{ x: 56, y: 25, r: 4.4, R: 15, G: 4300 }, { r: 1.7, R: 7, G: 1100, orbit: { x: 56, y: 25, r: 10.5, ph: 1.2, step: 1.15 } }] },
    me: { crew: ['boost', 'net', 'anchor', 'bomb', 'boost', 'anchor'] },
    foe: { crew: ['net', 'boost', 'anchor', 'bomb', 'boost', 'anchor'], hp: 1.0, dmg: 1.0, open: 0.55, ai: { err: 2.6, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    sudden: 12
  },
  {
    name: '三重城', sayTop: 1, tag: '三座城・攻城車・選卡', theme: 28, blockHp: 1.6, rules: { ff: 1, crit: 1, elem: 1 },
    tip: '敵軍不是一座城，是一道接一道的三座：前哨、城牆、內城。打塌一座（城防條見底，或守軍全倒）就攻下了，挑一張卡（修攻城車、援軍、火藥加量……），攻城車推進到下一座。你的攻城車一路帶著傷打下去。衝車兵的撞木落地沿著地面滾去撞城腳，雲梯兵爬上敵城砍人；敵軍的變材術士把你的石頭、鐵變成木頭',
    hints: [{ r: 1, t: '三座城一座一座打：城防條打到底（打塌）或守軍全倒就攻下，挑一張卡再推進。攻城車只會自己補一點，挑卡的時候想清楚', ok: () => true },
      { r: 1, t: '衝車兵的撞木落在敵城前面的地上，會沿著地面一路滾過去撞城腳（撞城基上面那一塊，很痛）：瞄敵城前面一點的地上就好', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'ram') },
      { r: 2, t: '雲梯兵的梯子鉤在敵城的牆上，你下一輪開火時，一個兵爬上去砍城頭離梯子最近的敵兵：鉤在敵兵站的那一層旁邊最好', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'ladder') },
      { r: 2, t: '每一座城的回合重新算（上面顯示的回合數）：同一座城打到第七回合還沒攻下，兩邊的城都開始自己塌', ok: () => true }],
    ground: [[-40, 0], [152, 0]],
    roll: { x0: -40, x1: 152, k: 0, max: 1 },          // 撞木在平地上滾（不會越滾越重）
    siege: { sudden: 7, stages: [
      { name: '前哨', castle: 'OUTPOST', crew: ['rocket', 'bolt', 'fire'] },
      { name: '城牆', castle: 'BULWARK', crew: ['alter', 'bomb', 'fire', 'bolt'] },
      { name: '內城', castle: 'CITADEL', crew: ['alter', 'bomb', 'fire', 'sniper', 'alter', 'rocket'] }] },
    me: { castle: 'WAGON', crew: ['ram', 'ladder', 'bomb', 'ram', 'ladder', 'fire'] },
    foe: { castle: 'OUTPOST', crew: ['rocket', 'bolt', 'fire'], hp: 1.0, dmg: 0.6, open: 0.55, ai: { err: 2.8, think: 1.1, gate: 0, hate: 0, skill: 0.6, sap: 0.6, warm: 1.6 } },
    wind: { max: 3, at: 2 },
    sudden: 99
  },
  {
    name: '乾坤魔君', sayTop: 1, tag: '最終魔王・預告・天秤審判・乾坤倒轉', theme: 29, rules: { ff: 1, crit: 1, elem: 1 }, blockHp: 2.2,
    tip: '最後的魔王坐在倒懸的山頂上。打倒他就贏；你的城塌了就輸。他那一邊每一輪要打哪裡都先預告（紅線）；第二階段起會「天秤審判」（兩邊的城防拉成一樣），第三階段起「乾坤倒轉」（天地倒轉，你的城被拋起來再摔下去）：預告的那一回合開護罩就擋得住。鏡影兵把鏡子擺在他的砲彈路上，星盤師叫流星砸他',
    hints: [{ r: 1, t: '魔君那一邊每一輪都先預告（紅線、紅圈）：鏡影彈飛到最高點會停下來變成一面鏡子，擺在紅線上，他的砲彈就彈回去', ok: () => true },
      { r: 1, t: '星盤師的星盤彈落在哪裡就標一個星位（金色的星），這一回合結束時一顆流星直直砸下來：護罩擋不住', ok: () => S.team[0].units.some((u) => u.alive && u.type === 'star') },
      { r: 2, t: '魔君頭上預告「天秤審判」：他開火時兩邊的城防拉成一樣（底下那一行是現在兩邊的城防）。你的比較高就開護罩擋下來', ok: () => S.boss && S.boss.next === 'judge' && S.turn === 0 },
      { r: 2, t: '魔君頭上預告「乾坤倒轉」：他開火時天地倒轉，沒罩住的城被拋起來再摔下去。開護罩！他放完會累一回合（破綻，打他加倍）', ok: () => S.boss && S.boss.next === 'flip' && S.turn === 0 },
      { r: 3, t: '把倒懸殿打塌：魔君從寶座上摔下來，扣一大截血，下一回合是破綻', ok: () => S.boss && !S.boss.castleFell }],
    ground: [[-40, 0], [152, 0]],
    voids: [[46.2, 65.8], [112.2, 152]],          // 魔君的城蓋在一座倒懸的山頂上（兩邊直直下去是深谷；山的樣子在 36-scene-lord 畫）
    me: { castle: 'BASTION', crew: ['mirage', 'star', 'shove', 'swivel', 'mirage', 'bomb'] },
    foe: { castle: 'LORDHALL', crew: ['lord', 'swivel', 'star', 'shove', 'swivel'], hp: 0.9, dmg: 0.8, open: 0.55, ai: { err: 3.4, think: 1.1, gate: 0, hate: 0, skill: 0.5, sap: 0.6, warm: 1.6 } },
    boss: { p2: 0.66, p3: 0.33, tele: 1, lines: 'lord', names: { barrage: '乾坤連射' }, moves: [['barrage', null, null], ['judge', null, 'barrage', null], ['flip', null, 'judge', 'barrage']], rest: ['flip'] },
    wind: { max: 3, at: 3 },
    sudden: 16
  }
];

/* ===== 演武場：所有的兵任選、戰場任選（演武城，或魔王城、機關巨獸以外各關的城、地形和環境），試打第三、四篇的兵器和規則 =====
   practice：不給星星、不解鎖；rules：ff 誤傷、crit 弱點暴擊、elem 冰能滅火（屬性剋制的字每一關都會跳，這條是真的改戰局） */
const PRACTICE_BASE = {
  name: '演武場', tag: '全兵種・誤傷・弱點暴擊', theme: 0, castle: 'DRILL', practice: 1, rules: { ff: 1, crit: 1, elem: 1 },
  tip: '所有的兵任你挑，每邊最多六個；戰場也可以換成各關的城（魔王城、機關巨獸除外）。第三篇的規則都在：自己的砲炸到自己人一樣會傷，打中接點、核心、兵的頭是暴擊 ×2',
  hints: [],
  ground: [[-40, 3], [0, 0], [47, 0], [51, 3.6], [56, 5.2], [61, 3.6], [65, 0], [112, 0], [152, 3]],
  me: { crew: ['chain', 'drill', 'cluster', 'sapper', 'magnet', 'eng'] },
  foe: { crew: ['wind', 'acid', 'sniper', 'bomb', 'rocket', 'eng'], hp: 1, dmg: 1, open: 0.55, ai: { err: 4.2, think: 1.0, gate: 0.6, hate: 0.2, skill: 0.5, sap: 0.6, warm: 1.6 } },
  wind: { max: 5, at: 2 }, sudden: 12
};
// 演武場的戰場清單：0 演武城，其他照那一關（第幾關；城、地形、中間的機關、環境都一樣，兵換成挑的）。魔王城不能選（要有魔王）
const PRACTICE_LIST = [0].concat(LEVELS.map((l, i) => i + 1).filter((m) => !LEVELS[m - 1].boss && !LEVELS[m - 1].beast && !LEVELS[m - 1].aerie && !LEVELS[m - 1].stack && !LEVELS[m - 1].siege));          // 疊城對決不能選（要從兩個兵開始疊）
const PRACTICE_MAPS = LEVELS.length + 1;          // 戰場編號的上限（存檔檢查用）
function practiceSlots(map) { const lv = map > 0 ? LEVELS[map - 1] : PRACTICE_BASE, d = CASTLES[lv.castle || lv.me.castle]; let n = 0; for (const r of d.map) for (const ch of r) if (ch >= '1' && ch <= '9') n++; return n; }
function practiceLevel(map, me, foe, ff) {
  const base = map > 0 ? LEVELS[map - 1] : PRACTICE_BASE;
  return Object.assign({}, base, {
    name: map > 0 ? '演武場・' + base.name : PRACTICE_BASE.name, tag: PRACTICE_BASE.tag, tip: PRACTICE_BASE.tip, hints: [],
    practice: 1, rules: { ff: ff ? 1 : 0, crit: 1, elem: 1 }, idx: -1 - map, map,
    me: Object.assign({}, base.me, { crew: me.slice() }),
    foe: Object.assign({}, base.foe, { crew: foe.slice(), ai: Object.assign({}, base.foe.ai) })
  });
}
