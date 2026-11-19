import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { useTheme, alpha, darken, lighten } from '@mui/material/styles';
import avatar from '../assets/login-avatar.png';

/*
 * Animated login intro (one CSS timeline, generated below):
 *   1. He walks in (profile) carrying a money box, sets it down and opens it.
 *   2. The login card springs out of the box and settles exactly in the centre.
 *   3. He hops back, turns to face the viewer, takes sunglasses out of his
 *      jacket and puts them on.
 *   4. Wide screens: he leans on the card — it slides away, he stumbles,
 *      recovers, the card glides back, and he steps back and leans on it again.
 *      That relaxed lean is his final pose.
 *      Narrow screens (no room beside the card): he watches from behind the
 *      card's top edge, side-steps behind it to its right corner, then does a
 *      standard jump (crouch, push off, knees up at the top of a clean arc,
 *      hands catching the ledge as he lands) and sits upright on that edge,
 *      legs hanging over the card's front, clear of every field and button,
 *      and waves.
 *   5. He mimes typing; afterwards he types along whenever the user types
 *      (one-handed while leaning, on his lap while sitting).
 *
 * No coins anywhere in this scene. Tap / any key skips straight to the final state.
 */

/* ------------------------------------------------------------------ */
/* Timeline (seconds)                                                  */
/* ------------------------------------------------------------------ */
const T = 7.8;
const WALK_END = 1.54; // walk-in ends (step count per variant, see VARIANTS)
const CROUCH = WALK_END + 0.32; // box touches the ground
const STAND = CROUCH + 0.26;
const LID_OPEN = 2.08;
const POP = 2.26; // card starts coming out
const TAKEOFF = 2.28;
const APEX = 2.5;
const LAND = 2.72;
const SWAP = LAND + 0.04; // profile rig → front rig ("turns to face you")
const SWAP_END = SWAP + 0.1;
const RISE = 2.98;
const G_REACH = 3.22; // hand into the inner pocket
const G_OUT = 3.48; // sunglasses out
const G_FACE = 3.78; // at the face
const G_ON = 3.86; // on
const G_DOWN = 4.1;
const LEAN = 4.45;
const LEAN_HOLD = 4.72;
const SLIDE = 4.72; // card slides away
const SLIDE_END = 4.98;
const FALL = 5.08;
const STUMBLE = 5.28;
const RECOVER = 5.6;
const CONFIDENT = 5.92;
const BACK = 5.5; // card glides back to the centre
const BACK_END = 6.05;
const STEP_BACK = 6.2; // wide: steps back to the card's edge…
const LEAN_AGAIN = 6.5; // …and leans on it again (final pose)
// narrow: shuffles behind the card to its corner, then a standard jump up onto its top edge
const READY = 4.18; // watching from behind the card…
const SHUFFLE_END = 4.84; // …side-steps behind it to below the corner (3 small steps)…
const DIP = 5.0; // …anticipation: crouches, arms back (held briefly)…
const PUSH = 5.16; // …take-off: fully stretched, leaves the ground…
const PEAK = 5.38; // …top of the arc, knees up: from here on he is in front of the card…
const SIT = 5.6; // …touches down sitting on the edge, hands catching the ledge…
const SETTLE = 5.8; // …and settles
const WAVE = 5.96;
const WAVE_END = 6.62;
const TYPE_IN = 6.72;
const TYPE_START = 6.9;
const TYPE_END = 7.35;
const IDLE = 7.65;
const FADE_IN = 0.18;

/*
 * halfSteps: steps taken during the walk-in.
 * enterFrom (narrow only): px from the centre to the screen edge he walks in
 * from. His stride is shortened to fit that distance, so the whole walk is on
 * screen, as on desktop, instead of mostly off it.
 * Narrow screens don't slide the card (he doesn't lean on it there).
 */
const VARIANTS = {
  side: { media: '(min-width: 860px)', height: 334, hop: 48, slide: 70, halfSteps: 7 },
  top: { media: '(min-width: 600px) and (max-width: 859.98px)', height: 210, hop: 30, slide: 0, halfSteps: 5, enterFrom: 200 },
  xs: { media: '(max-width: 599.98px)', height: 176, hop: 26, slide: 0, halfSteps: 5, enterFrom: 180 },
};
const SEAT_INSET = 16; // px between him and the card's right border when seated (clear of the rounded corner)
const SEAT_HEADROOM = 10; // px kept free above his head while seated on the card
const WALK_LEAD = 106; // SVG units from his left edge to the front of the carried box

/* ------------------------------------------------------------------ */
/* Skeletons (SVG user units, viewBox 0 0 140 230, ground at y = 226)  */
/* ------------------------------------------------------------------ */
const GROUND = 226;
const FEET = [70, GROUND];
const NECK = [70, 52];
const EDGE_Y = 100; // narrow screens: card's top edge sits at chest height
const HEAD_TOP = 19; // top of his head (HEAD_Y, defined with the artwork below)
const SEAT_LINE = 135; // seated: his seat, just above the jacket's hem, rests on the card's top edge
const SIT_THIGH = 0.45; // seated: thighs point at the viewer, foreshortened to this fraction

// profile rig
const HIP = [70, 124];
const KNEE = [70, 170];
const ANKLE = [70, 212];
const SHOULDER = [70, 64];
const ELBOW = [70, 96];
const HAND = [70, 127];
const THIGH = 46;
const SHIN = 42;

// front rig
const F_PELVIS = [70, 128];
const F_SH_L = [49.5, 64];
const F_SH_R = [90.5, 64];
const F_EL_L = [49.5, 96];
const F_EL_R = [90.5, 96];
const F_HIP_L = [61.5, 128];
const F_HIP_R = [78.5, 128];
const F_KNEE_L = [61.8, 172];
const F_KNEE_R = [78.2, 172];
const UPPER = 32; // shoulder → elbow
const FORE = 32; // elbow → hand centre

const CASE_W = 44;
const CASE_H = 40;

const JOINTS = {
  // profile rig
  root: FEET,
  body: HIP,
  head: NECK,
  aFu: SHOULDER,
  aFl: ELBOW,
  aBu: SHOULDER,
  aBl: ELBOW,
  lFt: HIP,
  lFs: KNEE,
  lFf: ANKLE,
  lBt: HIP,
  lBs: KNEE,
  lBf: ANKLE,
  // front rig
  fRoot: FEET,
  fBody: F_PELVIS,
  fHead: NECK,
  fLu: F_SH_L,
  fLl: F_EL_L,
  fRu: F_SH_R,
  fRl: F_EL_R,
  fLt: F_HIP_L,
  fLf: F_HIP_L, // thigh foreshortening (1 = full length; < 1 = pointing at the viewer)
  fLs: F_KNEE_L,
  fRt: F_HIP_R,
  fRf: F_HIP_R,
  fRs: F_KNEE_R,
};
const THIGH_F = F_KNEE_L[1] - F_HIP_L[1]; // front rig: hip → knee
const SCALE_JOINTS = ['fLf', 'fRf'];
const SIDE_JOINTS = Object.keys(JOINTS).filter((j) => !j.startsWith('f'));
const FRONT_JOINTS = Object.keys(JOINTS).filter((j) => j.startsWith('f'));
const GLASSES = ['gOn', 'gHand'];

/* ---- profile poses ---- */
const P = (o) => ({
  root: [0, 0, 0],
  body: 0,
  head: 0,
  aFu: -4,
  aFl: -8,
  aBu: 6,
  aBl: -8,
  lFt: -3,
  lFs: 2,
  lFf: 1,
  lBt: 4,
  lBs: 2,
  lBf: -6,
  ...o,
});

const POSES = {
  stand: P({}),
  crouch: P({
    root: [0, 44, 0], body: 40, head: 18,
    aFu: -60, aFl: -6, aBu: -6, aBl: -60,
    lFt: -78, lFs: 118, lFf: -40, lBt: -70, lBs: 112, lBf: -42,
  }),
  anticip: P({
    root: [0, 11, 0], body: 14, head: 8,
    aFu: 24, aFl: -24, aBu: 34, aBl: -24,
    lFt: -30, lFs: 56, lFf: -26, lBt: -26, lBs: 52, lBf: -26,
  }),
  surprise: P({
    root: [0, -6, -8], body: -8, head: -12,
    aFu: -135, aFl: -20, aBu: 125, aBl: 24,
    lFt: -42, lFs: 62, lFf: -12, lBt: 14, lBs: 66, lBf: -20,
  }),
  land: P({
    root: [0, 9, 0], body: 12, head: 4,
    aFu: -55, aFl: -30, aBu: 55, aBl: -20,
    lFt: -28, lFs: 52, lFf: -24, lBt: -24, lBs: 48, lBf: -24,
  }),
};

