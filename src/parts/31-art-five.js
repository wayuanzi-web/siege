/* ===== 31-art-five: 第五篇第二、三批的新兵、新砲彈怎麼畫（設計座標跟 30-art 一樣：兵 64×64、頭朝右；砲彈 32×16） ===== */
Object.assign(UNIT_ART, {
  shove(c, side, P) {
    // 推擊手：寬肩、鐵護肩，雙手抱著一根包鐵頭的短撞錘（頂在胸前往前衝）
    uShadow(c); kLegs(c, P); kBody(c, P); kHead(c, side, P);
    rrect(c, 18, 26, 9, 6, 2); fs(c, lg(c, 0, 26, 0, 32, [0, '#c8ccd6', 1, '#5a5f6a']), '#1a1c22', 1.1);
    c.save(); c.translate(42, 35);
    rrect(c, -14, -4, 24, 8, 3); fs(c, lg(c, 0, -4, 0, 4, [0, '#c8925a', 0.6, '#8e5c2c', 1, '#5a3614']), '#2a1608', 1.3);
    c.strokeStyle = '#3a2410'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-10, -1); c.lineTo(4, -1); c.moveTo(-8, 1.6); c.lineTo(6, 1.6); c.stroke();
    rrect(c, 8, -5.4, 9, 10.8, 2.6); fs(c, lg(c, 0, -5.4, 0, 5.4, [0, '#dfe4ec', 0.5, '#8a92a0', 1, '#4a505c']), '#1a1c22', 1.3);
    c.fillStyle = '#1a1c22'; for (const y of [-3, 0, 3]) { c.beginPath(); c.arc(12.5, y, 0.8, 0, TAU); c.fill(); }
    c.restore();
    uArm(c, P, 36, 36); uArm(c, P, 46, 37);
  },
  swivel(c, side, P) {
    // 轉向術士：長袍、高領，手上一根長杖，杖頭一圈旋轉的箭頭（發青光）
    uShadow(c); kBody(c, P, 1); kHead(c, side, P);
    rrect(c, 21, 10, 22, 5, 2); fs(c, side ? '#a03a5a' : '#2a8aa0', '#14101e', 1.1);
    c.strokeStyle = '#6a4a2a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(46, 54); c.lineTo(50, 8); c.stroke();
    const g = side ? '#ff9ab8' : '#7af0ff';
    c.fillStyle = rg(c, 50, 7, 0.5, 9, [0, '#ffffff', 0.35, g, 1, 'rgba(0,0,0,0)']); c.beginPath(); c.arc(50, 7, 9, 0, TAU); c.fill();
    c.strokeStyle = side ? '#c0305a' : '#1a8aa8'; c.lineWidth = 1.8; c.beginPath(); c.arc(50, 7, 5.2, -0.4, 3.6); c.stroke();
    poly(c, [50 + Math.cos(3.6) * 5.2 - 2.6, 7 + Math.sin(3.6) * 5.2 - 0.6, 50 + Math.cos(3.6) * 5.2 + 1.2, 7 + Math.sin(3.6) * 5.2 - 3.4, 50 + Math.cos(3.6) * 5.2 + 1.6, 7 + Math.sin(3.6) * 5.2 + 1.6]); c.fillStyle = side ? '#c0305a' : '#1a8aa8'; c.fill();
    uArm(c, P, 38, 32); uArm(c, P, 48, 30);
  },
  decoy(c, side, P) {
    // 誘餌兵：大草帽，背上綁著一個小草人（十字木架、稻草、補丁衣）
    uShadow(c);
    c.save(); c.translate(-2, 0);
    c.strokeStyle = '#7a5a30'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(16, 50); c.lineTo(16, 10); c.moveTo(8, 22); c.lineTo(24, 22); c.stroke();
    rrect(c, 10, 20, 12, 12, 2); fs(c, side ? '#c86a5a' : '#5a8ac8', '#2a1a10', 1); c.fillStyle = '#e8c070'; c.fillRect(12, 24, 4, 4);
    ell(c, 16, 15, 5, 5); fs(c, '#e8d090', '#6a4a1a', 1); c.fillStyle = '#2a1a10'; c.fillRect(13.6, 14, 1.4, 1.4); c.fillRect(17.2, 14, 1.4, 1.4);
    c.strokeStyle = '#d8b860'; c.lineWidth = 1; for (const dx of [-7, -5, 5, 7]) { c.beginPath(); c.moveTo(16 + dx, 22); c.lineTo(16 + dx * 1.15, 25); c.stroke(); }
    c.restore();
    kLegs(c, P); kBody(c, P); uArm(c, P, 21, 38); kHead(c, side, P);
    ell(c, 32, 13.5, 15, 3.4); fs(c, '#e8c870', '#7a5a1a', 1.2); rrect(c, 24, 6, 16, 8, 3); fs(c, '#e8c870', '#7a5a1a', 1.2); c.fillStyle = side ? '#c0302a' : '#2a6ad8'; c.fillRect(24, 11, 16, 2);
    uArm(c, P, 45, 34);
  },
  boost(c, side, P) {
    // 推進兵：圓頭盔、背上一具推進背包（噴口冒著小火），手上一枝帶尾翼的推進彈
    uShadow(c); kLegs(c, P);
    rrect(c, 12, 24, 10, 20, 3); fs(c, lg(c, 0, 24, 0, 44, [0, '#d8dce6', 1, '#6a7080']), '#1a1c22', 1.2);
    c.fillStyle = rg(c, 15, 48, 0.3, 5, [0, '#fff4c0', 0.4, '#ff9a3a', 1, 'rgba(220,70,20,0)']); c.beginPath(); c.arc(15, 48, 5, 0, TAU); c.fill();
    kBody(c, P); uArm(c, P, 21, 38); kHead(c, side, P);
    c.beginPath(); c.arc(32, 15, 12.5, Math.PI * 1.02, Math.PI * 1.98); fs(c, 'rgba(200,236,255,.35)', '#2a3448', 1.6);
    c.save(); c.translate(45, 28); c.rotate(-0.5);
    rrect(c, -6, -3, 18, 6, 2.6); fs(c, lg(c, 0, -3, 0, 3, [0, '#f0f2f8', 1, '#8a92a4']), '#2a3040', 1.1);
    poly(c, [12, -3, 17, 0, 12, 3]); fs(c, side ? '#e8402e' : '#3a7ae8', '#1a1c22', 1);
    poly(c, [-6, -3, -10, -6, -4, -3]); fs(c, side ? '#e8402e' : '#3a7ae8', '#1a1c22', 0.8); poly(c, [-6, 3, -10, 6, -4, 3]); fs(c, side ? '#e8402e' : '#3a7ae8', '#1a1c22', 0.8);
    c.restore();
    uArm(c, P, 44, 30);
  },
  anchor(c, side, P) {
    // 引力錨手：深色斗篷，手上提著一具發紫光的小錨
    uShadow(c); kLegs(c, P); kBody(c, P); uArm(c, P, 21, 38); kHead(c, side, P);
    c.beginPath(); c.moveTo(20, 18); c.quadraticCurveTo(32, 8, 44, 18); c.lineTo(42, 14); c.quadraticCurveTo(32, 5, 22, 14); c.closePath(); c.fillStyle = side ? '#5a1a3a' : '#2a2a6a'; c.fill();
    // 錨舉在肩膀上（頭像裁得到）
    const g = side ? '#ff7ac8' : '#b08aff';
    c.fillStyle = rg(c, 50, 18, 0.5, 12, [0, 'rgba(255,255,255,.9)', 0.3, g, 1, 'rgba(0,0,0,0)']); c.beginPath(); c.arc(50, 18, 12, 0, TAU); c.fill();
    c.strokeStyle = side ? '#a01a5a' : '#4a2aa8'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(50, 7); c.lineTo(50, 27); c.moveTo(44.5, 11.5); c.lineTo(55.5, 11.5); c.stroke();
    c.beginPath(); c.arc(50, 19, 7.5, 0.25, Math.PI - 0.25); c.stroke();
    c.beginPath(); c.arc(50, 5.4, 2.2, 0, TAU); c.stroke();
    uArm(c, P, 47, 22);
  },
  net(c, side, P) {
    // 拖網兵：肩上扛著一大捆漁網（網眼、墜子），手上拉著網繩
    uShadow(c); kLegs(c, P); kBody(c, P); kHead(c, side, P);
    c.save(); c.translate(40, 22);
    ell(c, 0, 0, 13, 9); fs(c, 'rgba(210,190,140,.35)', '#8a7040', 1.2);
    c.strokeStyle = '#8a7040'; c.lineWidth = 0.9; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 4.5 - 4, -8); c.lineTo(k * 4.5 + 4, 8); c.moveTo(k * 4.5 + 4, -8); c.lineTo(k * 4.5 - 4, 8); c.stroke(); }
    c.fillStyle = '#5a5f6a'; for (const [x, y] of [[-11, 5], [-4, 8.5], [4, 8.5], [11, 5]]) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
    c.restore();
    uArm(c, P, 26, 26); uArm(c, P, 46, 34);
  },
  // 第五篇第三批
  ram(c, side, P) {
    // 衝車兵：頭盔、皮甲，雙手推著一根裝在小輪架上的撞木（木頭前端包鐵、雕成羊頭）
    uShadow(c); kLegs(c, P); kBody(c, P); uArm(c, P, 21, 38); kHead(c, side, P);
    c.fillStyle = '#5a5f6a'; c.beginPath(); c.arc(32, 9, 11, Math.PI, 0); c.fill(); c.fillRect(20, 8, 24, 2.4);
    c.save(); c.translate(40, 44);
    rrect(c, -6, -4, 26, 8, 3); fs(c, lg(c, 0, -4, 0, 4, [0, '#b8844c', 1, '#5c3b1b']), '#2a1608', 1.2);
    ell(c, 21, 0, 4.6, 5); fs(c, lg(c, 0, -5, 0, 5, [0, '#dfe4ec', 1, '#5a5f6a']), '#1a1c22', 1.1);
    c.strokeStyle = '#3a3f48'; c.lineWidth = 1.4; c.beginPath(); c.arc(22, -2.5, 3, Math.PI * 1.2, Math.PI * 0.2); c.stroke();
    ell(c, 2, 7, 3.4, 3.4); fs(c, '#5a3a1c', '#2a1608', 1.2); ell(c, 14, 7, 3.4, 3.4); fs(c, '#5a3a1c', '#2a1608', 1.2);
    c.restore();
    uArm(c, P, 42, 40);
  },
  ladder(c, side, P) {
    // 雲梯兵：肩上扛著一架長梯（梯頭一對鉤爪），腰上一把短刀
    uShadow(c); kLegs(c, P); kBody(c, P); kHead(c, side, P);
    c.save(); c.translate(32, 22); c.rotate(-0.62);
    c.strokeStyle = '#8e5c2c'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-14, -4); c.lineTo(28, -4); c.moveTo(-14, 4); c.lineTo(28, 4); c.stroke();
    c.lineWidth = 1.6; for (let k = -10; k <= 24; k += 6) { c.beginPath(); c.moveTo(k, -4); c.lineTo(k, 4); c.stroke(); }
    c.strokeStyle = '#5a5f6a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(28, -4); c.quadraticCurveTo(33, -6, 31, -1); c.moveTo(28, 4); c.quadraticCurveTo(33, 2, 31, 7); c.stroke();
    c.restore();
    c.strokeStyle = '#c8ccd6'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(24, 44); c.lineTo(20, 52); c.stroke();
    uArm(c, P, 27, 28); uArm(c, P, 44, 24);
  },
  alter(c, side, P) {
    // 變材術士：灰綠的長袍、兜帽，雙手捧著一塊一半是石頭、一半變成木頭的磚（中間一道光）
    uShadow(c); kBody(c, P, 1); kHead(c, side, P);
    c.beginPath(); c.moveTo(18, 20); c.quadraticCurveTo(32, -2, 46, 20); c.lineTo(42, 16); c.quadraticCurveTo(32, 4, 22, 16); c.closePath(); c.fillStyle = side ? '#4a5a3a' : '#3a5a6a'; c.fill();
    c.save(); c.translate(46, 31);
    rrect(c, -7, -5, 7, 10, 1); fs(c, lg(c, 0, -5, 0, 5, [0, '#d0c8b8', 1, '#6e665a']), '#2a2620', 1);
    rrect(c, 0, -5, 7, 10, 1); fs(c, lg(c, 0, -5, 0, 5, [0, '#e0a868', 1, '#7a4c22']), '#2a1608', 1);
    c.fillStyle = rg(c, 0, 0, 0.3, 6, [0, '#ffffff', 0.4, '#b8ff9a', 1, 'rgba(120,255,120,0)']); c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
    c.restore();
    uArm(c, P, 40, 34); uArm(c, P, 52, 34);
  },
  mirage(c, side, P) {
    // 鏡影兵：銀白輕甲，手上舉著一面菱形的鏡（鏡面映著自己的影子）
    uShadow(c); kLegs(c, P); kBody(c, P); uArm(c, P, 21, 38); kHead(c, side, P);
    c.save(); c.translate(49, 26); c.rotate(0.2);
    poly(c, [0, -12, 8, 0, 0, 12, -8, 0]); fs(c, lg(c, -8, -12, 8, 12, [0, '#ffffff', 0.4, side ? '#ffc8d8' : '#c8e8ff', 1, side ? '#c06080' : '#5a8ac8']), '#2a3040', 1.4);
    c.globalAlpha = 0.45; c.fillStyle = side ? '#a02a4a' : '#2a4a8a'; c.beginPath(); c.arc(0, -2, 2.4, 0, TAU); c.fill(); c.fillRect(-2, 1, 4, 6); c.globalAlpha = 1;
    c.restore();
    uArm(c, P, 44, 30);
  },
  star(c, side, P) {
    // 星盤師：深藍長袍綴著星點，手上一具銅星盤（幾道圓環、一根指針）
    uShadow(c); kBody(c, P, 1); kHead(c, side, P);
    c.fillStyle = '#ffe8a0'; for (const [x, y] of [[24, 34], [30, 44], [37, 38], [27, 50], [40, 48]]) { c.beginPath(); c.arc(x, y, 0.9, 0, TAU); c.fill(); }
    rrect(c, 21, 8, 22, 6, 2.4); fs(c, side ? '#5a1a3a' : '#1a2a5a', '#0e1020', 1.1); c.fillStyle = '#ffd36a'; c.beginPath(); c.arc(32, 8, 2, 0, TAU); c.fill();
    c.save(); c.translate(49, 28);
    c.strokeStyle = '#c4922e'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(0, 0, 8, 3.2, 0.5, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(0, 0, 8, 3.2, -0.6, 0, TAU); c.stroke();
    c.strokeStyle = '#ffe8a0'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, 5); c.lineTo(6, -5); c.stroke(); c.fillStyle = '#ffe8a0'; c.beginPath(); c.arc(0, 0, 1.6, 0, TAU); c.fill();
    c.restore();
    uArm(c, P, 42, 32);
  },
  lord(c, side, P) {
    // 乾坤魔君：一半白一半黑的長袍（陰陽），頭上一頂倒過來的冠，背後一圈兩色的光環；手上一枝頂著天秤的權杖
    uShadow(c);
    c.fillStyle = rg(c, 32, 26, 4, 30, [0, 'rgba(255,255,255,.0)', 0.7, 'rgba(255,230,160,.35)', 1, 'rgba(120,60,200,0)']); c.beginPath(); c.arc(32, 26, 30, 0, TAU); c.fill();
    c.strokeStyle = '#ffe08a'; c.lineWidth = 2; c.beginPath(); c.arc(32, 22, 22, Math.PI * 0.5, Math.PI * 1.5); c.stroke(); c.strokeStyle = '#7a4ae0'; c.beginPath(); c.arc(32, 22, 22, Math.PI * 1.5, Math.PI * 2.5); c.stroke();
    c.beginPath(); c.moveTo(14, 58); c.quadraticCurveTo(14, 24, 32, 22); c.lineTo(32, 58); c.closePath(); fs(c, lg(c, 0, 22, 0, 58, [0, '#f4f0e8', 1, '#b8b0a0']), '#2a2030', 1.4);
    c.beginPath(); c.moveTo(50, 58); c.quadraticCurveTo(50, 24, 32, 22); c.lineTo(32, 58); c.closePath(); fs(c, lg(c, 0, 22, 0, 58, [0, '#3a2a5a', 1, '#140c24']), '#0a0612', 1.4);
    ell(c, 32, 16, 9, 9); fs(c, rg(c, 29, 13, 1, 10, [0, '#e8e0ff', 1, '#8a7ab8']), '#1a1030', 1.4);
    c.fillStyle = side ? '#ff5a4a' : '#5ab8ff'; c.beginPath(); c.arc(28.6, 15.6, 1.6, 0, TAU); c.arc(35.4, 15.6, 1.6, 0, TAU); c.fill();
    poly(c, [22, 8, 42, 8, 44, 1, 38, 4, 32, -2, 26, 4, 20, 1]); c.save(); c.translate(0, 9); c.scale(1, -1); c.translate(0, -9); poly(c, [22, 8, 42, 8, 44, 1, 38, 4, 32, -2, 26, 4, 20, 1]); c.restore(); fs(c, lg(c, 0, 8, 0, 18, [0, '#ffe08a', 1, '#a8741a']), '#4a2a08', 1.2);
    c.strokeStyle = '#6a4a2a'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(54, 58); c.lineTo(54, 10); c.stroke();
    c.strokeStyle = '#ffe08a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(46, 10); c.lineTo(62, 10); c.moveTo(47, 10); c.lineTo(46, 16); c.moveTo(47, 10); c.lineTo(49, 16); c.moveTo(61, 10); c.lineTo(59, 16); c.moveTo(61, 10); c.lineTo(63, 16); c.stroke();
    ell(c, 47.5, 16, 2.4, 1); fs(c, '#ffe08a', '#a8741a', 0.8); ell(c, 61, 16, 2.4, 1); fs(c, '#ffe08a', '#a8741a', 0.8);
  }
});
Object.assign(SHOT_ART, {
  shove(c) {          // 撞錘彈：一截包鐵頭的短木
    rrect(c, 4, 4.5, 16, 7, 2.4); fs(c, lg(c, 0, 4.5, 0, 11.5, [0, '#c8925a', 1, '#5a3614']), '#2a1608', 1);
    rrect(c, 19, 3, 9, 10, 2.4); fs(c, lg(c, 0, 3, 0, 13, [0, '#dfe4ec', 1, '#4a505c']), '#1a1c22', 1.1);
  },
  swivel(c, side) {          // 轉向彈：一顆青光球，外面一圈繞著的箭頭
    const g = side ? '#ff9ab8' : '#7af0ff';
    c.fillStyle = rg(c, 16, 8, 0.4, 8, [0, '#ffffff', 0.4, g, 1, 'rgba(0,0,0,0)']); c.beginPath(); c.arc(16, 8, 8, 0, TAU); c.fill();
    c.strokeStyle = side ? '#c0305a' : '#1a8aa8'; c.lineWidth = 1.4; c.beginPath(); c.arc(16, 8, 5.4, 0.3, 4.6); c.stroke();
    c.fillStyle = side ? '#c0305a' : '#1a8aa8'; c.beginPath(); c.moveTo(16 + 5.4 * Math.cos(4.6) - 2, 8 + 5.4 * Math.sin(4.6) - 1); c.lineTo(16 + 5.4 * Math.cos(4.6) + 2.4, 8 + 5.4 * Math.sin(4.6) - 1.4); c.lineTo(16 + 5.4 * Math.cos(4.6), 8 + 5.4 * Math.sin(4.6) + 2.4); c.closePath(); c.fill();
  },
  decoy(c, side) {          // 草人彈：一個轉著飛的小草人
    c.strokeStyle = '#7a5a30'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(16, 15); c.lineTo(16, 2); c.moveTo(10, 7); c.lineTo(22, 7); c.stroke();
    rrect(c, 12, 6, 8, 6, 1.4); fs(c, side ? '#c86a5a' : '#5a8ac8', '#2a1a10', 0.8);
    ell(c, 16, 3.4, 3, 3); fs(c, '#e8d090', '#6a4a1a', 0.8);
  },
  gearball(c) {          // 齒輪砲台的砲彈：一顆帶齒的大鐵球
    c.save(); c.translate(16, 8); c.fillStyle = '#3a3f48'; for (let k = 0; k < 8; k++) { c.rotate(TAU / 8); c.fillRect(-1.4, -7.6, 2.8, 2.4); } c.restore();
    ell(c, 16, 8, 6, 6); fs(c, rg(c, 14, 6, 0.5, 7, [0, '#c8ccd6', 0.5, '#6a707c', 1, '#2a2e36']), '#14161c', 1.1);
  },
  boost(c, side) {          // 推進彈：白色的小火箭，尾巴噴火
    c.fillStyle = rg(c, 5, 8, 0.3, 6, [0, '#fff4c0', 0.4, '#ff9a3a', 1, 'rgba(220,70,20,0)']); c.beginPath(); c.arc(5, 8, 6, 0, TAU); c.fill();
    rrect(c, 7, 5, 16, 6, 2.6); fs(c, lg(c, 0, 5, 0, 11, [0, '#f0f2f8', 1, '#8a92a4']), '#2a3040', 1);
    poly(c, [23, 5, 29, 8, 23, 11]); fs(c, side ? '#e8402e' : '#3a7ae8', '#1a1c22', 0.9);
    poly(c, [8, 5, 5, 2, 11, 5]); fs(c, side ? '#e8402e' : '#3a7ae8', '#1a1c22', 0.7); poly(c, [8, 11, 5, 14, 11, 11]); fs(c, side ? '#e8402e' : '#3a7ae8', '#1a1c22', 0.7);
  },
  anchor(c, side) {          // 引力錨：一具發紫光的小錨
    const g = side ? '#ff7ac8' : '#b08aff';
    c.fillStyle = rg(c, 16, 8, 0.4, 8, [0, 'rgba(255,255,255,.9)', 0.35, g, 1, 'rgba(0,0,0,0)']); c.beginPath(); c.arc(16, 8, 8, 0, TAU); c.fill();
    c.strokeStyle = side ? '#a01a5a' : '#4a2aa8'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(9, 8); c.lineTo(23, 8); c.moveTo(12, 4.5); c.lineTo(12, 11.5); c.stroke(); c.beginPath(); c.arc(17, 8, 5, -1.25, 1.25); c.stroke();
  },
  net(c) {          // 拖網：一團捲起來的網，邊上幾顆鉛墜
    ell(c, 16, 8, 7, 6); fs(c, 'rgba(210,190,140,.4)', '#8a7040', 1);
    c.strokeStyle = '#8a7040'; c.lineWidth = 0.7; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(12 + k * 3, 2.5); c.lineTo(17 + k * 3, 13.5); c.moveTo(17 + k * 3, 2.5); c.lineTo(12 + k * 3, 13.5); c.stroke(); }
    c.fillStyle = '#5a5f6a'; for (const [x, y] of [[9.5, 10], [16, 14], [22.5, 10]]) { c.beginPath(); c.arc(x, y, 1.3, 0, TAU); c.fill(); }
  },
  // 第五篇第三批
  ramlog(c) {          // 撞木：一根包鐵頭的圓木（滾的時候整根轉）
    rrect(c, 2, 4, 24, 8, 3.6); fs(c, lg(c, 0, 4, 0, 12, [0, '#c8925a', 1, '#5a3614']), '#2a1608', 1);
    c.strokeStyle = '#3a2410'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(5, 7); c.lineTo(20, 7); c.moveTo(6, 9.4); c.lineTo(22, 9.4); c.stroke();
    ell(c, 26, 8, 4, 5); fs(c, lg(c, 0, 3, 0, 13, [0, '#dfe4ec', 1, '#4a505c']), '#1a1c22', 1);
  },
  hookladder(c) {          // 雲梯彈：一小段摺起來的梯子，頭上兩支鉤爪
    c.strokeStyle = '#8e5c2c'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(4, 5); c.lineTo(24, 5); c.moveTo(4, 11); c.lineTo(24, 11); c.stroke();
    c.lineWidth = 1.1; for (let x = 7; x <= 22; x += 5) { c.beginPath(); c.moveTo(x, 5); c.lineTo(x, 11); c.stroke(); }
    c.strokeStyle = '#5a5f6a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(24, 5); c.quadraticCurveTo(29, 3, 27, 7); c.moveTo(24, 11); c.quadraticCurveTo(29, 9, 27, 13); c.stroke();
  },
  alter(c, side) {          // 變材彈：一團綠光，裡面一塊半石半木的小方塊
    c.fillStyle = rg(c, 16, 8, 0.4, 8, [0, '#ffffff', 0.4, side ? '#c8ff8a' : '#8affc8', 1, 'rgba(0,0,0,0)']); c.beginPath(); c.arc(16, 8, 8, 0, TAU); c.fill();
    rrect(c, 12, 4.5, 4, 7, 0.6); fs(c, '#a8a090', '#2a2620', 0.7); rrect(c, 16, 4.5, 4, 7, 0.6); fs(c, '#c8925a', '#2a1608', 0.7);
  },
  mirage(c, side) {          // 鏡影彈：一片轉著飛的菱形鏡
    c.fillStyle = rg(c, 16, 8, 0.4, 8, [0, '#ffffff', 0.5, side ? '#ffc8d8' : '#c8e8ff', 1, 'rgba(0,0,0,0)']); c.beginPath(); c.arc(16, 8, 8, 0, TAU); c.fill();
    poly(c, [16, 1, 21, 8, 16, 15, 11, 8]); fs(c, lg(c, 11, 1, 21, 15, [0, '#ffffff', 1, side ? '#c06080' : '#5a8ac8']), '#2a3040', 0.9);
  },
  star(c) {          // 星盤彈：一顆拖著金光的小星
    c.fillStyle = 'rgba(255,230,140,.5)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(4 + k * 3, 8 + (k & 1) * 1.2 - 0.6, 1 + k * 0.3, 0, TAU); c.fill(); }
    c.save(); c.translate(19, 8); c.beginPath(); for (let k = 0; k < 10; k++) { const r = k & 1 ? 2.4 : 6, a = k * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); fs(c, rg(c, 0, 0, 0.5, 6, [0, '#ffffff', 0.5, '#ffe08a', 1, '#d8a020']), '#8a5a08', 0.9); c.restore();
  },
  scale(c) {          // 魔君的乾坤彈：一半白一半黑的光球
    c.fillStyle = rg(c, 16, 8, 0.5, 9, [0, '#ffffff', 0.5, '#d8c8ff', 1, 'rgba(120,80,220,0)']); c.beginPath(); c.arc(16, 8, 9, 0, TAU); c.fill();
    c.beginPath(); c.arc(16, 8, 5, Math.PI / 2, Math.PI * 1.5); c.fillStyle = '#f4f0e8'; c.fill(); c.beginPath(); c.arc(16, 8, 5, -Math.PI / 2, Math.PI / 2); c.fillStyle = '#1a1030'; c.fill();
  }
});
