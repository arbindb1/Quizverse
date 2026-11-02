/* The body of a Custom Doodle, drawn as SVG in the same flat cartoon style as the Flow parts (1024 x 1024 square, head centred at 512, 400).
 * Face shape, hair and clothes are all separate choices, so any mix works: boy, girl, or anything in between.
 * No browser objects are used here, so the shapes can also be previewed from Node. */
const OUT = '#000';
const SW = 11; // outline width

/* ----- face shapes (the face parts keep the same spots on all of them) ----- */
const HEADS = [
  { name: 'Round', sx: 1, d: 'M165 400a347 305 0 1 0 694 0a347 305 0 1 0 -694 0Z' },
  { name: 'Chubby', sx: 1.08, d: 'M137 415a375 292 0 1 0 750 0a375 292 0 1 0 -750 0Z' },
  { name: 'Skinny', sx: 0.84, d: 'M232 405a280 318 0 1 0 560 0a280 318 0 1 0 -560 0Z' },
  { name: 'Chad', sx: 0.96, d: 'M512 94C682 94 786 170 798 300L806 506C808 580 790 630 760 676Q742 708 700 714L324 714Q282 708 264 676C234 630 216 580 218 506L226 300C238 170 342 94 512 94Z', chad: true },
  { name: 'Pear', sx: 0.9, d: 'M512 100C640 100 700 170 710 280C722 380 862 430 856 540C850 654 700 716 512 716C324 716 174 654 168 540C162 430 302 380 314 280C324 170 384 100 512 100Z' },
  { name: 'Square', sx: 1, d: 'M250 108H774Q852 108 852 190V616Q852 710 758 710H266Q172 710 172 616V190Q172 108 250 108Z' },
  { name: 'Heart', sx: 1.08, d: 'M512 722C446 706 304 612 220 486C144 372 174 118 512 100C850 118 880 372 804 486C720 612 578 706 512 722Z' },
  { name: 'Gigachad', sx: 0.96, giga: true, d: 'M512 90C640 90 740 130 764 260L772 400L808 520L798 640L760 718L722 786L302 786L264 718L226 640L216 520L252 400L260 260C284 130 384 90 512 90Z', chad: true, sharp: true },
  { name: 'Potato', sx: 1, d: 'M198 340C186 200 330 96 512 100C700 100 842 200 826 360C872 472 792 702 600 714C480 722 330 716 250 640C180 570 158 440 198 340Z' },
];

/* ----- hair: back is drawn behind the head, front on top of it (the fringe) ----- */
const FRINGE = 'fringe';
const HAIRS = [
  { name: 'Short', front: FRINGE },
  { name: 'Long straight', back: 'M178 372C172 250 330 170 512 172C694 170 852 250 846 372L866 800Q700 836 646 792L378 792Q324 836 158 800Z', front: FRINGE },
  { name: 'Pigtails', back: '<circle cx="132" cy="470" r="92"/><circle cx="892" cy="470" r="92"/>', front: FRINGE, bands: [[200, 380], [824, 380]] },
  { name: 'Twin buns', back: '<circle cx="252" cy="104" r="92"/><circle cx="772" cy="104" r="92"/>', front: FRINGE },
  { name: 'High bun', back: '<circle cx="512" cy="44" r="96"/>', front: FRINGE },
  { name: 'Bob', back: 'M176 372C172 250 330 170 512 172C694 170 852 250 848 372L862 600Q700 650 512 650Q324 650 162 600Z',
    front: 'bob' },
  { name: 'Spiky', front: ['fringe', 'M190 340L168 190L268 250L296 110L400 200L452 60L512 190L572 60L624 200L728 110L756 250L856 190L834 340C760 270 640 232 512 232C384 232 264 270 190 340Z'] },
  { name: 'Curly puff', back: 'M512 70C700 40 900 140 880 330C920 420 860 480 812 470L212 470C164 480 104 420 144 330C124 140 324 40 512 70Z', front: FRINGE },
  { name: 'Long wavy', back: 'M178 372C172 250 330 170 512 172C694 170 852 250 846 372C892 470 842 560 874 650C902 730 842 780 870 830Q780 800 740 830Q690 790 640 830Q590 790 512 826Q430 790 384 830Q334 790 284 830Q244 800 154 830C182 780 122 730 150 650C182 560 132 470 178 372Z', front: FRINGE },
];