/* ---- front poses (L/R = viewer's left/right) ---- */
const FP = (o) => ({
  fRoot: [0, 0, 0],
  fBody: 0,
  fHead: 0,
  fLu: 4,
  fLl: -4,
  fLk: 1,
  fRu: -4,
  fRl: 4,
  fRk: 1,
  fLt: 1.5,
  fLf: 1,
  fLs: -1,
  fRt: -1.5,
  fRf: 1,
  fRs: 1,
  gOn: 0,
  gHand: 0,
  ...o,
});
const G = (o) => FP({ gOn: 1, ...o }); // sunglasses on

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const r2 = (n) => Math.round(n * 100) / 100;
const legExt = (t, s) => THIGH * Math.cos(rad(t)) + SHIN * Math.cos(rad(t + s));

// amp < 1 shortens the stride (narrow screens); the knees lift a little less too.
const walkPose = (phi, amp = 1) => {
  const a = 2 * Math.PI * phi;
  const s = Math.sin(a);
  const c = Math.cos(a);
  const lift = 34 * ((1 + amp) / 2);
  const lFt = -24 * amp * s;
  const lBt = 24 * amp * s;
  const lFs = 6 + lift * Math.max(0, c);
  const lBs = 6 + lift * Math.max(0, -c);
  // Keep the lowest foot planted on the ground.
  const y = THIGH + SHIN - Math.max(legExt(lFt, lFs), legExt(lBt, lBs));
  return P({
    root: [0, y, 0], body: 5, head: -3,
    aFu: -5 + 3 * s, aFl: -4, aBu: -24 * amp * s, aBl: -18,
    lFt, lFs, lFf: -(lFt + lFs) * 0.8,
    lBt, lBs, lBf: -(lBt + lBs) * 0.8,
  });
};

/* ---- kinematics ---- */
const rotAbout = ([x, y], [ox, oy], d) => {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  const dx = x - ox;
  const dy = y - oy;
  return [ox + dx * c - dy * s, oy + dx * s + dy * c];
};
const applyRoot = (p, [x, y, r]) => {
  const q = rotAbout(p, FEET, r);
  return [q[0] + x, q[1] + y];
};
const profileHand = (pose) => {
  let p = rotAbout(HAND, ELBOW, pose.aFl);
  p = rotAbout(p, SHOULDER, pose.aFu);
  p = rotAbout(p, HIP, pose.body);
  return applyRoot(p, pose.root);
};
const profileAnkle = (pose, side) => {
  let p = rotAbout(ANKLE, KNEE, pose[`l${side}s`]);
  p = rotAbout(p, HIP, pose[`l${side}t`]);
  return applyRoot(p, pose.root);
};
// Distance covered per half step (heel strike to heel strike).
const strideAt = (amp) => {
  const p = walkPose(0.25, amp);
  return profileAnkle(p, 'F')[0] - profileAnkle(p, 'B')[0];
};
// The stride amplitude that covers `dist` per half step (stride grows with amp).
const ampFor = (dist) => {
  let lo = 0.1;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (strideAt(mid) < dist) lo = mid;
    else hi = mid;
  }
  return Math.min(1, (lo + hi) / 2);
};
const frontRightElbow = (pose) => {
  let p = rotAbout(F_EL_R, F_SH_R, pose.fRu);
  p = rotAbout(p, F_PELVIS, pose.fBody);
  return applyRoot(p, pose.fRoot);
};
// rotation that maps the "hanging down" vector (0, 1) onto (vx, vy)
const dirAngle = (vx, vy) => deg(Math.atan2(-vx, vy));

/* Two-bone IK: place a front-rig hand at `target` (character space), elbow outward. */
const reach = (pose, side, target, k = 1) => {
  const [x, y, r] = pose.fRoot;
  let t = [target[0] - x, target[1] - y];
  t = rotAbout(t, FEET, -r);
  t = rotAbout(t, F_PELVIS, -pose.fBody);
  const S = side === 'L' ? F_SH_L : F_SH_R;
  const fore = FORE * k;
  const vx = t[0] - S[0];
  const vy = t[1] - S[1];
  const d = Math.min(Math.max(Math.hypot(vx, vy), Math.abs(UPPER - fore) + 0.01), UPPER + fore - 0.01);
  const a = deg(Math.acos((UPPER * UPPER + d * d - fore * fore) / (2 * UPPER * d)));
  const base = dirAngle(vx, vy);
  const elbowX = (u) => S[0] - UPPER * Math.sin(rad(u));
  // of the two solutions, keep the one with the elbow further out
  const [u1, u2] = [base + a, base - a];
  const u = side === 'L' ? (elbowX(u1) < elbowX(u2) ? u1 : u2) : elbowX(u1) > elbowX(u2) ? u1 : u2;
  const e = [elbowX(u), S[1] + UPPER * Math.cos(rad(u))];
  const f = dirAngle(t[0] - e[0], t[1] - e[1]);
  return { ...pose, [`f${side}u`]: u, [`f${side}l`]: f - u, [`f${side}k`]: k };
};

const STAND_F = FP({});
const LAND_F = FP({ fRoot: [0, 1.4, 0], fLu: 24, fLl: -14, fRu: -24, fRl: 14, fLt: 10, fLs: -16, fRt: -10, fRs: 16 });
const POCKET_F = reach(STAND_F, 'R', [79, 84]);
const OUT_F = { ...reach(STAND_F, 'R', [100, 90]), gHand: 1 };
const FACE_F = { ...reach(STAND_F, 'R', [81, 37]), gHand: 1 };
const ON_F = { ...FACE_F, gHand: 0, gOn: 1 };
const DOWN_F = G({ fHead: 3 });

const frontPoses = (key) => {
  if (key === 'side') {
    // elbow on the card's edge, ankles crossed, friendly head tilt
    const lean = G({
      fRoot: [0, 0, 7], fBody: -1, fHead: -5,
      fLu: 5, fLl: -6, fRu: -62, fRl: -112,
      fLt: -3, fLs: 0, fRt: 13, fRs: 8,
    });
    return {
      lean,
      fall: G({
        fRoot: [4, 0, 22], fBody: 2, fHead: -12,
        fLu: 125, fLl: 35, fRu: -115, fRl: -25,
        fLt: 4, fLs: 0, fRt: -12, fRs: 6,
      }),
      stumble: G({
        fRoot: [16, 3, 6], fHead: -5,
        fLu: 70, fLl: -20, fRu: -75, fRl: 20,
        fLt: 6, fLs: -4, fRt: -10, fRs: 4,
      }),
      recover: G({ fRoot: [16, 0, -3], fHead: 2, fLu: 35, fLl: -10, fRu: -35, fRl: 10, fLt: 2, fRt: -3 }),
      // confident: hand on hip
      idle: reach(G({ fRoot: [16, 0, 0], fRu: -5, fRl: 5, fLt: 2, fRt: -2 }), 'L', [55.5, 121]),
      // a step back toward the card (one foot off the ground) before leaning on it again
      step: G({ fRoot: [8, -2, 2], fHead: -2, fLu: 12, fLl: -8, fRu: -32, fRl: -40, fLt: 9, fLs: -15, fRt: 2, fRs: 0 }),
      // still leaning on the card; the free hand types along
      leanType: { ...lean, fHead: -2, fLu: 10, fLl: -58, fLk: 0.42 },
    };
  }
  // narrow screens: jump up onto the card's top edge and sit upright on it, like on a bench:
  // thighs toward the viewer, knees apart, shins hanging over the card's front, feet together
  const seat = (o = {}) => G({ fLf: SIT_THIGH, fRf: SIT_THIGH, fLt: 16, fLs: -25, fRt: -16, fRs: 25, ...o });
  const lap = 124; // hands resting on the thighs, by the hips
  const handsInLap = (pose) => reach(reach(pose, 'L', [57, lap]), 'R', [83, lap]);
  const waveA = reach(reach(seat({ fHead: -3 }), 'L', [57, lap]), 'R', [106, 100]);
  return {
    ready: G({ fHead: 3 }),
    // side-stepping behind the card: a small sway from foot to foot
    stepL: G({ fRoot: [0, 1, -2.5], fHead: 2, fLu: 8, fRu: -2 }),
    stepR: G({ fRoot: [0, 1, 2.5], fHead: -1, fLu: 2, fRu: -8 }),
    // a standard jump: anticipation (knees bent, hips down, arms back)…
    dip: G({ fRoot: [0, 16, 0], fHead: 6, fLu: 16, fLl: 6, fRu: -16, fRl: -6, fLt: 22, fLs: -40, fRt: -22, fRs: 40 }),
    // …take-off (body fully stretched, arms swung forward to shoulder height)…
    push: reach(reach(G({ fRoot: [0, -5, 0], fHead: -5, fLt: -1, fLs: 1, fRt: 1, fRs: -1 }), 'L', [57, 70], 0.6), 'R', [83, 70], 0.6),
    // …in the air (knees drawn up, arms out for balance)…
    tuck: G({ fRoot: [0, 18, 0], fHead: -2, fLu: 62, fLl: 24, fRu: -62, fRl: -24, fLf: 0.62, fRf: 0.62, fLt: 18, fLs: -36, fRt: -18, fRs: 36 }),
    // …touch-down on the edge: a soft bounce, hands catching the ledge beside his hips
    land: reach(reach(seat({ fRoot: [0, 4, 0], fHead: 6, fLs: -34, fRs: 34 }), 'L', [46, 127]), 'R', [94, 127]),
    sit: handsInLap(seat()),
    waveA,
    waveB: { ...waveA, fRl: waveA.fRl + 26 },
    // typing on his lap
    typing: seat({ fHead: 3, fLu: 10, fLl: -58, fLk: 0.42, fRu: -10, fRl: 58, fRk: 0.42 }),
  };
};

