/* ===== 65-bot: 自動玩家（測難度、主畫面背景的示範戰局） =====
   用的是跟敵軍同一套瞄準（52-ai），差別只在手多穩、會不會找倍增符、會不會用技能。 */
const BOTS = {
  expert: { err: 1.5, think: 0.5, gate: 1, hate: 0.4, skill: 1 },                    // 很會玩
  casual: { err: 5, think: 0.6, gate: 0.6, hate: 0.2, skill: 0.5 },                  // 普通
  newbie: { err: 10, think: 0.7, gate: 0.2, hate: 0, skill: 0.15, guard: 0.4 },      // 新手
  demo: { err: 4, think: 1.4, gate: 0.8, hate: 0.2, skill: 0.6 }                     // 主畫面背景
};