/* ----- body types: shoulder half-width (sh), waist control (wa), hem half-width (hm), arm thickness (arm), belly bulge ----- */
const BODIES = [
  { name: 'Average', sh: 186, wa: 200, hm: 214, arm: 1, belly: 0 },
  { name: 'Thin', sh: 126, wa: 126, hm: 132, arm: 0.55, belly: 0 },
  { name: 'Chubby', sh: 214, wa: 250, hm: 280, arm: 1.2, belly: 30 },
  { name: 'Fat', sh: 250, wa: 310, hm: 350, arm: 1.45, belly: 70 },
  { name: 'Muscular', sh: 300, wa: 250, hm: 210, arm: 2.1, belly: 0, muscle: true },
  { name: 'Athletic', sh: 250, wa: 214, hm: 206, arm: 1.5, belly: 0, muscle: true },
  { name: 'Curvy', sh: 190, wa: 140, hm: 290, arm: 0.85, belly: 0 },
];

/* ----- clothes (c is the clothes colour, k the skin colour, b the body type) ----- */
const shL = (b) => 512 - b.sh, shR = (b) => 512 + b.sh;
const torsoPath = (b) => `M${shL(b)} 690Q${512 - b.wa - b.belly} 790 ${512 - b.hm} 884Q512 914 ${512 + b.hm} 884Q${512 + b.wa + b.belly} 790 ${shR(b)} 690Z`;
// an arm from the shoulder: sleeve 'long' (all clothes colour), 'short' (clothes to the elbow, skin below) or 'none' (all skin)
const arm = (side, sleeve, c, k, b) => {
  const m = (x) => (side === 1 ? 1024 - x : x);
  const sx = shL(b) + 10 - (b.arm - 1) * 12, w = 48 * b.arm, o = (b.arm - 1) * 16;
  const path = `M${m(sx)} 696Q${m(sx - 86 - o)} 720 ${m(sx - 122 - o)} 790L${m(sx - 122 - o + w)} 826Q${m(sx - 36 + w * 0.7)} 764 ${m(sx + 20)} 748Z`;
  const hx = sx - 122 - o + w / 2 + 6, rad = 34 * (0.85 + 0.15 * b.arm);
  const hand = `<ellipse cx="${m(hx)}" cy="${812 + (b.arm - 1) * 6}" rx="${rad}" ry="${rad * 0.9}" fill="${k}"/>`;
  const upper = `<path d="${path}" fill="${sleeve === 'none' ? k : c}"/>`;
  const cuff = sleeve === 'short' ? `<path d="M${m(sx - 122 - o)} 790L${m(sx - 122 - o + w)} 826L${m(sx - 128 - o + w)} 842Q${m(sx - 160 - o)} 836 ${m(sx - 172 - o)} 806Z" fill="${k}"/>` : '';
  const bicep = b.muscle && sleeve !== 'long' ? `<path d="M${m(sx - 40)} 740Q${m(sx - 82 - o)} 762 ${m(sx - 96 - o)} 800" fill="none" stroke-width="6"/>` : '';
  return hand + upper + cuff + bicep;
};
const feet = (k, b) => { const dx = Math.round(b.hm * 0.48); return `<ellipse cx="${512 - dx}" cy="918" rx="${64 + (b.hm - 214) / 12}" ry="30" fill="${k}"/><ellipse cx="${512 + dx}" cy="918" rx="${64 + (b.hm - 214) / 12}" ry="30" fill="${k}"/>`; };
const OUTFITS = [
  { name: 'Jacket', draw: (c, k, b) => `${feet(k, b)}<path d="${torsoPath(b)}" fill="${c}"/><path d="M512 704V900M${shL(b) + 18} 706L512 760L${shR(b) - 18} 706" fill="none"/>${arm(-1, 'long', c, k, b)}${arm(1, 'long', c, k, b)}` },
  { name: 'T-shirt', draw: (c, k, b) => `${feet(k, b)}<path d="${torsoPath(b)}" fill="${c}"/><path d="M430 690Q512 740 594 690" fill="none"/>${arm(-1, 'short', c, k, b)}${arm(1, 'short', c, k, b)}` },
  { name: 'Hoodie', draw: (c, k, b) => `${feet(k, b)}<ellipse cx="512" cy="700" rx="${Math.max(150, b.sh + 10)}" ry="62" fill="${c}"/><path d="${torsoPath(b)}" fill="${c}"/><path d="M${512 - 132} 800H${512 + 132}V868Q512 888 ${512 - 132} 868Z" fill="none"/><path d="M470 704V780M554 704V780" fill="none" stroke="#fff"/>${arm(-1, 'long', c, k, b)}${arm(1, 'long', c, k, b)}` },
  { name: 'Dress', draw: (c, k, b) => {
    const wb = Math.round(b.wa * 0.62), hem = b.hm + 62;
    return `${feet(k, b)}<path d="M${shL(b) + 26} 690L${512 - wb} 790L${512 - hem} 908Q512 946 ${512 + hem} 908L${512 + wb} 790L${shR(b) - 26} 690Z" fill="${c}"/><path d="M${512 - wb} 790Q512 818 ${512 + wb} 790" fill="none"/><path d="M430 690Q512 736 594 690" fill="none"/>${arm(-1, 'short', c, k, b)}${arm(1, 'short', c, k, b)}`;
  } },
  { name: 'Suit & tie', draw: (c, k, b) => `${feet(k, b)}<path d="${torsoPath(b)}" fill="${c}"/><path d="M430 690L512 840L594 690Z" fill="#fff"/><path d="M496 704H528L544 830L512 862L480 830Z" fill="#d32626"/><path d="M430 690L396 800M594 690L628 800" fill="none"/>${arm(-1, 'long', c, k, b)}${arm(1, 'long', c, k, b)}` },
  { name: 'Tank top', draw: (c, k, b) => `${feet(k, b)}<path d="M${shL(b) + 40} 690Q${512 - b.wa - b.belly} 790 ${512 - b.hm} 884Q512 914 ${512 + b.hm} 884Q${512 + b.wa + b.belly} 790 ${shR(b) - 40} 690Q${512 + 120} 744 512 744Q${512 - 120} 744 ${shL(b) + 40} 690Z" fill="${c}"/>${arm(-1, 'none', c, k, b)}${arm(1, 'none', c, k, b)}` },
];