// Knees and soles of the front rig (character space): used to size the jump and the seat.
const frontLegPoints = (pose) =>
  ['L', 'R'].flatMap((side) => {
    const hip = side === 'L' ? F_HIP_L : F_HIP_R;
    const knee = side === 'L' ? F_KNEE_L : F_KNEE_R;
    const sole = [knee[0] + (side === 'L' ? -1.2 : 1.2), GROUND];
    const dy = -(1 - pose[`f${side}f`]) * THIGH_F; // a foreshortened thigh lifts the knee
    const shin = rotAbout(sole, knee, pose[`f${side}s`]);
    const k = rotAbout([knee[0], knee[1] + dy], hip, pose[`f${side}t`]);
    const f = rotAbout([shin[0], shin[1] + dy], hip, pose[`f${side}t`]);
    return [applyRoot(k, pose.fRoot), applyRoot(f, pose.fRoot)];
  });

/* ------------------------------------------------------------------ */
/* CSS generation                                                      */
/* ------------------------------------------------------------------ */
const pct = (t) => `${r2((Math.min(t, T) / T) * 100)}%`;
const keyframes = (name, stops) =>
  `@keyframes ${name}{${stops
    .map(({ t, css, ease }) => `${pct(t)}{${css}${ease ? `;animation-timing-function:${ease}` : ''}}`)
    .join('')}}`;

const jointCss = (name, pose) => {
  const v = pose[name];
  if (name === 'root' || name === 'fRoot') {
    return `transform:translate(${r2(v[0])}px,${r2(v[1])}px) rotate(${r2(v[2])}deg)`;
  }
  if (GLASSES.includes(name)) return `opacity:${r2(v)}`;
  if (name === 'fLl' || name === 'fRl') {
    return `transform:rotate(${r2(v)}deg) scaleY(${r2(pose[name === 'fLl' ? 'fLk' : 'fRk'])})`;
  }
  if (SCALE_JOINTS.includes(name)) return `transform:scaleY(${r2(v)})`;
  if (name === 'fLs' || name === 'fRs') {
    // the shin hangs from the knee at the end of the (possibly foreshortened) thigh
    const k = pose[name === 'fLs' ? 'fLf' : 'fRf'];
    return `transform:translateY(${r2(-(1 - k) * THIGH_F)}px) rotate(${r2(v)}deg)`;
  }
  return `transform:rotate(${r2(v)}deg)`;
};

const anim = (name, ease = 'linear') => `animation:${name} ${T}s ${ease} both`;

// Shift each angle by whole turns so consecutive frames take the short way round.
const unwrap = (prev, v) => {
  if (prev == null || typeof v !== 'number') return v;
  let a = v;
  while (a - prev > 180) a -= 360;
  while (a - prev < -180) a += 360;
  return a;
};
const ANGLE_KEYS = [...SIDE_JOINTS, ...FRONT_JOINTS].filter((j) => j !== 'root' && j !== 'fRoot' && !SCALE_JOINTS.includes(j));
const unwrapTo = (ref, pose) => {
  const out = { ...pose };
  for (const k of ANGLE_KEYS) if (k in out && ref && k in ref) out[k] = unwrap(ref[k], out[k]);
  return out;
};
const unwrapFrames = (frames) => {
  let prev = null;
  return frames.map((f) => {
    const pose = prev ? unwrapTo(prev, f.pose) : f.pose;
    prev = pose;
    return { ...f, pose };
  });
};

const channelKeyframes = (key, channels, frames) => {
  const last = frames[frames.length - 1].pose;
  let css = '';
  for (const j of channels) {
    const name = `lc-${key}-${j}`;
    css += keyframes(name, frames.map((f) => ({ t: f.t, css: jointCss(j, f.pose), ease: f.ease })));
    css += `.lc-j-${j}{${anim(name)};${jointCss(j, last)}}`;
  }
  return css;
};

