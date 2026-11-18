import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { useTheme, alpha, darken, lighten } from '@mui/material/styles';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { ThemeContext } from '../ThemeContext';
import logo from '../assets/logo.png';

/*
 * Ash Flow motion system: lightweight CSS + inline-SVG motion graphics, in the
 * same spirit as the animated login scene (no video files, no animation library).
 *
 * Every piece here:
 *   - is decorative (aria-hidden, pointer-events: none) and never blocks input,
 *     loading, form submission or navigation;
 *   - animates transform / opacity wherever possible, so it stays on the compositor;
 *   - pauses when scrolled out of view (hero), and settles on its final frame when
 *     the user turns Animations off in Settings (the OS "reduce animations"
 *     setting is deliberately not followed: the app animates unless switched off);
 *   - takes its colours from the active MUI theme, so all three themes work.
 *
 * <MotionStyles /> must be rendered once per screen tree (App does this).
 */

const GOLD = '#F7C948';
const GOLD_RIM = '#D99A1E';
const GOLD_LINE = '#E8B030';
const GOLD_INK = '#9C6B0A';

/* ------------------------------------------------------------------ */
/* Coin stacks (dashboard hero, left): generated per-coin timeline     */
/* ------------------------------------------------------------------ */
const STACKS = [2, 3, 4, 5]; // coins per stack, left → right
const STACK_X = [20, 48, 76, 104];
const STACK_COINS = STACKS.flatMap((n, s) => Array.from({ length: n }, (_, k) => ({ s, k })));
const STACK_CYCLE = 6; // s
const stackPct = (s) => `${((s / STACK_CYCLE) * 100).toFixed(2)}%`;
const STACK_CSS = (() => {
  let css = '';
  let j = 0;
  STACKS.forEach((n) => {
    for (let k = 0; k < n; k += 1, j += 1) {
      const t0 = 0.35 + j * 0.16;
      css +=
        `@keyframes af-stk${j}{0%,${stackPct(t0)}{opacity:0;transform:translateY(-18px)}` +
        `${stackPct(t0 + 0.3)},86%{opacity:1;transform:none}93%,100%{opacity:0;transform:none}}` +
        `.af-stk${j}{animation:af-stk${j} ${STACK_CYCLE}s cubic-bezier(.3,.7,.4,1) infinite}`;
    }
  });
  css +=
    `@keyframes af-stk-arrow{0%,${stackPct(2.9)}{opacity:0;transform:translate(-8px,8px)}` +
    `${stackPct(3.4)},86%{opacity:1;transform:none}93%,100%{opacity:0;transform:none}}` +
    `.af-stk-arrow{animation:af-stk-arrow ${STACK_CYCLE}s ease-out infinite}`;
  return css;
})();

/* Lend / borrow scene (dashboard hero): one 4.4s loop.
   0–44%  a green coin arcs from your wallet to the person   (you lent)
   50–94% a red coin arcs from the person back to the wallet (you borrowed)
   The receiver bounces on arrival and the receipt in the middle prints that line. */
const LB_CYCLE = 4.4;
const LB_TOP = [[42, 48], [80, 2], [118, 48]]; // wallet → person
const LB_BOTTOM = [[118, 72], [80, 118], [42, 72]]; // person → wallet
const quad = ([a, b, c], u) => [0, 1].map((k) => (1 - u) ** 2 * a[k] + 2 * u * (1 - u) * b[k] + u * u * c[k]);
const LB_CSS = (() => {
  const move = (pt, o) => `transform:translate(${pt[0].toFixed(2)}px,${pt[1].toFixed(2)}px);opacity:${o}`;
  const coin = (name, arc, start) => {
    const stops = [`0%{${move(arc[0], 0)}}`];
    if (start > 0) stops.push(`${start}%{${move(arc[0], 0)}}`);
    stops.push(`${start + 5}%{${move(arc[0], 1)}}`);
    for (let i = 1; i <= 12; i += 1) {
      stops.push(`${(start + 5 + (34 * i) / 12).toFixed(2)}%{${move(quad(arc, i / 12), 1)}}`);
    }
    stops.push(`${start + 43}%,100%{${move(arc[2], 0)}}`);
    return `@keyframes ${name}{${stops.join('')}}.${name}{opacity:0;animation:${name} ${LB_CYCLE}s linear infinite}`;
  };
  const bounce = (name, at) =>
    `@keyframes ${name}{0%,${at - 2}%,100%{transform:none}${at + 2}%{transform:scale(1.14)}${at + 7}%{transform:none}}` +
    `.${name}{transform-box:fill-box;transform-origin:50% 100%;animation:${name} ${LB_CYCLE}s ease-out infinite}`;
  return (
    coin('af-lb-c1', LB_TOP, 0) +
    coin('af-lb-c2', LB_BOTTOM, 50) +
    bounce('af-lb-them', 42) +
    bounce('af-lb-me', 92) +
    // receipt: green line prints when the loan lands, red when the borrowed money lands; both clear together
    `@keyframes af-lb-l1{0%,40%{transform:none;opacity:1}42%{transform:none;opacity:0}42.5%,43%{transform:scaleX(0);opacity:1}48%,100%{transform:none;opacity:1}}` +
    `@keyframes af-lb-l2{0%,40%{transform:none;opacity:1}42%{transform:none;opacity:0}42.5%,93%{transform:scaleX(0);opacity:1}98%,100%{transform:none;opacity:1}}` +
    `.af-lb-l1,.af-lb-l2{transform-box:fill-box;transform-origin:0 50%}` +
    `.af-lb-l1{animation:af-lb-l1 ${LB_CYCLE}s ease-out infinite}.af-lb-l2{animation:af-lb-l2 ${LB_CYCLE}s ease-out infinite}`
  );
})();

/* Reports scene: one 7.5s loop; bars grow one after another, then everything fades and replays. */
const RS_CYCLE = 7.5;
const RS_BARS = [22, 34, 30, 48, 64];
const RS_CSS = RS_BARS.map((_, i) => {
  const a = 12 + i * 5;
  return (
    `@keyframes af-rs-bar${i}{0%,${a}%{transform:scaleY(0)}${a + 7}%,100%{transform:none}}` +
    `.af-rs-bar${i}{transform-box:fill-box;transform-origin:50% 100%;animation:af-rs-bar${i} ${RS_CYCLE}s cubic-bezier(.2,.9,.3,1.15) infinite}`
  );
}).join('');