/* ----- head wraps (turban, dastar, keffiyeh, headscarf): worn over the hair, in their own colour ----- */
const folds = (d) => `<path d="${d}" fill="none" stroke-width="7"/>`;
const WRAPS = [
  { name: 'Turban', front: (c) => `<path d="M146 310C124 150 300 18 512 18C724 18 900 150 878 310C770 254 644 232 512 232C380 232 254 254 146 310Z" fill="${c}"/>`
    + folds('M170 268C262 168 420 108 612 100') + folds('M246 296C340 196 500 150 704 154') + folds('M590 52C716 70 826 150 862 262') + folds('M310 92C430 54 606 54 706 96') },
  { name: 'Dastar', front: (c) => `<path d="M160 318C130 170 262 -10 512 -34C762 -10 894 170 864 318C760 262 640 236 512 236C384 236 264 262 160 318Z" fill="${c}"/>`
    + folds('M512 -30C492 60 480 150 480 236') + folds('M512 -30C532 60 544 150 544 236') + folds('M190 270C250 170 380 80 480 60') + folds('M834 270C774 170 644 80 544 60') + folds('M170 300C300 250 420 240 512 240C604 240 724 250 854 300') },
  { name: 'Keffiyeh', back: (c) => `<path d="M150 330C130 140 300 40 512 40C724 40 894 140 874 330L900 700Q700 760 512 740Q324 760 124 700Z" fill="${c}"/>`,
    front: (c) => `<path d="M166 330C150 160 310 60 512 60C714 60 874 160 858 330C760 256 640 232 512 232C384 232 264 256 166 330Z" fill="${c}"/>`
      + '<path d="M168 214C246 160 380 130 512 130C644 130 778 160 856 214" fill="none" stroke-width="22"/>' + folds('M200 290C300 210 420 190 512 190') },
  { name: 'Headscarf', back: (c) => `<path d="M512 26C770 26 910 200 900 424C894 612 826 748 700 820L324 820C198 748 130 612 124 424C114 200 254 26 512 26Z" fill="${c}"/>`,
    front: (c) => `<path fill-rule="evenodd" d="M512 26C770 26 910 200 900 424C894 612 826 748 700 820L324 820C198 748 130 612 124 424C114 200 254 26 512 26ZM512 140C690 140 800 266 800 424C800 566 696 716 512 716C328 716 224 566 224 424C224 266 334 140 512 140Z" fill="${c}"/>`
      + folds('M270 160C340 130 430 120 512 120') + folds('M740 160C690 130 600 120 512 120') },
];