function buildVariantCss(key) {
  const v = VARIANTS[key];
  const wide = key === 'side';
  const s = v.height / 230; // px per SVG unit
  const px = (n) => `${r2(n)}px`;
  const fp = frontPoses(key);

  // Where to stop so the box lands exactly at the card's horizontal centre.
  const stopX = -profileHand(POSES.crouch)[0] * s;

  // Walk distance that matches the stride, so the feet don't skate.
  const steps = v.halfSteps;
  const cycle = (2 * WALK_END) / steps; // one full walk cycle
  const amp = v.enterFrom ? ampFor((stopX + v.enterFrom + WALK_LEAD * s) / (steps * s)) : 1;
  const startX = stopX - strideAt(amp) * steps * s;

  // Spot after the hop: wide → right elbow on the card's left edge; narrow → centred behind the card.
  const leftAt = (x) => `calc(50% + ${px(x)})`;
  const finalLeft = wide ? px(-(frontRightElbow(fp.lean)[0] + 5.5) * s + 2) : leftAt(-70 * s);

  // Ground line: wide → card's bottom edge; narrow → inside the card, so he starts out behind it.
  const groundY = (GROUND - EDGE_Y) * s; // narrow: distance below the card's top edge
  const groundBottom = (lift) => (wide ? px(lift) : `calc(100% - ${px(groundY - lift)})`);
  const charBottom = groundBottom(-(230 - GROUND) * s);

  /* ---- profile rig ---- */
  const frames = [];
  const samples = steps * 4;
  for (let i = 0; i <= samples; i++) {
    const t = (WALK_END * i) / samples;
    frames.push({ t, pose: walkPose(t / cycle, amp), ease: i === samples ? 'ease-in-out' : 'linear' });
  }
  frames.push({ t: CROUCH, pose: POSES.crouch, ease: 'linear' });
  frames.push({ t: CROUCH + 0.06, pose: POSES.crouch, ease: 'ease-in-out' });
  frames.push({ t: STAND, pose: POSES.stand, ease: 'ease-in-out' });
  frames.push({ t: TAKEOFF - 0.02, pose: POSES.anticip, ease: 'ease-out' });
  frames.push({ t: APEX, pose: POSES.surprise, ease: 'ease-in' });
  frames.push({ t: LAND, pose: POSES.land });
  let css = channelKeyframes(key, SIDE_JOINTS, frames);

  /* ---- front rig ---- */
  const intro = [
    { t: 0, pose: LAND_F, ease: 'linear' },
    { t: SWAP, pose: LAND_F, ease: 'ease-out' },
    { t: RISE, pose: STAND_F, ease: 'ease-in-out' },
    { t: G_REACH, pose: POCKET_F, ease: 'ease-in-out' },
    { t: G_OUT, pose: OUT_F, ease: 'ease-in-out' },
    { t: G_FACE, pose: FACE_F, ease: 'linear' },
    { t: G_ON, pose: ON_F, ease: 'ease-in-out' },
    { t: G_DOWN, pose: DOWN_F, ease: 'ease-in-out' },
  ];
  const tail = wide
    ? [
        // leans on the card; it slides away; he stumbles and recovers…
        { t: LEAN, pose: fp.lean, ease: 'linear' },
        { t: LEAN_HOLD, pose: fp.lean, ease: 'ease-in' },
        { t: FALL, pose: fp.fall, ease: 'ease-out' },
        { t: STUMBLE, pose: fp.stumble, ease: 'ease-in-out' },
        { t: RECOVER, pose: fp.recover, ease: 'ease-in-out' },
        { t: CONFIDENT, pose: fp.idle, ease: 'ease-in-out' },
        // …then steps back to the returned card and leans on it again, for good
        { t: STEP_BACK, pose: fp.step, ease: 'ease-in-out' },
        { t: LEAN_AGAIN, pose: fp.lean, ease: 'linear' },
        { t: TYPE_IN, pose: fp.lean, ease: 'ease-in-out' },
        { t: TYPE_START, pose: fp.leanType, ease: 'linear' },
        { t: TYPE_END, pose: fp.leanType, ease: 'ease-in-out' },
        { t: IDLE, pose: fp.lean },
      ]
    : [
        // side-step behind the card to the corner, then a standard jump onto its edge, wave
        { t: READY, pose: fp.ready, ease: 'ease-in-out' },
        ...[0, 1, 2].map((i) => ({ t: READY + ((SHUFFLE_END - READY) * (i + 0.5)) / 3, pose: i % 2 ? fp.stepR : fp.stepL, ease: 'ease-in-out' })),
        { t: SHUFFLE_END, pose: fp.ready, ease: 'ease-in-out' },
        { t: DIP, pose: fp.dip, ease: 'linear' },
        { t: DIP + 0.06, pose: fp.dip, ease: 'cubic-bezier(.3,0,.2,1)' }, // a beat at the bottom, then a quick push
        { t: PUSH, pose: fp.push, ease: 'ease-out' },
        { t: PEAK, pose: fp.tuck, ease: 'ease-in-out' },
        { t: SIT, pose: fp.land, ease: 'ease-out' },
        { t: SETTLE, pose: fp.sit, ease: 'ease-in-out' },
        { t: WAVE, pose: fp.waveA, ease: 'ease-in-out' },
        { t: WAVE + 0.16, pose: fp.waveB, ease: 'ease-in-out' },
        { t: WAVE + 0.32, pose: fp.waveA, ease: 'ease-in-out' },
        { t: WAVE + 0.48, pose: fp.waveB, ease: 'ease-in-out' },
        { t: WAVE_END, pose: fp.sit, ease: 'linear' },
        { t: TYPE_IN, pose: fp.sit, ease: 'ease-in-out' },
        { t: TYPE_START, pose: fp.typing, ease: 'linear' },
        { t: TYPE_END, pose: fp.typing, ease: 'ease-in-out' },
        { t: IDLE, pose: fp.sit },
      ];
  const fFrames = unwrapFrames([...intro, ...tail]);
  css += channelKeyframes(key, [...FRONT_JOINTS, ...GLASSES], fFrames);

  // After the intro, typing in the form makes him type too (CSS transitions, see .lc-done).
  const idleFinal = fFrames[fFrames.length - 1].pose;
  const typingPose = unwrapTo(idleFinal, wide ? fp.leanType : fp.typing);
  css += FRONT_JOINTS.map((j) => `.lc-done.lc-typing .lc-j-${j}{${jointCss(j, typingPose)}}`).join('');
  // leaning on the card: only his free (left) hand types
  if (wide) css += '.lc-tapR,.lc-done.lc-typing .lc-tapR{animation:none}';

  /* ---- character position, hop, shadow ---- */
  const walkX = (t) => startX + (stopX - startX) * Math.min(1, t / WALK_END);
  const charStops = [
    { t: 0, css: `left:${leftAt(startX)};opacity:0`, ease: 'linear' },
    { t: FADE_IN, css: `left:${leftAt(walkX(FADE_IN))};opacity:1`, ease: 'linear' },
    { t: WALK_END, css: `left:${leftAt(stopX)};opacity:1`, ease: 'linear' },
    { t: TAKEOFF, css: `left:${leftAt(stopX)};opacity:1`, ease: 'linear' },
    { t: LAND, css: `left:${finalLeft};opacity:1` },
  ];
  const hopStops = [
    { t: 0, css: 'transform:translateY(0)', ease: 'linear' },
    { t: TAKEOFF, css: 'transform:translateY(0)', ease: 'cubic-bezier(.2,.7,.4,1)' },
    { t: APEX, css: `transform:translateY(${px(-v.hop * s)})`, ease: 'cubic-bezier(.6,0,.8,.3)' },
    { t: LAND, css: 'transform:translateY(0)' },
  ];
  const shadowStops = [
    { t: 0, css: 'transform:translateX(0) scale(1);opacity:1', ease: 'linear' },
    { t: TAKEOFF, css: 'transform:translateX(0) scale(1);opacity:1', ease: 'ease-out' },
    { t: APEX, css: 'transform:translateX(0) scale(.5);opacity:.45', ease: 'ease-in' },
    { t: LAND, css: 'transform:translateX(0) scale(1);opacity:1', ease: 'linear' },
  ];
  let shadowEnd;
  if (wide) {
    // follows his feet: a step forward as he stumbles, a step back as he leans again
    const stepX = px(16 * s);
    shadowStops.push(
      { t: FALL, css: 'transform:translateX(0) scale(1);opacity:1', ease: 'ease-in-out' },
      { t: STUMBLE, css: `transform:translateX(${stepX}) scale(1);opacity:1`, ease: 'linear' },
      { t: CONFIDENT, css: `transform:translateX(${stepX}) scale(1);opacity:1`, ease: 'ease-in-out' },
      { t: LEAN_AGAIN, css: 'transform:translateX(0) scale(1);opacity:1' },
    );
    shadowEnd = 'transform:translateX(0) scale(1);opacity:1';
  } else {
    // The seat: upright on the card's top edge, SEAT_INSET in from its right border
    // (measured from his right elbow), legs hanging over the card's front.
    const seatRight = frontRightElbow(fp.sit)[0] + 7;
    const seatLeft = `calc(100% - ${px(seatRight * s + SEAT_INSET)})`;
    const seatBottom = `calc(100% - ${px((230 - SEAT_LINE) * s)})`;
    // Seated, he sticks out above the card: reserve that space so he is never clipped.
    const headroom = (SEAT_LINE - HEAD_TOP) * s + SEAT_HEADROOM;
    css += `.lc-stage{margin-top:${px(headroom)}}`;
    // A jump just high enough for his tucked feet to clear the card's top edge at PEAK.
    const lowest = Math.max(...frontLegPoints(fp.tuck).map((pt) => pt[1])) + 6;
    const jump = groundY + (lowest - GROUND) * s + 8;
    // First he side-steps behind the card to right below the seat, so the jump itself is a
    // clean, nearly vertical arc (no long sideways leap).
    charStops.push(
      { t: READY, css: `left:${finalLeft};bottom:${charBottom};opacity:1`, ease: 'cubic-bezier(.45,0,.55,1)' },
      { t: SHUFFLE_END, css: `left:${seatLeft};bottom:${charBottom};opacity:1`, ease: 'linear' },
      { t: PEAK, css: `left:${seatLeft};bottom:${charBottom};opacity:1`, ease: 'linear' },
      { t: SIT, css: `left:${seatLeft};bottom:${seatBottom};opacity:1` },
      { t: T, css: `left:${seatLeft};bottom:${seatBottom};opacity:1` },
    );
    // a small bob per side-step, then the arc: rising fast and slowing to the top (ease-out),
    // falling slowly then faster onto the edge (ease-in)
    const bob = px(-3 * s);
    const stepT = (SHUFFLE_END - READY) / 3;
    hopStops.push({ t: READY, css: 'transform:translateY(0)', ease: 'ease-out' });
    for (let i = 0; i < 3; i++) {
      hopStops.push(
        { t: READY + stepT * (i + 0.5), css: `transform:translateY(${bob})`, ease: 'ease-in' },
        { t: READY + stepT * (i + 1), css: 'transform:translateY(0)', ease: 'linear' },
      );
    }
    hopStops.push(
      { t: PUSH - 0.04, css: 'transform:translateY(0)', ease: 'cubic-bezier(.22,.61,.36,1)' },
      { t: PEAK, css: `transform:translateY(${px(-jump)})`, ease: 'cubic-bezier(.55,.06,.68,.19)' },
      { t: SIT, css: 'transform:translateY(0)' },
    );
    // no floor under his dangling feet: the shadow goes as he leaves the ground
    shadowEnd = 'transform:translateX(0) scale(.6);opacity:0';
    shadowStops.push(
      { t: PUSH - 0.04, css: 'transform:translateX(0) scale(1);opacity:1', ease: 'ease-out' },
      { t: PUSH + 0.08, css: shadowEnd },
    );
  }
  shadowStops.push({ t: T, css: shadowEnd });
  css += keyframes(`lc-${key}-char`, charStops);
  css += keyframes(`lc-${key}-hop`, hopStops);
  css += keyframes(`lc-${key}-shadow`, shadowStops);

  css += `.lc-char{width:${px(140 * s)};height:${px(230 * s)};bottom:${charBottom};left:${finalLeft};${anim(`lc-${key}-char`)}}`;
  css += `.lc-hop{${anim(`lc-${key}-hop`)}}`;
  css += `.lc-shadow{width:${px(60 * s)};height:${px(11 * s)};left:${px(40 * s)};bottom:${px(-2 * s)};${shadowEnd};${anim(`lc-${key}-shadow`)}}`;

  /* ---- money box: carried in lock-step with the hand, then set down ---- */
  const caseStops = [];
  for (let i = 0; i <= samples; i++) {
    const t = (WALK_END * i) / samples;
    const [hx, hy] = profileHand(walkPose(t / cycle, amp));
    const lift = (hy - 4 + CASE_H - GROUND) * s;
    caseStops.push({
      t,
      css: `left:${leftAt(walkX(t) + (hx - CASE_W / 2) * s)};transform:translateY(${px(lift)}) scale(1);opacity:${r2(Math.min(1, t / FADE_IN))}`,
      ease: i === samples ? 'ease-in-out' : 'linear',
    });
  }
  const caseRest = `left:${leftAt((-CASE_W / 2) * s)}`;
  caseStops.push({ t: CROUCH, css: `${caseRest};transform:translateY(0) scale(1);opacity:1`, ease: 'linear' });
  caseStops.push({ t: LAND + 0.08, css: `${caseRest};transform:translateY(0) scale(1);opacity:1`, ease: 'ease-in' });
  caseStops.push({ t: LAND + 0.34, css: `${caseRest};transform:translateY(0) scale(.5);opacity:0` });
  css += keyframes(`lc-${key}-case`, caseStops);
  css += `.lc-case{width:${px(CASE_W * s)};height:${px(CASE_H * s)};bottom:${groundBottom(0)};${caseRest};transform:scale(.5);opacity:0;${anim(`lc-${key}-case`)}}`;

  /* ---- glow out of the box ---- */
  const mouth = 24 * s;
  css += `.lc-glow{bottom:${groundBottom(mouth - 110)}}`;

  /* ---- the card: springs out of the box, settles centred (wide: slides away and back) ---- */
  const cardFrom = wide
    ? `translateY(calc(50% - ${px(mouth)})) scale(.02)`
    : `translateY(calc(${px(groundY - mouth)} - 50%)) scale(.02)`;
  const cardOver = wide ? 'translateY(-1.5%) scale(1.035)' : 'translateY(1.5%) scale(1.035)';
  const slid = `translateX(${px(v.slide)})`;
  css += keyframes(`lc-${key}-card`, [
    { t: 0, css: `transform:${cardFrom};opacity:0`, ease: 'linear' },
    { t: POP, css: `transform:${cardFrom};opacity:0`, ease: 'cubic-bezier(.2,.75,.3,1)' },
    { t: POP + 0.1, css: 'opacity:1' },
    { t: POP + 0.46, css: `transform:${cardOver};opacity:1`, ease: 'ease-in-out' },
    { t: POP + 0.68, css: 'transform:translateX(0);opacity:1', ease: 'linear' },
    { t: SLIDE, css: 'transform:translateX(0);opacity:1', ease: 'cubic-bezier(.3,0,.2,1)' },
    { t: SLIDE_END, css: `transform:${slid};opacity:1`, ease: 'linear' },
    { t: BACK, css: `transform:${slid};opacity:1`, ease: 'cubic-bezier(.45,0,.25,1)' },
    { t: BACK_END, css: 'transform:translateX(0);opacity:1' },
  ]);
  css += `.lc-card{${anim(`lc-${key}-card`)}}`;

  /* ---- narrow layering: behind the card until he clears its top edge mid-jump, then in front ---- */
  if (!wide) {
    // The card is translucent, so while he is behind it he is also clipped at its top edge.
    const open = 'inset(-300px -300px -300px -300px)';
    const clipped = `inset(-300px -300px ${px((230 - EDGE_Y) * s)} -300px)`;
    css += keyframes(`lc-${key}-clip`, [
      { t: 0, css: `clip-path:${open};z-index:2`, ease: 'linear' },
      { t: POP + 0.3, css: `clip-path:${open};z-index:2`, ease: 'ease-in' },
      { t: POP + 0.5, css: `clip-path:${clipped};z-index:2`, ease: 'linear' },
      { t: PEAK - 0.02, css: `clip-path:${clipped};z-index:2`, ease: 'linear' },
      { t: PEAK, css: `clip-path:${open};z-index:7`, ease: 'linear' },
      { t: T, css: `clip-path:${open};z-index:7` },
    ]);
    css += `.lc-char{z-index:7;clip-path:${open};animation:lc-${key}-char ${T}s linear both,lc-${key}-clip ${T}s linear both}`;
    css += '.lc-case{z-index:2}';
  }

  return `@media ${v.media}{${css}}`;
}