/* ------------------------------------------------------------------ */
/* Global keyframes + classes                                          */
/* ------------------------------------------------------------------ */
const MOTION_CSS = `
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes af-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes af-row{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes af-swap{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
@keyframes af-pop{0%{opacity:0;transform:scale(.3)}60%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:none}}
@keyframes af-grow-y{from{transform:scaleY(0)}to{transform:none}}
@keyframes af-grow-x{from{transform:scaleX(0)}to{transform:none}}
@keyframes af-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes af-swing{0%,45%,100%{transform:rotate(0)}9%{transform:rotate(-8deg)}18%{transform:rotate(7deg)}27%{transform:rotate(-4deg)}36%{transform:rotate(2deg)}}
@keyframes af-shake{0%,100%{transform:none}20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}}
@keyframes af-ping{0%{transform:scale(1);opacity:.6}70%,100%{transform:scale(1.7);opacity:0}}
@keyframes af-shine{0%{transform:translateX(-160%) skewX(-20deg)}24%,100%{transform:translateX(360%) skewX(-20deg)}}
@keyframes af-sheen{from{transform:translateX(-120%) skewX(-18deg)}to{transform:translateX(320%) skewX(-18deg)}}
@keyframes af-orbit{to{transform:rotate(360deg)}}

/* entrances (fill "backwards": once finished, the element is left with no transform) */
.af-rise{animation:af-rise .7s cubic-bezier(.2,.8,.2,1) backwards}
.af-row{animation:af-row .5s cubic-bezier(.2,.8,.2,1) backwards}
.af-swap{animation:af-swap .42s cubic-bezier(.2,.8,.2,1) backwards}
.af-pop{animation:af-pop .55s cubic-bezier(.3,.7,.4,1) backwards}
.af-grow-y{transform-origin:50% 100%;animation:af-grow-y .9s cubic-bezier(.2,.9,.3,1.12) backwards}
.af-grow-x{transform-origin:0 50%;animation:af-grow-x 1s cubic-bezier(.2,.8,.2,1) .25s backwards}

/* primary call-to-action: a light sweep every few seconds */
.af-shine{position:relative;overflow:hidden}
.af-shine::after{content:"";position:absolute;top:0;bottom:0;left:0;width:38%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.38),transparent);transform:translateX(-160%) skewX(-20deg);animation:af-shine 5s ease-in-out 1.4s infinite}

/* one-off sheen across a card, and a slowly orbiting ring (profile) */
.af-sheen{position:absolute;top:0;bottom:0;left:0;width:45%;pointer-events:none;background:linear-gradient(100deg,transparent,var(--af-sheen,rgba(255,255,255,.12)),transparent);transform:translateX(-120%) skewX(-18deg);animation:af-sheen 1.5s cubic-bezier(.4,0,.2,1) .35s backwards}
.af-ring{position:absolute;inset:-6px;border-radius:50%;pointer-events:none;-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));animation:af-orbit 5s linear infinite}
.af-ping-ring{position:absolute;inset:0;border-radius:inherit;border:2px solid currentColor;pointer-events:none;animation:af-ping 2.6s ease-out 1s infinite backwards}

/* ---- ambient backdrop (login / register) ---- */
.af-ambient{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.af-orb{position:absolute;border-radius:50%}
@keyframes af-orb-a{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(9vw,7vh,0) scale(1.18)}}
@keyframes af-orb-b{0%,100%{transform:translate3d(0,0,0) scale(1.08)}50%{transform:translate3d(-8vw,-6vh,0) scale(.92)}}
.af-orb-a{animation:af-orb-a 22s ease-in-out infinite}
.af-orb-b{animation:af-orb-b 27s ease-in-out infinite}

/* ---- dashboard hero: growth chart, light sweep, coin stacks, lend/borrow flow ---- */
.af-hero{position:relative;isolation:isolate}
.af-hero-bg{position:absolute;inset:-10px -8px;z-index:-1;pointer-events:none;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
.af-hero-chart{position:absolute;inset:0;-webkit-mask-image:radial-gradient(ellipse 40% 75% at 50% 58%,rgba(0,0,0,.2) 0%,rgba(0,0,0,.2) 55%,#000 100%);mask-image:radial-gradient(ellipse 40% 75% at 50% 58%,rgba(0,0,0,.2) 0%,rgba(0,0,0,.2) 55%,#000 100%);animation:af-reveal 2s cubic-bezier(.45,0,.2,1) .2s backwards}
.af-hero-chart svg{display:block;width:100%;height:100%}
@media (max-width:899.98px){.af-hero-chart{opacity:.55}}
@keyframes af-reveal{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
.af-sweep{position:absolute;top:0;bottom:0;left:0;width:24%;transform:translateX(-120%);animation:af-sweep 8s ease-in-out 2.4s infinite backwards}
@keyframes af-sweep{0%{transform:translateX(-120%)}40%,100%{transform:translateX(440%)}}
.af-hero-dot{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%}
.af-hero-dot::after{content:"";position:absolute;inset:0;border-radius:50%;background:inherit;animation:af-ping 2.2s ease-out 2.2s infinite backwards}
/* Coin stacks (left) + lend/borrow flow (right), behind the text (z-index -1, above the chart).
   Phones: hidden. Tablets: tucked behind the two ends of the title, in the free space beside it.
   Wide screens: full size, centred beside the title and quote. */
.af-hero-props{display:contents}
.af-prop{position:absolute;z-index:-1;pointer-events:none;top:-14px;height:clamp(44px,12vw,66px)}
.af-prop svg{display:block;width:100%;height:100%;overflow:visible}
.af-prop-l{left:-6px;aspect-ratio:130/104}
.af-prop-r{right:-6px;aspect-ratio:160/104}
@media (max-width:599.98px){.af-hero-props{display:none}} /* phones: keep the top calm */
@media (min-width:900px){
  .af-prop{top:50%;height:104px;margin-top:-52px}
  .af-prop-l{left:0}
  .af-prop-r{right:0}
}
${LB_CSS}
.af-lb-arc{stroke-dasharray:3 4;animation:af-lb-march 1s linear infinite}
@keyframes af-lb-march{to{stroke-dashoffset:-14}}
.af-flip{transform-box:fill-box;transform-origin:center;animation:af-flip .7s linear infinite}
@keyframes af-flip{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.25)}}
${STACK_CSS}

/* ---- money transfer strip: You <-> person ---- */
.af-tf{display:flex;align-items:flex-start;gap:8px;width:100%}
.af-tf-node{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:4px;width:64px}
.af-tf-dot{position:relative;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.95rem;transition:color .35s,border-color .35s,background-color .35s,box-shadow .35s}
.af-tf-dot::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:2px solid currentColor;opacity:0;pointer-events:none}
.af-tf-recv .af-tf-dot::after{animation:af-ping 1.8s ease-out .9s infinite}
.af-tf-label{max-width:64px;font-size:.66rem;font-weight:700;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.af-tf-track{position:relative;flex:1 1 auto;min-width:56px;height:38px;transition:color .35s}
.af-tf-line{position:absolute;left:2px;right:2px;top:50%;border-top:2px dashed currentColor;opacity:.32}
.af-tf-chev{position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;opacity:.7}
.af-tf-chev svg{display:block;width:100%;height:100%}
.af-tf-chev.in{transform:scaleX(-1)}
.af-tf-lanes{position:absolute;inset:0}
.af-tf-lane{position:absolute;inset:0;opacity:0;animation:af-flow 1.8s cubic-bezier(.45,0,.55,1) infinite backwards}
.af-tf-lane.rev{animation-direction:reverse}
.af-tf-coin{position:absolute;left:0;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px}
.af-tf-lane.up .af-tf-coin{top:26%}
.af-tf-lane.dn .af-tf-coin{top:74%}
.af-tf-coin svg{display:block;width:100%;height:100%}
.af-tf-check{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;display:flex;align-items:center;justify-content:center}
@keyframes af-flow{0%{transform:translateX(0);opacity:0}14%,86%{opacity:1}100%{transform:translateX(100%);opacity:0}}

/* ---- empty / loading states ---- */
.af-empty{display:flex;flex-direction:column;align-items:center;gap:10px}
.af-empty-art{display:block;line-height:0}
.af-empty-art svg{display:block;overflow:visible}
.af-coins{display:flex;align-items:flex-end;gap:6px;height:30px}
.af-coins>span{display:block;width:18px;height:18px}
.af-coins svg{width:100%;height:100%}
.af-hop{animation:af-hop 1.1s ease-in-out infinite}
@keyframes af-hop{0%,55%,100%{transform:none}25%{transform:translateY(-10px)}}
.af-scan{transform-box:fill-box;transform-origin:center;animation:af-scan 2.8s ease-in-out infinite}
@keyframes af-scan{0%,100%{transform:translate(-11px,1px) rotate(-8deg)}50%{transform:translate(11px,-2px) rotate(6deg)}}
.af-float{animation:af-bob 2.4s ease-in-out infinite}
.af-seesaw{transform-box:view-box;transform-origin:32px 18px;animation:af-seesaw 4s ease-in-out infinite}
@keyframes af-seesaw{0%,70%,100%{transform:none}10%{transform:rotate(-5deg)}25%{transform:rotate(4deg)}40%{transform:rotate(-2.5deg)}55%{transform:rotate(1.2deg)}}

/* ---- success burst: ring + tick draw, coins pop outwards ---- */
.af-sb-ring{animation:af-draw-ring .6s cubic-bezier(.65,0,.35,1) .05s backwards}
@keyframes af-draw-ring{from{stroke-dashoffset:189}to{stroke-dashoffset:0}}
.af-sb-check{animation:af-draw-check .38s cubic-bezier(.65,0,.35,1) .5s backwards}
@keyframes af-draw-check{from{stroke-dashoffset:46}to{stroke-dashoffset:0}}
.af-sb-glow{transform-box:fill-box;transform-origin:center;opacity:0;animation:af-sb-glow .9s ease-out .55s}
@keyframes af-sb-glow{0%{opacity:.5;transform:scale(1)}100%{opacity:0;transform:scale(1.6)}}
.af-sb-p{transform-box:fill-box;transform-origin:center;opacity:0;animation:af-sb-p .85s cubic-bezier(.2,.7,.3,1) .55s}
@keyframes af-sb-p{0%{opacity:0;transform:translateY(4px) scale(.3)}25%{opacity:1}100%{opacity:0;transform:translateY(-12px) scale(1)}}

/* ---- tiny live icons ---- */
.af-bars rect{transform-box:fill-box;transform-origin:50% 100%;animation:af-bar 3.2s cubic-bezier(.3,.7,.4,1) infinite}
.af-bars rect:nth-of-type(2){animation-delay:.18s}
.af-bars rect:nth-of-type(3){animation-delay:.36s}
@keyframes af-bar{0%,100%{transform:scaleY(.35)}25%,80%{transform:none}}
.af-receipt line{transform-box:fill-box;transform-origin:0 50%;animation:af-print 4s ease-out infinite}
.af-receipt line:nth-of-type(2){animation-delay:.25s}
.af-receipt line:nth-of-type(3){animation-delay:.5s}
@keyframes af-print{0%,8%{transform:scaleX(0)}22%,82%{transform:none}92%,100%{transform:scaleX(0)}}

/* ---- report cards: coins drifting out of (lent) / into (borrowed) the card ---- */
.af-cardfx{position:absolute;top:0;bottom:0;right:4%;width:40%;pointer-events:none;z-index:-1}
.af-cardfx i{position:absolute;bottom:-14px;display:block;border-radius:50%;opacity:0;background:radial-gradient(circle at 35% 35%,#FFE89A,${GOLD} 55%,${GOLD_RIM});box-shadow:0 0 6px rgba(247,201,72,.45);animation:af-card-up 3.6s ease-in infinite backwards}
.af-cardfx.down i{bottom:auto;top:-14px;animation-name:af-card-down}
@keyframes af-card-up{0%{transform:translateY(0);opacity:0}20%{opacity:.55}100%{transform:translateY(-110px);opacity:0}}
@keyframes af-card-down{0%{transform:translateY(0);opacity:0}20%{opacity:.55}100%{transform:translateY(110px);opacity:0}}
@media (max-width:599.98px){.af-cardfx{top:50%;width:46%;right:2%;overflow:hidden}}

/* ---- reports scene: donut (real lent/borrowed split) + growing bars + trend line ---- */
.af-rs{display:block;width:100%;max-width:520px;margin:0 auto}
.af-rs svg{display:block;width:100%;height:auto;overflow:visible}
.af-rs-all{animation:af-rs-all ${RS_CYCLE}s linear infinite}
@keyframes af-rs-all{0%,90%{opacity:1}96%,100%{opacity:0}}
.af-rs-reveal{animation:af-rs-reveal ${RS_CYCLE}s cubic-bezier(.4,0,.2,1) infinite}
@keyframes af-rs-reveal{0%,3%{stroke-dashoffset:100}18%,100%{stroke-dashoffset:0}}
.af-rs-line{stroke-dasharray:100;animation:af-rs-line ${RS_CYCLE}s ease-out infinite}
@keyframes af-rs-line{0%,38%{stroke-dashoffset:100}53%,100%{stroke-dashoffset:0}}
.af-rs-end{opacity:0;transform-box:fill-box;transform-origin:center;animation:af-rs-end ${RS_CYCLE}s ease-out infinite}
@keyframes af-rs-end{0%,52%{opacity:0;transform:scale(0)}57%{opacity:1;transform:scale(1.3)}61%,100%{opacity:1;transform:none}}
.af-rs-ping{transform-box:fill-box;transform-origin:center;opacity:0;animation:af-ping 1.8s ease-out 4.4s infinite backwards}
.af-rs-up{opacity:0;animation:af-rs-up 3s ease-in infinite}
@keyframes af-rs-up{0%{opacity:0;transform:translateY(0)}20%{opacity:.9}100%{opacity:0;transform:translateY(-70px)}}
${RS_CSS}

/* ---- settings: phone ↔ cloud sync ---- */
.af-sync{display:inline-flex;line-height:0}
.af-sync svg{display:block;overflow:visible}
.af-sync-dot{opacity:0;animation:af-sync-dot 1.8s ease-in-out infinite}
.af-sync-syncing .af-sync-dot{animation-duration:.75s}
.af-sync-done .af-sync-dot,.af-sync-failed .af-sync-dot{animation:none;opacity:0}
@keyframes af-sync-dot{0%{opacity:0;transform:translate(0,0)}20%{opacity:1}50%{transform:translate(11px,-6px)}80%{opacity:1}100%{opacity:0;transform:translate(22px,-1px)}}
.af-sync-cloud{transform-box:fill-box;transform-origin:center;animation:af-bob 3s ease-in-out infinite}
.af-sync-syncing .af-sync-cloud{animation-duration:1s}
.af-sync-failed .af-sync-cloud{animation:af-shake .5s ease-in-out 1}
.af-sync-check{transform-box:fill-box;transform-origin:center}

/* ---- welcome intro after sign-in (never blocks: pointer-events none, fades out) ---- */
.af-splash-wait,.af-splash-wait *{animation-play-state:paused!important}
.af-splash{position:fixed;inset:0;z-index:1500;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;pointer-events:none;animation:af-splash-out 1.7s ease-in-out both}
@keyframes af-splash-out{0%,72%{opacity:1}100%{opacity:0}}
.af-splash-core{position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center}
.af-splash-logo{position:relative;width:84px;height:84px;border-radius:20px;object-fit:contain;animation:af-splash-logo .9s cubic-bezier(.3,1.4,.5,1) .1s both}
@keyframes af-splash-logo{0%{opacity:0;transform:scale(.4) rotate(-12deg)}100%{opacity:1;transform:none}}
.af-splash-ring{position:absolute;inset:-4px;border-radius:50%;border:2px solid;opacity:0;animation:af-splash-ring 1.1s ease-out .5s both}
@keyframes af-splash-ring{0%{opacity:.85;transform:scale(.6)}100%{opacity:0;transform:scale(1.7)}}
.af-splash-spin{position:absolute;inset:0;animation:af-orbit 1.3s cubic-bezier(.4,0,.2,1) both}
.af-splash-orbit{position:absolute;left:50%;top:50%;width:0;height:0}
.af-splash-coin{position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;animation:af-splash-coin 1.2s cubic-bezier(.5,0,.3,1) both}
.af-splash-coin svg{display:block;width:100%;height:100%}
@keyframes af-splash-coin{0%{opacity:0;transform:translateY(-120px) scale(.6)}25%{opacity:1}70%{opacity:1;transform:translateY(-72px) scale(1)}100%{opacity:0;transform:translateY(0) scale(.3)}}
.af-splash-name{font-weight:800;font-size:1.05rem;letter-spacing:.32em;animation:af-splash-name .7s ease-out .5s both}
@keyframes af-splash-name{from{opacity:0;letter-spacing:.8em}to{opacity:1;letter-spacing:.32em}}
.af-splash-bar{width:120px;height:3px;border-radius:2px;overflow:hidden}
.af-splash-bar i{display:block;height:100%;transform-origin:0 50%;animation:af-grow-x 1.05s cubic-bezier(.4,0,.2,1) .35s both}

/* ---- performance ---- */
.af-paused,.af-paused *,.af-paused *::before,.af-paused *::after{animation-play-state:paused!important}
`;