const HAIR_COLORS = ['#3b2a20', '#111111', '#7a4a21', '#c47a2c', '#e8c35a', '#d9d9d9', '#d32626', '#ff7fb0', '#2e7bd6', '#8e44c8', '#2fa84f', '#ffffff'];

const CAPS = {
  fringe: { region: 'M-100 -100H1124V336L832 336C762 254 640 220 512 220C384 220 262 254 192 336L-100 336Z', edge: 'M192 336C262 254 384 220 512 220C640 220 762 254 832 336' },
  bob: { region: 'M-100 -100H1124V270L844 270Q512 222 180 270L-100 270Z', edge: 'M180 270Q512 222 844 270' },
};
const capSvg = (kind, head, hi, hc) => {
  const cap = CAPS[kind];
  const t = `translate(512 0) scale(${head.sx} 1) translate(-512 0)`;
  return `<clipPath id="cap${hi}${kind}"><path d="${cap.region}" transform="${t}"/></clipPath>`
    + `<g clip-path="url(#cap${hi}${kind})"><path d="${head.d}" transform="translate(512 400) scale(1.05) translate(-512 -400)" fill="${hc}"/></g>`
    + `<path d="${cap.edge}" transform="${t}" fill="none"/>`;
};

/* the whole body: clothes, hair behind, head (with the chad lines), hair in front. look: { skin, jacket, head, hair, hairColor, outfit } */
function doodleSvg(look, { box = '0 0 1024 1024', cls = '' } = {}) {
  const k = look.skin || '#facdac';
  const head = HEADS[look.head] || HEADS[0];
  const outfit = OUTFITS[look.outfit] || OUTFITS[0];
  const body = BODIES[look.body] || BODIES[0];
  const hair = look.hair >= 0 ? HAIRS[look.hair] : null;
  const hc = look.hairColor || '#3b2a20';
  const scaleHair = (inner) => `<g transform="translate(512 0) scale(${head.sx} 1) translate(-512 0)" fill="${hc}">${inner}</g>`;
  const asShape = (v) => (v.startsWith('<') ? v : `<path d="${v}"/>`);
  const back = hair && hair.back ? scaleHair(asShape(hair.back)) : '';
  const wc = look.wrapColor || '#ffffff';
  const wrap = look.wrap >= 0 ? WRAPS[look.wrap] : null;
  const wrapBack = wrap && wrap.back ? `<g transform="translate(512 0) scale(${head.sx} 1) translate(-512 0)">${wrap.back(wc)}</g>` : '';
  const wrapFront = wrap ? `<g transform="translate(512 0) scale(${head.sx} 1) translate(-512 0)">${wrap.front(wc)}</g>` : '';
  const bands = hair && hair.bands ? scaleHair(hair.bands.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="#d32626"/>`).join('')) : '';
  const front = hair && hair.front ? [].concat(hair.front).map((f) => (CAPS[f] ? capSvg(f, head, look.head | 0, hc) : scaleHair(asShape(f)))).join('') : '';
  // the chad faces get simple cartoon cheek lines and a chin cleft; the gigachad also has stubble dots along the jaw
  const stubble = head.giga ? [[290, 700], [322, 734], [360, 762], [410, 774], [462, 778], [562, 778], [614, 774], [664, 762], [702, 734], [734, 700], [312, 670], [712, 670], [392, 742], [632, 742], [512, 758]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#000" stroke="none"/>`).join('') : '';
  const lines = head.giga ? '<path d="M246 450Q256 650 340 760"/><path d="M778 450Q768 650 684 760"/><path d="M512 744V782"/>' : '<path d="M278 520Q292 618 372 696"/><path d="M746 520Q732 618 652 696"/><path d="M512 676V706"/>';
  const chad = head.chad ? `<g fill="none" stroke-width="7">${lines}</g>${stubble}` : '';
  return `<svg class="${cls}" viewBox="${box}" xmlns="http://www.w3.org/2000/svg" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round">`
    + `${back}${bands}${wrapBack}<g>${outfit.draw(look.jacket || '#d32626', k, body)}</g><path d="${head.d}" fill="${k}"${head.sharp ? ' stroke-linejoin="miter"' : ''}/>${chad}${front}${wrapFront}</svg>`;
}