function buildCss() {
  const origin = Object.entries(JOINTS)
    .map(([j, [x, y]]) => `.lc-j-${j}{transform-origin:${x}px ${y}px}`)
    .join('');

  // finger taps while typing (intro) — alternating hands
  const taps = (phase) => {
    const stops = [
      { t: 0, css: 'transform:translateY(0)', ease: 'linear' },
      { t: TYPE_START, css: 'transform:translateY(0)', ease: 'ease-in-out' },
    ];
    for (let i = 0, t = TYPE_START + 0.1; t < TYPE_END - 0.05; i++, t += 0.1) {
      stops.push({ t, css: `transform:translateY(${(i + phase) % 2 ? 0 : -4}px)`, ease: 'ease-in-out' });
    }
    stops.push({ t: TYPE_END, css: 'transform:translateY(0)' });
    return stops;
  };

  const common = `
.lc-stage{position:relative;width:100%;max-width:410px;margin-left:auto;margin-right:auto}
.lc-card{position:relative;z-index:3;transform-origin:50% 50%}
.lc-char{position:absolute;z-index:5;pointer-events:none}
.lc-hop{position:absolute;inset:0}
.lc-hop svg,.lc-case svg{display:block;width:100%;height:100%;overflow:visible}
.lc-shadow{position:absolute;border-radius:50%;transform-origin:50% 50%}
.lc-case{position:absolute;z-index:6;transform-origin:50% 100%;pointer-events:none}
.lc-glow{position:absolute;z-index:1;left:50%;width:220px;height:220px;margin-left:-110px;border-radius:50%;pointer-events:none;opacity:0;animation:lc-glow ${T}s linear both}
.lc-j,.lc-idle{transform-box:view-box}
.lc-lid{transform-box:view-box;transform-origin:3px 15px;transform:rotate(-34deg);animation:lc-lid ${T}s linear both}
.lc-rig-side{opacity:0;animation:lc-rigSide ${T}s linear both}
.lc-rig-front{animation:lc-rigFront ${T}s linear both}
.lc-tapL{animation:lc-tapL ${T}s linear both}
.lc-tapR{animation:lc-tapR ${T}s linear both}
${origin}
${keyframes('lc-rigSide', [
  { t: 0, css: 'opacity:1', ease: 'linear' },
  { t: SWAP, css: 'opacity:1', ease: 'linear' },
  { t: SWAP_END, css: 'opacity:0' },
])}
${keyframes('lc-rigFront', [
  { t: 0, css: 'opacity:0', ease: 'linear' },
  { t: SWAP, css: 'opacity:0', ease: 'linear' },
  { t: SWAP_END, css: 'opacity:1' },
])}
${keyframes('lc-glow', [
  { t: 0, css: 'transform:scale(.2);opacity:0', ease: 'linear' },
  { t: LID_OPEN, css: 'transform:scale(.2);opacity:0', ease: 'ease-out' },
  { t: POP + 0.06, css: 'transform:scale(1);opacity:.95', ease: 'ease-in' },
  { t: POP + 0.55, css: 'transform:scale(2.4);opacity:0' },
])}
${keyframes('lc-lid', [
  { t: 0, css: 'transform:rotate(0)', ease: 'linear' },
  { t: LID_OPEN, css: 'transform:rotate(0)', ease: 'cubic-bezier(.3,1.7,.5,1)' },
  { t: LID_OPEN + 0.22, css: 'transform:rotate(-34deg)' },
])}
${keyframes('lc-tapL', taps(0))}
${keyframes('lc-tapR', taps(1))}
.lc-nod{transform-origin:${NECK[0]}px ${NECK[1]}px;animation:lc-nod 2.8s ease-in-out ${T}s infinite alternate both}
@keyframes lc-nod{from{transform:rotate(-2deg)}to{transform:rotate(2deg)}}
.lc-breathe{animation:lc-breathe 1.9s ease-in-out ${T}s infinite alternate both}
@keyframes lc-breathe{from{transform:translateY(0)}to{transform:translateY(-1px)}}
.lc-done .lc-rig-front .lc-j{animation:none!important;transition:transform .32s cubic-bezier(.3,.7,.3,1)}
.lc-done .lc-tapL,.lc-done .lc-tapR{animation:none}
.lc-done.lc-typing .lc-tapL{animation:lc-tap .2s ease-in-out infinite alternate}
.lc-done.lc-typing .lc-tapR{animation:lc-tap .2s ease-in-out -.1s infinite alternate}
@keyframes lc-tap{from{transform:translateY(0)}to{transform:translateY(-4px)}}
`;

  const skip = `
.lc-skip .lc-i{animation-delay:-${T + 5}s !important}
.lc-skip .lc-idle{animation-delay:0s !important}
`;

  return common + Object.keys(VARIANTS).map(buildVariantCss).join('') + skip;
}

