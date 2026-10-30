// Original vector pixel art. Only integer-aligned cells, with no remote assets.
const glyphs = {
  A:['01110','11011','11011','11111','11011','11011','11011'],
  C:['01111','11000','11000','11000','11000','11000','01111'],
  D:['11110','11011','11011','11011','11011','11011','11110'],
  E:['11111','11000','11000','11110','11000','11000','11111'],
  N:['11001','11101','11101','11011','11011','11011','11001'],
  O:['01110','11011','11011','11011','11011','11011','01110'],
  R:['11110','11011','11011','11110','11100','11010','11011'],
  X:['11011','11011','01110','00100','01110','11011','11011'],
  ' ':['00000','00000','00000','00000','00000','00000','00000']
};
const sprites = {
  invader: [
    '00100000100','00010001000','00111111100','01101110110',
    '11111111111','10111111101','10100000101','00011011000'
  ],
  ufo: [
    '00000011111000000','00001111111110000','00011111111111000',
    '01111111111111110','11101110111011101','01111111111111110',
    '00011000000011000','00100010001000100'
  ],
  heart: ['01100110','11111111','11111111','11111111','01111110','00111100','00011000'],
  coin: ['00111100','01100110','11011011','11011011','11011011','11011011','01100110','00111100'],
  dpad: ['000111000','000111000','000111000','111111111','111101111','111111111','000111000','000111000','000111000'],
  ship: ['000010000','000111000','000111000','001111100','001111100','011111110','111111111','110111011','100111001'],
  bolt: ['000111','001110','011100','111110','001100','011000','010000'],
  diamond: ['0001000','0010100','0100010','1000001','0100010','0010100','0001000'],
  spark: ['00100','00100','11111','00100','00100']
};

