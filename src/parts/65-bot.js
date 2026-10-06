/* ===== 65-bot: 自動玩家（測難度、主畫面背景的示範戰局） =====
   用的是跟敵軍同一套瞄準（52-ai），差別只在手多穩、多久重新瞄一次、會不會用技能。 */
const BOTS = {
  expert: { err: 1.6, think: 1.3, gate: 1, hate: 0.5, turn: 5, skill: 1, delay: 0.3 },      // 很會玩
  casual: { err: 5, think: 2.4, gate: 0.65, hate: 0.25, turn: 2.6, skill: 0.5, delay: 0.8 },   // 普通
  newbie: { err: 9.5, think: 3.8, gate: 0.25, hate: 0, turn: 1.5, skill: 0.12, guard: 0.5, delay: 2 }   // 新手
};