const SCENE_CSS = buildCss();

/* ------------------------------------------------------------------ */
/* Artwork                                                             */
/* ------------------------------------------------------------------ */
const getColors = (theme) => {
  const { primary } = theme.palette;
  const isDark = theme.palette.mode === 'dark';
  return {
    // charcoal-slate suit, light enough to read on the black themes
    suitLight: '#68748A',
    suit: '#4B5568',
    suitShade: '#424B5D',
    suitDark: '#333A47',
    suitBack: '#343B48',
    lapel: '#2E3440',
    lapelEdge: '#5D687C',
    pantsLight: '#525C6F',
    pants: '#424B5C',
    pantsDeep: '#30363F',
    pantsBack: '#2D333E',
    crease: 'rgba(255,255,255,0.09)',
    shirt: '#FFFFFF',
    collarLine: '#D1D5DB',
    tie: primary.main,
    tieDark: darken(primary.main, 0.3),
    pocket: lighten(primary.main, 0.25),
    // sampled from the photo so neck + hands match the face
    skin: '#D8956C',
    skinShade: '#B7744F',
    neck: '#C4825A',
    neckShade: '#9E6240',
    shoe: '#6B3F22',
    shoeBack: '#55311A',
    shoeShine: '#94603A',
    sole: '#24160D',
    // money box in the brand green with gold trim
    boxLight: darken(primary.main, 0.25),
    box: darken(primary.main, 0.45),
    boxDark: darken(primary.main, 0.62),
    gold: '#E7B53C',
    goldDark: '#B98A1E',
    lensTint: alpha(primary.main, 0.55),
    rim: isDark ? 'drop-shadow(0 0 1.2px rgba(255,255,255,0.4))' : 'none',
    shadow: isDark ? alpha(primary.main, 0.28) : 'rgba(0,0,0,0.16)',
    glow: primary.light || primary.main,
    glowMid: primary.main,
  };
};

const n = (v) => Math.round(v * 100) / 100;

/* Photo head, shared by both rigs. Realistic proportions: head ≈ 1/6 of height. */
const HEAD_H = 34;
const HEAD_W = (HEAD_H * 136) / 176; // keeps the photo's aspect ratio
const HEAD_X = 58.4; // face (not hair) centred over the neck
const HEAD_Y = 53 - HEAD_H;
const EYE_Y = HEAD_Y + (86.2 / 176) * HEAD_H;
const EYE_L = HEAD_X + (35 / 136) * HEAD_W;
const EYE_R = HEAD_X + (81 / 136) * HEAD_W;

const lens = (cx, cy) => {
  const w = 6.3;
  const h = 4.3;
  return (
    `M${n(cx - w / 2)} ${n(cy - h / 2)}H${n(cx + w / 2)}` +
    `C${n(cx + w / 2 + 0.2)} ${n(cy + 0.4)} ${n(cx + w / 2 - 0.7)} ${n(cy + h / 2)} ${n(cx + 1)} ${n(cy + h / 2)}` +
    `H${n(cx - 1)}C${n(cx - w / 2 + 0.7)} ${n(cy + h / 2)} ${n(cx - w / 2 - 0.2)} ${n(cy + 0.4)} ${n(cx - w / 2)} ${n(cy - h / 2)}Z`
  );
};

const Sunglasses = () => (
  <g className="lc-j-gOn lc-i">
    <path
      d={`M${n(EYE_L - 3.2)} ${n(EYE_Y - 1.6)}L${n(HEAD_X + 0.9)} ${n(EYE_Y - 0.9)}M${n(EYE_R + 3.2)} ${n(EYE_Y - 1.6)}L${n(HEAD_X + HEAD_W - 2.4)} ${n(EYE_Y - 0.9)}`}
      stroke="#0B0B0D"
      strokeWidth="0.9"
      strokeLinecap="round"
    />
    <path d={lens(EYE_L, EYE_Y)} fill="url(#lcLens)" stroke="#0B0B0D" strokeWidth="0.6" />
    <path d={lens(EYE_R, EYE_Y)} fill="url(#lcLens)" stroke="#0B0B0D" strokeWidth="0.6" />
    <path
      d={`M${n(EYE_L + 3.1)} ${n(EYE_Y - 1.5)}Q${n((EYE_L + EYE_R) / 2)} ${n(EYE_Y - 2.6)} ${n(EYE_R - 3.1)} ${n(EYE_Y - 1.5)}`}
      stroke="#0B0B0D"
      strokeWidth="0.8"
      fill="none"
    />
    {/* reflections */}
    <path
      d={`M${n(EYE_L - 2)} ${n(EYE_Y + 0.6)}l2.4-2.2M${n(EYE_R - 2)} ${n(EYE_Y + 0.6)}l2.4-2.2`}
      stroke="#FFFFFF"
      strokeWidth="0.55"
      strokeLinecap="round"
      opacity="0.55"
    />
  </g>
);

const Head = ({ glasses = false }) => (
  <g className="lc-idle lc-nod">
    <image href={avatar} x={HEAD_X} y={HEAD_Y} width={HEAD_W} height={HEAD_H} preserveAspectRatio="xMidYMid meet" />
    {glasses && <Sunglasses />}
  </g>
);

/* A hand hanging from the wrist at (x, 122); thumb on the `thumb` side (+1 right, -1 left). */
const Hand = ({ x, thumb, c }) => (
  <g>
    <path
      d={`M${n(x - 4)} 122.6C${n(x - 4.6)} 127 ${n(x - 4.3)} 131 ${n(x - 2.6)} 133.6C${n(x - 1.1)} 135.6 ${n(x + 1.4)} 135.6 ${n(x + 2.9)} 133.6C${n(x + 4.4)} 131.4 ${n(x + 4.6)} 127 ${n(x + 4)} 122.6Z`}
      fill={c.skin}
    />
    <path
      d={`M${n(x + 3.6 * thumb)} 124.4C${n(x + 6.2 * thumb)} 125.4 ${n(x + 7 * thumb)} 128.2 ${n(x + 5.9 * thumb)} 130C${n(x + 5.1 * thumb)} 131 ${n(x + 4 * thumb)} 130.4 ${n(x + 4 * thumb)} 129.2Z`}
      fill={c.skin}
    />
    <path
      d={`M${n(x - 1.6)} 131.2v2.4M${n(x + 0.9)} 131.6v2.3`}
      stroke={c.skinShade}
      strokeWidth="0.5"
      strokeLinecap="round"
      opacity="0.7"
    />
  </g>
);

/* Folded sunglasses held in the hand. */
const HeldGlasses = ({ x }) => (
  <g className="lc-j-gHand lc-i">
    <path d={lens(x - 3.4, 130.5)} fill="#121418" stroke="#050506" strokeWidth="0.5" />
    <path d={lens(x + 3.4, 130.5)} fill="#121418" stroke="#050506" strokeWidth="0.5" />
    <path d={`M${n(x - 0.3)} 129h0.6`} stroke="#050506" strokeWidth="0.8" />
  </g>
);