function cells(rows, x, y, unit, color, opacity=1) {
  let d='';
  rows.forEach((row,r)=>{
    for(let c=0;c<row.length;c++) {
      if(row[c]!=='1') continue;
      let end=c+1;
      while(row[end]==='1') end++;
      d+=`M${x+c*unit} ${y+r*unit}h${(end-c)*unit}v${unit}h-${(end-c)*unit}z`;
      c=end-1;
    }
  });
  return `<path fill="${color}" opacity="${opacity}" d="${d}"/>`;
}
function word(value,x,y,u,color,opacity) {
  return [...value].map((c,i)=>cells(glyphs[c]??glyphs[' '],x+i*6*u,y,u,color,opacity)).join('');
}
const frame = (w,h,body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" shape-rendering="crispEdges">${body}</svg>`;

export function stars(mode='dark') {
  const colors=mode==='dark'?['#35f1ff','#a980ff','#ff66cc','#b5f86e']:['#007383','#7042a6','#ad267f','#386d17'];
  let seed=8281;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  let body='';
  for(let i=0;i<66;i++) {
    const x=Math.floor(rand()*560/2)*2, y=Math.floor(rand()*420/2)*2;
    const size=i%11===0?4:2;
    const color=colors[i%colors.length], opacity=(.18+rand()*.3).toFixed(2);
    body+=`<path d="M${x} ${y}h${size}v${size}h-${size}z" fill="${color}" opacity="${opacity}"/>`;
    if(i%15===0) body+=cells(sprites.spark,x-2,y-2,2,color,.3);
  }
  return frame(560,420,body);
}

export function scene(mode='dark') {
  const p=mode==='dark'
    ? {cyan:'#35f1ff',pink:'#ff66cc',lime:'#b5f86e',violet:'#a980ff',gold:'#ffd27a',city:'#412d65',dark:'#0b0a18'}
    : {cyan:'#007383',pink:'#ad267f',lime:'#386d17',violet:'#7042a6',gold:'#9d6700',city:'#c3a9d7',dark:'#f4f0ff'};
  const sprite=(name,x,y,u,color,opacity)=>cells(sprites[name],x,y,u,color,opacity);
  let body='';
  // Cabinet brackets, pixel label, and a decorative three-heart life bar.
  body+=`<path d="M28 60V28h32M1140 28h32v32M28 780v32h32M1140 812h32v-32" stroke="${p.cyan}" stroke-opacity=".38" stroke-width="2"/>`;
  body+=word('NEON ARCADE',58,42,2,p.cyan,.56);
  body+=`<path d="M58 70h12m6 0h4m6 0h4m6 0h4m6 0h20" stroke="${p.pink}" stroke-opacity=".55" stroke-width="4"/>`;
  for(let i=0;i<3;i++) body+=sprite('heart',1034+i*36,44,3,p.pink,i===2?.24:.65);
  // The composition deliberately leaves the central title and input area empty.
  body+=sprite('invader',128,151,5,p.cyan,.56);
  body+=sprite('invader',131,153,5,p.pink,.12);
  body+=sprite('ufo',954,156,4,p.pink,.53);
  body+=sprite('diamond',805,100,4,p.violet,.58);
  body+=sprite('bolt',402,104,3,p.gold,.50);
  body+=sprite('heart',48,360,2,p.pink,.34);
  body+=sprite('spark',1090,366,3,p.lime,.55);
  body+=sprite('spark',270,116,2,p.pink,.55);
  body+=sprite('spark',888,236,2,p.cyan,.48);
  body+=sprite('spark',86,552,3,p.violet,.55);
  body+=sprite('diamond',1120,528,3,p.gold,.46);
  body+=sprite('dpad',106,654,4,p.violet,.48);
  body+=sprite('ship',456,704,4,p.cyan,.6);
  body+=`<path d="M474 685v-6m0-12v-6" stroke="${p.lime}" stroke-opacity=".65" stroke-width="4"/>`;
  body+=sprite('coin',1012,641,4,p.gold,.62);
  body+=sprite('coin',1052,662,4,p.gold,.35);
  body+=sprite('coin',1092,641,4,p.gold,.22);
  // Low skyline, distant pixel planet, and an arcade floor perspective.
  body+=`<path d="M0 764h42v-22h24v-48h22v20h22v-40h22v74h24v-28h24v50h48v-26h36v34h68v-18h46v28h120v-12h72v12h122v-20h48v10h56v-28h36v22h46v-50h26v-38h22v-26h24v64h24v-16h30v30h28v-48h24v-22h24v70h32v-22h30v-44h22v-18h24v44h26v-22h20v28h22v-16h34v108H0z" fill="${p.city}" opacity=".26"/>`;
  body+=`<path d="M876 662h40v6h12v8h8v12h6v36h-6v12h-8v8h-12v6h-40v-6h-12v-8h-8v-12h-6v-36h6v-12h8v-8h12z" fill="${p.pink}" opacity=".15"/>`;
  body+=`<path d="M864 682h66m-76 12h86m-88 12h88m-84 12h80m-72 12h60" stroke="${p.dark}" stroke-width="4"/>`;
  body+=`<path d="M0 782h1200M0 801h1200M0 828h1200M0 840l450-72M240 840l270-72M480 840l90-72M720 840l-90-72M960 840l-270-72M1200 840l-450-72" stroke="${p.cyan}" stroke-opacity=".14" stroke-width="1"/>`;
  // Distinct tetrominoes on the lower left and a few luminous city windows.
  const block=(x,y,c)=>`<path d="M${x} ${y}h16v16h-16z" fill="${c}" fill-opacity=".16" stroke="${c}" stroke-opacity=".46" stroke-width="2"/><path d="M${x+4} ${y+4}h4v4h-4z" fill="${c}" opacity=".36"/>`;
  for(const [x,y,c] of [[238,728,p.pink],[256,728,p.pink],[274,728,p.pink],[256,710,p.pink],[292,746,p.cyan],[310,746,p.cyan],[310,728,p.cyan],[310,710,p.cyan],[220,746,p.violet],[238,746,p.violet]]) body+=block(x,y,c);
  for(const [x,y] of [[74,732],[98,726],[122,700],[1002,732],[1050,742],[1106,730],[1162,740]]) body+=`<path d="M${x} ${y}h4v6h-4z" fill="${p.gold}" opacity=".4"/>`;
  return frame(1200,840,body);
}