// Added only when Animations is switched off in Settings: everything rests on its final frame.
const MOTION_OFF_CSS = `
.af,.af *,.af::before,.af::after,.af *::before,.af *::after,
.af-rise,.af-row,.af-swap,.af-pop,.af-grow-y,.af-grow-x,.af-shine::after,.af-sheen,.af-ring,.af-ping-ring{animation:none!important}
`;

export function MotionStyles() {
  const { animationsOn } = useContext(ThemeContext);
  return <style>{animationsOn ? MOTION_CSS : MOTION_CSS + MOTION_OFF_CSS}</style>;
}

/* ------------------------------------------------------------------ */
/* Shared artwork                                                       */
/* ------------------------------------------------------------------ */
function CoinSvg() {
  return (
    <svg viewBox="0 0 22 22" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="10" fill={GOLD} stroke={GOLD_RIM} strokeWidth="1.5" />
      <circle cx="11" cy="11" r="6.8" fill="none" stroke={GOLD_LINE} strokeWidth="1" />
      <text x="11" y="15" textAnchor="middle" fontSize="11" fontWeight="800" fill={GOLD_INK} fontFamily="sans-serif">
        ₹
      </text>
    </svg>
  );
}

/* A face-on coin drawn around (0, 0), for use inside another SVG. */
function CoinGlyph({ r = 7 }) {
  return (
    <>
      <circle r={r} fill={GOLD} stroke={GOLD_RIM} strokeWidth={r * 0.14} />
      <circle r={r * 0.66} fill="none" stroke={GOLD_LINE} strokeWidth={r * 0.1} />
      <text y={r * 0.38} textAnchor="middle" fontSize={r * 1.05} fontWeight="800" fill={GOLD_INK} fontFamily="sans-serif">
        ₹
      </text>
    </>
  );
}