/* Tapered sleeve: shoulder at (x, 64), elbow at (x, 96), wrist at (x, 121). */
const Sleeve = ({ x, fill, upperClass, lowerClass, thumb, tap, holds, c }) => (
  <g className={upperClass}>
    <path
      d={`M${n(x - 6)} 63C${n(x - 6)} 59 ${n(x - 3.2)} 57.5 ${x} 57.5C${n(x + 3.2)} 57.5 ${n(x + 6)} 59 ${n(x + 6)} 63L${n(x + 5.1)} 97H${n(x - 5.1)}Z`}
      fill={fill}
    />
    <g className={lowerClass}>
      <circle cx={x} cy="96" r="5.1" fill={fill} />
      <path d={`M${n(x - 5.1)} 96H${n(x + 5.1)}L${n(x + 4.1)} 121H${n(x - 4.1)}Z`} fill={fill} />
      <g className={tap}>
        <path d={`M${n(x - 4.3)} 119.6H${n(x + 4.3)}V123H${n(x - 4.3)}Z`} fill={c.shirt} />
        <Hand x={x} thumb={thumb} c={c} />
        {holds && <HeldGlasses x={x} />}
      </g>
    </g>
  </g>
);

/* ---------------- profile rig (walk / crouch / hop) ---------------- */
const ProfileLeg = ({ side, c }) => {
  const pants = side === 'F' ? c.pants : c.pantsBack;
  const shoe = side === 'F' ? c.shoe : c.shoeBack;
  return (
    <g className={`lc-j lc-i lc-j-l${side}t`}>
      <path d="M62 122C62 119 65.5 117.5 70 117.5S78 119 78 122L76.3 171H63.7Z" fill={pants} />
      <g className={`lc-j lc-i lc-j-l${side}s`}>
        <g className={`lc-j lc-i lc-j-l${side}f`}>
          <path
            d="M61 214h12c6.5 0 13 3 15.5 8.5v1c0 1.4-1.1 2.5-2.5 2.5H61c-1.4 0-2.5-1.1-2.5-2.5V217c0-1.6 1.2-3 2.5-3z"
            fill={shoe}
          />
          <path d="M58.5 223.5h30v.5c0 1.2-1.1 2-2.5 2H61c-1.4 0-2.5-.8-2.5-2z" fill={c.sole} />
          <path d="M76 216.8q6 1 10 5" stroke={c.shoeShine} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
        <circle cx="70" cy="170" r="6.3" fill={pants} />
        <path d="M63.7 170H76.3L75.4 207L76.2 212.6H63.8L64.6 207Z" fill={pants} />
      </g>
    </g>
  );
};

const ProfileTorso = ({ c }) => (
  <>
    <rect x="66" y="46" width="8" height="14" rx="3" fill={c.neck} />
    <path
      d="M50 68c0-8 6-12 14-12h12c8 0 14 4 14 12l-2.5 42 1 18c0 4-3 7-7 7H58.5c-4 0-7-3-7-7l1-18z"
      fill="url(#lcSuit)"
    />
    <path d="M63 56h14l-7 25z" fill={c.shirt} />
    <path d="M62.6 55.2 70 60.6l-3.9 4.6z" fill={c.shirt} stroke={c.collarLine} strokeWidth="0.5" />
    <path d="M77.4 55.2 70 60.6l3.9 4.6z" fill={c.shirt} stroke={c.collarLine} strokeWidth="0.5" />
    <path d="M68.1 59.6h3.8l-.7 3.3h-2.4z" fill={c.tieDark} />
    <path d="M68.6 62.9h2.8l1.7 15.4-3.1 3.6-3.1-3.6z" fill={c.tie} />
    <path d="M63 56l7 25-10.6-12.6 2.8-4.8-2-2.6z" fill={c.lapel} />
    <path d="M77 56l-7 25 10.6-12.6-2.8-4.8 2-2.6z" fill={c.lapel} />
    <path d="M70.4 81v53" stroke={c.lapel} strokeWidth="0.9" />
    <circle cx="72.4" cy="91" r="1.4" fill={c.lapel} />
    <circle cx="72.4" cy="102" r="1.4" fill={c.lapel} />
    <path d="M79 76l1.8-3.4 1.6 2.2 1.6-2.6 1.2 3.8z" fill={c.pocket} />
    <path d="M78.4 76.3h8M78 113h8" stroke={c.lapel} strokeWidth="1.2" strokeLinecap="round" />
  </>
);

const ProfileRig = ({ c }) => (
  <g className="lc-rig-side lc-i">
    <g className="lc-j lc-i lc-j-root">
      <g className="lc-j lc-i lc-j-body">
        <Sleeve x={70} fill={c.suitBack} upperClass="lc-j lc-i lc-j-aBu" lowerClass="lc-j lc-i lc-j-aBl" thumb={1} c={c} />
      </g>
      <ProfileLeg side="B" c={c} />
      <ProfileLeg side="F" c={c} />
      <g className="lc-j lc-i lc-j-body">
        <ProfileTorso c={c} />
        <g className="lc-j lc-i lc-j-head">
          <Head />
        </g>
        <Sleeve x={70} fill={c.suit} upperClass="lc-j lc-i lc-j-aFu" lowerClass="lc-j lc-i lc-j-aFl" thumb={1} c={c} />
      </g>
    </g>
  </g>
);

/* ---------------- front rig (facing the viewer) ---------------- */
const shoeFront = (cx, top, bottom) => {
  const mid = top + (bottom - top) * 0.3;
  return (
    `M${n(cx - 6.5)} ${n(mid)}C${n(cx - 6.5)} ${n(top + 1.5)} ${n(cx - 4)} ${top} ${n(cx)} ${top}` +
    `C${n(cx + 4)} ${top} ${n(cx + 6.5)} ${n(top + 1.5)} ${n(cx + 6.5)} ${n(mid)}` +
    `L${n(cx + 7.3)} ${n(bottom - 3.5)}C${n(cx + 7.4)} ${n(bottom - 1.4)} ${n(cx + 6)} ${bottom} ${n(cx + 4)} ${bottom}` +
    `H${n(cx - 4)}C${n(cx - 6)} ${bottom} ${n(cx - 7.4)} ${n(bottom - 1.4)} ${n(cx - 7.3)} ${n(bottom - 3.5)}Z`
  );
};
const soleFront = (cx, bottom) =>
  `M${n(cx - 7.4)} ${n(bottom - 2)}H${n(cx + 7.4)}C${n(cx + 7.2)} ${n(bottom - 0.7)} ${n(cx + 6)} ${bottom} ${n(cx + 4)} ${bottom}` +
  `H${n(cx - 4)}C${n(cx - 6)} ${bottom} ${n(cx - 7.2)} ${n(bottom - 0.7)} ${n(cx - 7.4)} ${n(bottom - 2)}Z`;

const FrontLeg = ({ side, c }) => {
  const [hx] = side === 'L' ? F_HIP_L : F_HIP_R;
  const [kx] = side === 'L' ? F_KNEE_L : F_KNEE_R;
  const toe = kx + (side === 'L' ? -1.2 : 1.2); // feet turned slightly out
  return (
    <g className={`lc-j lc-i lc-j-f${side}t`}>
      {/* shin first: the thigh overlaps its top, so a foreshortened (seated) thigh still shows the knee */}
      <g className={`lc-j lc-i lc-j-f${side}s`}>
        <path d={shoeFront(toe, 209.5, 226)} fill={c.shoe} />
        <path d={soleFront(toe, 226)} fill={c.sole} />
        <path d={`M${n(toe - 3.4)} 214q2.6-2.4 6-.8`} stroke={c.shoeShine} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path
          d={`M${n(kx - 6.3)} 168H${n(kx + 6.3)}L${n(kx + 5.5)} 207L${n(kx + 6.4)} 213H${n(kx - 6.4)}L${n(kx - 5.5)} 207Z`}
          fill="url(#lcPants)"
        />
        <path d={`M${kx} 172V212`} stroke={c.crease} strokeWidth="0.7" />
      </g>
      <g className={`lc-j lc-i lc-j-f${side}f`}>
        <path d={`M${n(hx - 8.5)} 122H${n(hx + 8.5)}L${n(kx + 6.3)} 173H${n(kx - 6.3)}Z`} fill="url(#lcPants)" />
        <path d={`M${hx} 138L${kx} 172`} stroke={c.crease} strokeWidth="0.7" />
      </g>
    </g>
  );
};

const FrontTorso = ({ c }) => (
  <>
    <rect x="65.5" y="45" width="9" height="14" rx="3" fill={c.neck} />
    {/* shirt and waistband peeking through the jacket opening */}
    <path d="M59 55H81V131H59Z" fill={c.shirt} />
    <path d="M56 125H84V135H56Z" fill={c.pantsDeep} />
    {/* tailored jacket: shoulders, nipped waist, cut-away front below the button */}
    <path
      d="M62 55L52 58.5C48 60 46.5 63 46.5 67L47.5 90C48 98 51.5 106 52 112C52.5 119 50.5 126 51 131L51.5 136C57 137.5 63 137.8 67.5 137.5L69.5 104.5H70.5L72.5 137.5C77 137.8 83 137.5 88.5 136L89 131C89.5 126 87.5 119 88 112C88.5 106 92 98 92.5 90L93.5 67C93.5 63 92 60 88 58.5L78 55L70 103Z"
      fill="url(#lcSuitF)"
    />
    {/* collar and tie */}
    <path d="M63.2 55.4L70 61L66 65.2L61.6 58.6Z" fill={c.shirt} stroke={c.collarLine} strokeWidth="0.5" />
    <path d="M76.8 55.4L70 61L74 65.2L78.4 58.6Z" fill={c.shirt} stroke={c.collarLine} strokeWidth="0.5" />
    <path d="M67.9 60.2H72.1L71.4 63.8H68.6Z" fill={c.tieDark} />
    <path d="M68.5 63.6H71.5L73.6 90.5L70 94.8L66.4 90.5Z" fill={c.tie} />
    <path d="M70 64.5V92" stroke={c.tieDark} strokeWidth="0.5" opacity="0.5" />
    {/* notched lapels */}
    <path d="M62 55.2L69.6 102.5L64.2 86L59 71.4L61.6 68.4L57 64.8L58.4 58.4Z" fill={c.lapel} />
    <path d="M78 55.2L70.4 102.5L75.8 86L81 71.4L78.4 68.4L83 64.8L81.6 58.4Z" fill={c.lapel} />
    <path d="M59 71.4L64.2 86L69.6 102.5M81 71.4L75.8 86L70.4 102.5" stroke={c.lapelEdge} strokeWidth="0.45" fill="none" />
    {/* button, pockets, pocket square */}
    <circle cx="70" cy="104.6" r="1.6" fill={c.lapel} />
    <path d="M53.5 118.5H65.5L65.3 122.3H53.7ZM74.5 118.5H86.5L86.3 122.3H74.7Z" fill={c.lapel} />
    <path d="M76.6 78.6l1.6-3.4 1.5 2.2 1.6-2.8 1.5 4z" fill={c.pocket} />
    <path d="M75.8 78.8H84.6" stroke={c.lapel} strokeWidth="1.1" strokeLinecap="round" />
    {/* soft shadow under the chin */}
    <ellipse cx="70" cy="54.6" rx="4.6" ry="1.6" fill={c.neckShade} opacity="0.55" />
  </>
);

const FrontRig = ({ c }) => (
  <g className="lc-rig-front lc-i">
    <g className="lc-j lc-i lc-j-fRoot">
      <FrontLeg side="L" c={c} />
      <FrontLeg side="R" c={c} />
      <g className="lc-j lc-i lc-j-fBody">
        <g className="lc-idle lc-breathe">
          <FrontTorso c={c} />
          <g className="lc-j lc-i lc-j-fHead">
            <Head glasses />
          </g>
          <Sleeve
            x={F_SH_L[0]}
            fill={c.suit}
            upperClass="lc-j lc-i lc-j-fLu"
            lowerClass="lc-j lc-i lc-j-fLl"
            thumb={1}
            tap="lc-tapL lc-i"
            c={c}
          />
          <Sleeve
            x={F_SH_R[0]}
            fill={c.suitShade}
            upperClass="lc-j lc-i lc-j-fRu"
            lowerClass="lc-j lc-i lc-j-fRl"
            thumb={-1}
            tap="lc-tapR lc-i"
            holds
            c={c}
          />
        </g>
      </g>
    </g>
  </g>
);

const Character = ({ c }) => (
  <svg viewBox="0 0 140 230" aria-hidden="true" focusable="false" style={{ filter: c.rim }}>
    <defs>
      <linearGradient id="lcSuit" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={c.suitLight} />
        <stop offset="1" stopColor={c.suitDark} />
      </linearGradient>
      <linearGradient id="lcSuitF" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0" stopColor={c.suitLight} />
        <stop offset="0.5" stopColor={c.suit} />
        <stop offset="1" stopColor={c.suitDark} />
      </linearGradient>
      <linearGradient id="lcPants" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={c.pantsLight} />
        <stop offset="0.5" stopColor={c.pants} />
        <stop offset="1" stopColor={c.pantsDeep} />
      </linearGradient>
      <linearGradient id="lcLens" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor="#2A2F38" />
        <stop offset="0.55" stopColor="#0E1013" />
        <stop offset="1" stopColor={c.lensTint} />
      </linearGradient>
    </defs>
    <ProfileRig c={c} />
    <FrontRig c={c} />
  </svg>
);

const MoneyBox = ({ c }) => (
  <svg viewBox="0 0 44 40" aria-hidden="true" focusable="false">
    {/* light inside the box, revealed when the lid pops */}
    <rect x="4" y="11" width="36" height="8" rx="2" fill={c.glow} />
    <rect x="2" y="15" width="40" height="23" rx="3.5" fill={c.box} />
    <rect x="2" y="15" width="40" height="2.6" fill={c.gold} />
    <rect x="2" y="35" width="40" height="1.6" fill={c.goldDark} />
    <rect x="5" y="20" width="34" height="13.5" rx="2" fill={c.boxDark} opacity="0.35" />
    {/* gold lock plate with a keyhole */}
    <rect x="17" y="21.6" width="10" height="9.4" rx="1.8" fill={c.gold} stroke={c.goldDark} strokeWidth="0.8" />
    <circle cx="22" cy="25.4" r="1.25" fill={c.boxDark} />
    <path d="M21.45 25.8h1.1l.3 2.9h-1.7z" fill={c.boxDark} />
    {[4.5, 39.5].map((x) => (
      <circle key={x} cx={x} cy="19.5" r="0.9" fill={c.gold} />
    ))}
    <g className="lc-lid lc-i">
      <path d="M15.5 9V5.5a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3V9" stroke={c.goldDark} strokeWidth="2.4" fill="none" />
      <rect x="2" y="8.5" width="40" height="8" rx="3" fill={c.boxLight} />
      <rect x="2" y="14.2" width="40" height="1.4" fill={c.goldDark} />
      <rect x="19.5" y="12.5" width="5" height="5" rx="1" fill={c.gold} stroke={c.goldDark} strokeWidth="0.6" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */
const LoginScene = ({ children }) => {
  const theme = useTheme();
  const c = useMemo(() => getColors(theme), [theme]);
  const [skip, setSkip] = useState(false);
  const [done, setDone] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => setDone(true), T * 1000 + 150);
    return () => {
      clearTimeout(id);
      clearTimeout(typingTimer.current);
    };
  }, []);

  const skipIntro = useCallback(() => {
    if (done) return;
    setSkip(true);
    setDone(true);
  }, [done]);

  // Any key press (e.g. typing the username) skips the intro and makes him type along.
  const handleKeyDown = useCallback(() => {
    skipIntro();
    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 650);
  }, [skipIntro]);

  const cls = ['lc-stage', skip && 'lc-skip', done && 'lc-done', typing && 'lc-typing'].filter(Boolean).join(' ');

  return (
    <Box className={cls} onPointerDown={done ? undefined : skipIntro} onKeyDown={handleKeyDown}>
      <style>{SCENE_CSS}</style>

      <div
        className="lc-glow lc-i"
        style={{
          background: `radial-gradient(circle, ${alpha(c.glow, 0.9)} 0%, ${alpha(c.glowMid, 0.35)} 32%, transparent 68%)`,
        }}
      />

      <div className="lc-card lc-i">{children}</div>

      <div className="lc-char lc-i">
        <div
          className="lc-shadow lc-i"
          style={{ background: `radial-gradient(closest-side, ${c.shadow}, transparent)` }}
        />
        <div className="lc-hop lc-i">
          <Character c={c} />
        </div>
      </div>

      <div className="lc-case lc-i">
        <MoneyBox c={c} />
      </div>
    </Box>
  );
};

export default LoginScene;