/* A coin lying flat (perspective), top face centred on (0, 0). */
function FlatCoin() {
  return (
    <>
      <path d="M-12 0v5a12 4.2 0 0 0 24 0v-5Z" fill={GOLD_RIM} />
      <ellipse rx="12" ry="4.2" fill={GOLD} stroke={GOLD_RIM} strokeWidth="0.8" />
      <ellipse rx="7.5" ry="2.4" fill="none" stroke={GOLD_LINE} strokeWidth="0.7" />
    </>
  );
}

function useOffscreen(ref) {
  const [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return offscreen;
}

/* ------------------------------------------------------------------ */
/* Login / Register: slow aurora glow only (no coins, no sparkles)       */
/* ------------------------------------------------------------------ */
export function AmbientBackdrop() {
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const isDark = theme.palette.mode === 'dark';
  return (
    <div className="af af-ambient" aria-hidden="true">
      <div
        className="af-orb af-orb-a"
        style={{
          width: '62vmax',
          height: '62vmax',
          left: '-22vmax',
          top: '-26vmax',
          background: `radial-gradient(closest-side, ${alpha(p, isDark ? 0.16 : 0.12)}, transparent)`,
        }}
      />
      <div
        className="af-orb af-orb-b"
        style={{
          width: '54vmax',
          height: '54vmax',
          right: '-20vmax',
          bottom: '-24vmax',
          background: `radial-gradient(closest-side, ${alpha(p, isDark ? 0.12 : 0.1)}, transparent)`,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard hero: growth chart behind the title, piggy bank + coins    */
/* ------------------------------------------------------------------ */
const LINE = [
  [0, 128], [90, 116], [170, 122], [255, 98], [335, 106], [425, 80], [515, 88],
  [600, 62], [690, 70], [775, 46], [860, 52], [960, 26], [1000, 20],
];
const LINE_D = `M${LINE.map(([x, y]) => `${x} ${y}`).join('L')}`;
const AREA_D = `${LINE_D}L1000 150L0 150Z`;
const DOT = LINE[LINE.length - 2];

function CoinStacks({ primary, shadow }) {
  return (
    <svg viewBox="0 0 130 104" aria-hidden="true" focusable="false">
      {STACK_X.map((x) => (
        <ellipse key={x} cx={x} cy="99" rx="14" ry="3" fill={shadow} />
      ))}
      {/* bottom coin first, so each coin is drawn over the one beneath it */}
      {STACK_COINS.map(({ s, k }, idx) => (
        <g key={idx} transform={`translate(${STACK_X[s]} ${92 - k * 7})`}>
          <g className={`af-stk${idx}`}>
            <FlatCoin />
          </g>
        </g>
      ))}
      <g className="af-stk-arrow">
        <path d="M8 66L48 54L76 46L108 30" fill="none" stroke={primary} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M99.5 28.5L109.5 29.5L105 38.5" fill="none" stroke={primary} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

const LENT_C = '#10B981';
const BORROW_C = '#EF4444';

/* Your wallet ⇄ a person: a loan goes out on the top arc, borrowed money comes back on the bottom one. */
function LendBorrowScene({ primary, shadow }) {
  const wallet = darken(primary, 0.35);
  const person = '#5AA9FF';
  return (
    <svg viewBox="0 0 160 104" aria-hidden="true" focusable="false">
      <ellipse cx="24" cy="80" rx="15" ry="3" fill={shadow} />
      <ellipse cx="138" cy="80" rx="15" ry="3" fill={shadow} />

      {/* the two flows */}
      <path className="af-lb-arc" d={`M${LB_TOP[0]}Q${LB_TOP[1]} ${LB_TOP[2]}`} fill="none" stroke={LENT_C} strokeOpacity="0.55" strokeWidth="1.6" />
      <path d="M110.5 45.2L118 48L116.6 40" fill="none" stroke={LENT_C} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path className="af-lb-arc" d={`M${LB_BOTTOM[0]}Q${LB_BOTTOM[1]} ${LB_BOTTOM[2]}`} fill="none" stroke={BORROW_C} strokeOpacity="0.55" strokeWidth="1.6" />
      <path d="M49.5 74.9L42 72L43.4 80" fill="none" stroke={BORROW_C} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* receipt in the middle: one line per transaction */}
      <path d="M71 49h18v22l-3-2-3 2-3-2-3 2-3-2-3 2z" fill={alpha('#ffffff', 0.08)} stroke={alpha(primary, 0.45)} strokeWidth="1" strokeLinejoin="round" />
      <rect className="af-lb-l1" x="74.5" y="54" width="11" height="2.4" rx="1.2" fill={LENT_C} />
      <rect className="af-lb-l2" x="74.5" y="59.5" width="11" height="2.4" rx="1.2" fill={BORROW_C} />

      {/* you: wallet */}
      <g className="af-lb-me">
        <rect x="10" y="49" width="28" height="22" rx="5" fill={wallet} stroke={primary} strokeWidth="1.4" />
        <rect x="23" y="54.5" width="16" height="11" rx="3.5" fill={primary} />
        <circle cx="30.5" cy="60" r="1.8" fill={GOLD} />
      </g>

      {/* the other person */}
      <g className="af-lb-them">
        <circle cx="138" cy="53" r="7" fill={person} />
        <path d="M125 73c0-7.5 5.5-12 13-12s13 4.5 13 12z" fill={person} />
      </g>

      {/* coins in flight */}
      <g className="af-lb-c1">
        <g className="af-flip">
          <CoinGlyph r={6} />
        </g>
      </g>
      <g className="af-lb-c2">
        <g className="af-flip">
          <CoinGlyph r={6} />
        </g>
      </g>
    </svg>
  );
}

export function DashboardHero({ children }) {
  const theme = useTheme();
  const ref = useRef(null);
  const offscreen = useOffscreen(ref);
  const p = theme.palette.primary.main;
  const shadow = theme.palette.mode === 'dark' ? alpha(p, 0.22) : 'rgba(0,0,0,0.12)';
  return (
    <Box
      ref={ref}
      className={`af af-hero af-rise${offscreen ? ' af-paused' : ''}`}
      sx={{ mb: { xs: 3, md: 5 }, textAlign: 'center' }}
    >
      <div className="af-hero-bg" aria-hidden="true">
        <div className="af-hero-chart">
          <svg viewBox="0 0 1000 150" preserveAspectRatio="none" focusable="false">
            <defs>
              <linearGradient id="afHeroArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={p} stopOpacity="0.22" />
                <stop offset="1" stopColor={p} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[40, 80, 120].map((y) => (
              <line
                key={y}
                x1="0"
                x2="1000"
                y1={y}
                y2={y}
                stroke={theme.palette.divider}
                strokeDasharray="3 7"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={AREA_D} fill="url(#afHeroArea)" />
            <path
              d={LINE_D}
              fill="none"
              stroke={p}
              strokeOpacity="0.55"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <div
          className="af-sweep"
          style={{ background: `linear-gradient(90deg, transparent, ${alpha(p, 0.14)}, transparent)` }}
        />
        <Box
          className="af-hero-dot"
          sx={{
            display: { xs: 'block', md: 'none' },
            left: `${DOT[0] / 10}%`,
            top: `${(DOT[1] / 150) * 100}%`,
            bgcolor: p,
            boxShadow: `0 0 10px ${p}`,
          }}
        />
      </div>

      {children}

      {/* Growing coin stacks + lend/borrow flow, behind the two sides of the title (beside it on wide screens) */}
      <div className="af-hero-props">
        <div className="af-prop af-prop-l" aria-hidden="true">
          <CoinStacks primary={p} shadow={shadow} />
        </div>
        <div className="af-prop af-prop-r" aria-hidden="true">
          <LendBorrowScene primary={p} shadow={shadow} />
        </div>
      </div>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Lending / borrowing: animated money flow between You and a person    */
/*   mode: 'out' (you gave)  'in' (you received)                        */
/*         'exchange' (partial payment)  'settled'                      */
/* ------------------------------------------------------------------ */
export function TransferFlow({ mode = 'out', tone, personName = '' }) {
  const theme = useTheme();
  const c = tone || theme.palette.primary.main;
  const isDark = theme.palette.mode === 'dark';
  const name = String(personName || '').trim();
  const initial = (name.charAt(0) || '?').toUpperCase();

  const node = (content, label, receiving) => (
    <div className={`af-tf-node${receiving ? ' af-tf-recv' : ''}`}>
      <div
        className="af-tf-dot"
        style={{
          color: c,
          border: `2px solid ${alpha(c, 0.55)}`,
          backgroundColor: alpha(c, isDark ? 0.14 : 0.1),
          boxShadow: receiving ? `0 0 14px ${alpha(c, 0.35)}` : 'none',
        }}
      >
        {content}
      </div>
      <span className="af-tf-label" style={{ color: theme.palette.text.secondary }}>
        {label}
      </span>
    </div>
  );

  const lanes =
    mode === 'exchange'
      ? [
          { cls: 'up', delay: 0 },
          { cls: 'dn rev', delay: 0.9 },
        ]
      : [0, 0.6, 1.2].map((delay) => ({ cls: mode === 'in' ? 'rev' : '', delay }));

  return (
    <div className="af af-tf" aria-hidden="true">
      {node(<AccountBalanceWalletRoundedIcon sx={{ fontSize: 18 }} />, 'You', mode === 'in')}
      <div className="af-tf-track" style={{ color: c }}>
        <span className="af-tf-line" />
        {mode === 'settled' ? (
          <span className="af-tf-check af-pop" style={{ backgroundColor: c }}>
            <CheckRoundedIcon sx={{ fontSize: 15, color: '#fff' }} />
          </span>
        ) : (
          <>
            {mode !== 'exchange' && (
              <span className={`af-tf-chev ${mode}`}>
                <svg viewBox="0 0 12 12" focusable="false">
                  <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
            <span key={mode} className="af-tf-lanes">
              {lanes.map((l, i) => (
                <span key={i} className={`af-tf-lane ${l.cls}`} style={{ animationDelay: `${l.delay}s` }}>
                  <span className="af-tf-coin">
                    <CoinSvg />
                  </span>
                </span>
              ))}
            </span>
          </>
        )}
      </div>
      {node(initial, name || 'Person', mode === 'out')}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty / loading states                                              */
/*   variant: 'loading' | 'search' | 'balanced' | 'empty'              */
/* ------------------------------------------------------------------ */
export function EmptyState({ variant = 'empty', children }) {
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const muted = theme.palette.text.secondary;
  const faint = alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.04);

  let art;
  if (variant === 'loading') {
    art = (
      <span className="af-coins">
        {[0, 1, 2].map((i) => (
          <span key={i} className="af-hop" style={{ animationDelay: `${i * 0.15}s` }}>
            <CoinSvg />
          </span>
        ))}
      </span>
    );
  } else if (variant === 'search') {
    art = (
      <svg width="64" height="48" viewBox="0 0 64 48" focusable="false">
        <path d="M14 6h30v34l-5-3-5 3-5-3-5 3-5-3-5 3z" fill={faint} stroke={theme.palette.divider} strokeWidth="1.5" strokeLinejoin="round" />
        {[14, 20, 26].map((y, i) => (
          <line key={y} x1="19" x2={i === 2 ? 32 : 39} y1={y} y2={y} stroke={muted} strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
        ))}
        <g className="af-scan">
          <circle cx="40" cy="26" r="8" fill={alpha(p, 0.12)} stroke={p} strokeWidth="3" />
          <line x1="46" y1="32" x2="52" y2="38" stroke={p} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      </svg>
    );
  } else if (variant === 'balanced') {
    art = (
      <svg width="64" height="48" viewBox="0 0 64 48" focusable="false">
        <line x1="32" y1="18" x2="32" y2="42" stroke={muted} strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="23" y="41" width="18" height="3.5" rx="1.75" fill={muted} fillOpacity="0.5" />
        <g className="af-seesaw">
          <line x1="9" y1="18" x2="55" y2="18" stroke={p} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M12 18L6 30M12 18L18 30M52 18L46 30M52 18L58 30" stroke={muted} strokeOpacity="0.45" strokeWidth="1" />
          <path d="M4 30Q12 37 20 30Z" fill={alpha(p, 0.3)} stroke={p} strokeWidth="1.2" />
          <path d="M44 30Q52 37 60 30Z" fill={alpha(p, 0.3)} stroke={p} strokeWidth="1.2" />
          <ellipse cx="12" cy="29" rx="4.5" ry="1.6" fill={GOLD} stroke={GOLD_RIM} strokeWidth="0.6" />
          <ellipse cx="52" cy="29" rx="4.5" ry="1.6" fill={GOLD} stroke={GOLD_RIM} strokeWidth="0.6" />
          <circle cx="32" cy="18" r="3" fill={p} />
        </g>
      </svg>
    );
  } else {
    // an open money box with a coin hovering above it
    art = (
      <svg width="64" height="48" viewBox="0 0 64 48" focusable="false">
        <ellipse cx="32" cy="45" rx="20" ry="2.5" fill={alpha(p, 0.18)} />
        <rect x="14" y="24" width="36" height="19" rx="3" fill={darken(p, 0.45)} />
        <rect x="14" y="24" width="36" height="2.5" fill={GOLD} />
        <circle cx="32" cy="34" r="4" fill={GOLD} stroke={GOLD_RIM} strokeWidth="0.8" />
        <rect x="14" y="15" width="36" height="7" rx="2.5" fill={darken(p, 0.25)} transform="rotate(-16 14 22)" />
        <g className="af-float">
          <g transform="translate(34 9)">
            <CoinGlyph r={5.5} />
          </g>
        </g>
      </svg>
    );
  }

  return (
    <div className="af af-empty" role={variant === 'loading' ? 'status' : undefined}>
      <span className="af-empty-art" aria-hidden="true">
        {art}
      </span>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Success: ring + tick draw themselves, small coins burst outwards     */
/* ------------------------------------------------------------------ */
export function SuccessBurst({ size = 84, color, coins = true }) {
  const theme = useTheme();
  const c = color || theme.palette.success.main;
  return (
    <svg
      className="af"
      width={size}
      height={size}
      viewBox="0 0 96 96"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', overflow: 'visible', filter: `drop-shadow(0 0 12px ${alpha(c, 0.4)})` }}
    >
      <circle className="af-sb-glow" cx="48" cy="48" r="30" fill="none" stroke={c} strokeWidth="6" />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 45 + 22.5} 48 48)`}>
          <g className="af-sb-p" style={{ animationDelay: `${0.55 + (i % 2) * 0.06}s` }}>
            {i % 2 || !coins ? (
              <circle cx="48" cy="11" r="2.6" fill={c} />
            ) : (
              <circle cx="48" cy="11" r="3.6" fill={GOLD} stroke={GOLD_RIM} strokeWidth="0.8" />
            )}
          </g>
        </g>
      ))}
      <circle cx="48" cy="48" r="30" fill={alpha(c, 0.12)} />
      <circle
        className="af-sb-ring"
        cx="48"
        cy="48"
        r="30"
        fill="none"
        stroke={c}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="189"
        transform="rotate(-90 48 48)"
      />
      <path
        className="af-sb-check"
        d="M34 49L44 59L63 38"
        fill="none"
        stroke={c}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="46"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Small live icons (sized by font-size, like MUI icons)               */
/* ------------------------------------------------------------------ */
export function GrowthBarsIcon({ sx }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', lineHeight: 0, ...sx }}>
      <svg className="af af-bars" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="4" y="13" width="4" height="7" rx="1.2" fill="currentColor" />
        <rect x="10" y="9" width="4" height="11" rx="1.2" fill="currentColor" />
        <rect x="16" y="5" width="4" height="15" rx="1.2" fill="currentColor" />
      </svg>
    </Box>
  );
}

export function ReceiptPrintIcon({ sx }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', lineHeight: 0, ...sx }}>
      <svg className="af af-receipt" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="9" y1="11.5" x2="15" y2="11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="9" y1="15" x2="13" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </Box>
  );
}

/* Coins rising out of (direction "up") or dropping into ("down") a card. */
export function CardCoins({ direction = 'up', active = true }) {
  const coins = [
    { left: 10, size: 10, delay: 0 },
    { left: 38, size: 14, delay: 0.9 },
    { left: 62, size: 9, delay: 1.8 },
    { left: 84, size: 12, delay: 2.7 },
  ];
  return (
    <span className={`af af-cardfx${direction === 'down' ? ' down' : ''}`} aria-hidden="true">
      {coins.map((coin) => (
        <i
          key={coin.left}
          style={{
            left: `${coin.left}%`,
            width: coin.size,
            height: coin.size,
            animationDelay: `${coin.delay}s`,
            animationPlayState: active ? 'running' : 'paused',
          }}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Reports: donut drawing the real lent/borrowed split, bars growing in */
/* turn, a trend line racing to a new high; fades and replays.         */
/* ------------------------------------------------------------------ */
const RS_X = [146, 181, 216, 251, 286];
const RS_BASE = 104;
const RS_TOPS = RS_X.map((x, i) => [x + 9, RS_BASE - RS_BARS[i] - 7]);
const RS_END = [322, 24];

export function ReportsScene({ lentShare = 0, borrowedShare = 0 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const faint = alpha(theme.palette.text.primary, isDark ? 0.08 : 0.07);
  const lent = Math.max(0, Math.min(100, Number(lentShare) || 0));
  const borrowed = Math.max(0, Math.min(100 - lent, Number(borrowedShare) || 0));
  const [cx, cy, r] = [62, 61, 40];
  const ring = { cx, cy, r, fill: 'none', pathLength: 100, transform: `rotate(-90 ${cx} ${cy})` };
  const line = `M${RS_TOPS.map(([x, y]) => `${x} ${y}`).join('L')}L${RS_END[0]} ${RS_END[1]}`;

  return (
    <div className="af af-rs" aria-hidden="true">
      <svg viewBox="0 0 340 122" focusable="false">
        <defs>
          <mask id="afRsMask">
            <circle {...ring} className="af-rs-reveal" stroke="#fff" strokeWidth="18" strokeDasharray="100 200" />
          </mask>
          <linearGradient id="afRsBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={lighten(LENT_C, 0.2)} />
            <stop offset="1" stopColor={darken(LENT_C, 0.25)} />
          </linearGradient>
        </defs>
        <g className="af-rs-all">
          {/* donut: lent (green) + borrowed (red), drawn clockwise */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={faint} strokeWidth="14" />
          <g mask="url(#afRsMask)">
            <circle {...ring} stroke={LENT_C} strokeWidth="14" strokeDasharray={`${lent} 100`} />
            <circle {...ring} stroke={BORROW_C} strokeWidth="14" strokeDasharray={`${borrowed} 100`} strokeDashoffset={-lent} />
          </g>
          <g transform={`translate(${cx} ${cy})`}>
            <g className="af-flip">
              <CoinGlyph r={11} />
            </g>
          </g>

          {/* coins drifting up between the donut and the chart */}
          {[114, 126].map((x, i) => (
            <g key={x} transform={`translate(${x} 112)`}>
              <g className="af-rs-up" style={{ animationDelay: `${i * 1.5}s` }}>
                <CoinGlyph r={4.5} />
              </g>
            </g>
          ))}

          {/* chart: bars grow one by one, then the trend line races up */}
          {[34, 60, 86].map((y) => (
            <line key={y} x1="138" x2="332" y1={y} y2={y} stroke={faint} strokeDasharray="3 5" />
          ))}
          <line x1="138" x2="332" y1={RS_BASE} y2={RS_BASE} stroke={alpha(LENT_C, 0.4)} strokeWidth="1.5" />
          {RS_X.map((x, i) => (
            <rect key={x} className={`af-rs-bar${i}`} x={x} y={RS_BASE - RS_BARS[i]} width="18" height={RS_BARS[i]} rx="3" fill="url(#afRsBar)" />
          ))}
          <path className="af-rs-line" pathLength="100" d={line} fill="none" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <g transform={`translate(${RS_END[0]} ${RS_END[1]})`}>
            <circle className="af-rs-ping" r="6" fill={GOLD} />
            <circle className="af-rs-end" r="4.2" fill={GOLD} stroke="#fff" strokeWidth="1.2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings → Google Sheets Sync: data flows phone → cloud; streams    */
/* while syncing, tick when synced, shake when it failed.              */
/*   state: 'idle' | 'syncing' | 'done' | 'failed'                     */
/* ------------------------------------------------------------------ */
export function SyncCloud({ state = 'idle' }) {
  const blue = '#0A84FF';
  const red = '#FF453A';
  const dur = state === 'syncing' ? 0.75 : 1.8;
  const tone = state === 'failed' ? red : blue;
  return (
    <span className={`af af-sync af-sync-${state}`} aria-hidden="true">
      <svg width="46" height="30" viewBox="0 0 46 30" focusable="false">
        <rect x="2" y="9" width="12" height="19" rx="2.6" fill={alpha(blue, 0.12)} stroke={blue} strokeWidth="1.5" />
        <line x1="6.5" y1="25" x2="9.5" y2="25" stroke={blue} strokeWidth="1.3" strokeLinecap="round" />
        <g className="af-sync-cloud">
          <path
            d="M28 22h12.5a4.6 4.6 0 0 0 .5-9.2 6.6 6.6 0 0 0-12.6-1.5A5.4 5.4 0 0 0 28 22z"
            fill={alpha(tone, 0.15)}
            stroke={tone}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {state === 'done' && (
            <g className="af-sync-check af-pop">
              <path d="M30.5 16.5l2.6 2.6 5-5" fill="none" stroke="#30D158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
        </g>
        {[0, 1, 2].map((i) => (
          <circle key={i} className="af-sync-dot" cx="12" cy="15" r="1.7" fill={blue} style={{ animationDelay: `${-(i * dur) / 3}s` }} />
        ))}
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Welcome intro right after sign-in: logo pops in, a ring of coins    */
/* spirals into it, the name settles, then it all fades (~1.7s).       */
/* pointer-events: none, so taps go straight through to the app.       */
/* ------------------------------------------------------------------ */
export function WelcomeSplash({ onDone }) {
  const theme = useTheme();
  const p = theme.palette.primary.main;
  // Held paused until the browser is really painting frames. Right after sign-in the
  // page is busy, and a CSS animation's clock can start before its first frame is
  // drawn, which would use up the whole intro off-screen.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('ashflow_splash_seen', '1');
    } catch {
      // private mode / storage blocked: it just shows again next time
    }
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    // Normally it ends on its own fade-out (onAnimationEnd); this is only a safety net.
    const id = setTimeout(() => onDone && onDone(), 3500);
    return () => clearTimeout(id);
  }, [ready, onDone]);

  return (
    <div
      className={`af af-splash${ready ? '' : ' af-splash-wait'}`}
      aria-hidden="true"
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && onDone) onDone();
      }}
      style={{ background: theme.palette.custom?.pageBackground || theme.palette.background.default }}
    >
      <div className="af-splash-core">
        <div className="af-splash-ring" style={{ borderColor: alpha(p, 0.6) }} />
        <div className="af-splash-spin">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="af-splash-orbit" style={{ transform: `rotate(${i * 45}deg)` }}>
              <span className="af-splash-coin" style={{ animationDelay: `${i * 0.03}s` }}>
                <CoinSvg />
              </span>
            </span>
          ))}
        </div>
        <img src={logo} alt="" className="af-splash-logo" style={{ boxShadow: `0 0 40px ${alpha(p, 0.45)}` }} />
      </div>
      <div className="af-splash-name" style={{ color: theme.palette.text.primary }}>
        ASH FLOW
      </div>
      <div className="af-splash-bar" style={{ background: alpha(theme.palette.text.primary, 0.12) }}>
        <i style={{ background: theme.palette.custom?.primaryGradient || p }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Count-up number. Writes straight to the DOM (no re-renders); always  */
/* ends on the exact value, formatted like the rest of the app.         */
/* ------------------------------------------------------------------ */
const formatAmount = (n, exact) => (exact ? n : Math.round(n)).toLocaleString('en-IN');

export function CountUp({ value, play = true, duration = 1000 }) {
  const ref = useRef(null);
  const shown = useRef(0);
  const { animationsOn } = useContext(ThemeContext);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const target = Number(value) || 0;

    if (!play) {
      shown.current = 0; // next time it plays, count up from zero again
      el.textContent = formatAmount(target, true);
      return undefined;
    }
    if (!animationsOn || shown.current === target) {
      shown.current = target;
      el.textContent = formatAmount(target, true);
      return undefined;
    }

    const from = shown.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      shown.current = from + (target - from) * eased;
      el.textContent = t < 1 ? formatAmount(shown.current, false) : formatAmount(target, true);
      if (t < 1) raf = requestAnimationFrame(tick);
      else shown.current = target;
    };
    el.textContent = formatAmount(from, false);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, play, duration, animationsOn]);

  return <span ref={ref} />;
}
