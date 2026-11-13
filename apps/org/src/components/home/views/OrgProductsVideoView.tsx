'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { THEME_CHANGE_EVENT, cn } from '@ants/ui';

export interface OrgProductsVideoViewProps {
  /** Destination for Study workspace CTA (retained for backward compatibility) */
  studyUrl?: string;
  /** Destination for Flow planner CTA (retained for backward compatibility) */
  flowUrl?: string;
  /** Route for guest grade & UMS calculator (retained for backward compatibility) */
  calculatorHref?: string;
  /** Route for tutors directory & Telegram QR slots (retained for backward compatibility) */
  teamHref?: string;
  /** Optional external .mp4 / .webm URL (falls back to interactive Canvas-to-video loop when absent or failed) */
  videoUrl?: string;
  /** Optional poster image URL for external videoUrl */
  posterUrl?: string;
  className?: string;
}

interface ProductChapter {
  id: 'study' | 'flow' | 'calculator' | 'telegram';
  indexLabel: string;
  title: string;
  domainLabel: string;
}

interface CanvasPalette {
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  fg: string;
  muted: string;
  accent: string;
  accentTint: string;
  accentText: string;
  success: string;
  successTint: string;
  danger: string;
}

const SCENE_DURATION_MS = 5800;
const TOTAL_SCENES = 4;

// Deterministic 11x11 stylized QR pattern for Scene 04 canvas rendering
const QR_PREVIEW_MATRIX: readonly string[] = [
  '11101010111',
  '10100100101',
  '11101110111',
  '00001010000',
  '10110101101',
  '01001100110',
  '11010110011',
  '00001001010',
  '11101101101',
  '10100101001',
  '11101011011',
];

function readPaletteFromDom(): CanvasPalette {
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  if (isDark) {
    return {
      bg: '#121212',
      surface: '#1A1A1A',
      surfaceElevated: '#232323',
      border: '#2E2D2A',
      fg: '#F5F3EE',
      muted: '#A39E93',
      accent: '#F59E0B',
      accentTint: 'rgba(245, 158, 11, 0.16)',
      accentText: '#FBBF24',
      success: '#10B981',
      successTint: 'rgba(16, 185, 129, 0.16)',
      danger: '#F43F5E',
    };
  }

  return {
    bg: '#FAF9F6',
    surface: '#FFFFFF',
    surfaceElevated: '#F3F1EC',
    border: '#E5E1D8',
    fg: '#1C1917',
    muted: '#6B665E',
    accent: '#D97706',
    accentTint: 'rgba(217, 119, 6, 0.12)',
    accentText: '#B45309',
    success: '#059669',
    successTint: 'rgba(5, 150, 105, 0.12)',
    danger: '#E11D48',
  };
}

function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawOrgProductsFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sceneIndex: number,
  progress: number,
  palette: CanvasPalette
) {
  const ease = easeOutCubic(Math.min(1, progress * 1.45));
  const subEase = easeOutCubic(Math.max(0, (progress - 0.22) * 1.6));
  const thirdEase = easeOutCubic(Math.max(0, (progress - 0.44) * 1.85));

  ctx.clearRect(0, 0, width, height);

  // Studio canvas background matching active Stitch theme
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle top-right ambient radial accent glow
  const glow = ctx.createRadialGradient(
    width * 0.86,
    height * 0.14,
    24,
    width * 0.86,
    height * 0.14,
    width * 0.72
  );
  glow.addColorStop(0, palette.accentTint);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Outer studio window frame inside video
  const padX = 56;
  const frameTop = 62;
  const frameW = width - padX * 2;
  const frameH = height - frameTop - 54;

  ctx.fillStyle = palette.surface;
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, padX, frameTop, frameW, frameH, 16);
  ctx.fill();
  ctx.stroke();

  // Window header bar
  ctx.fillStyle = palette.surfaceElevated;
  drawRoundedRect(ctx, padX + 1, frameTop + 1, frameW - 2, 46, 14);
  ctx.fill();
  ctx.fillStyle = palette.border;
  ctx.fillRect(padX, frameTop + 46, frameW, 1);

  const dotColors = [palette.danger, palette.accent, palette.success];
  dotColors.forEach((c, idx) => {
    ctx.beginPath();
    ctx.arc(padX + 24 + idx * 18, frameTop + 24, 5, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });

  const routeUrls = [
    'study.the-ants.org · WMA11-SET',
    'flow.the-ants.org · 24h Pomodoro Studio',
    'the-ants.org/calculator · No Login Required',
    '@TheANTsFlowBot · /team QR & Cron Bridge',
  ];

  ctx.font = '600 14px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = palette.muted;
  ctx.fillText(routeUrls[sceneIndex] ?? routeUrls[0]!, padX + 88, frameTop + 29);

  // Right badge in simulated browser header
  const badgeText =
    sceneIndex === 2
      ? 'FREE GUEST TOOL'
      : sceneIndex === 3
        ? 'CRON */5 ACTIVE'
        : '.the-ants.org SSO';
  ctx.font = '700 12px "JetBrains Mono", ui-monospace, monospace';
  const badgeW = 148;
  const badgeX = padX + frameW - badgeW - 18;
  ctx.fillStyle = sceneIndex === 2 ? palette.successTint : palette.accentTint;
  ctx.strokeStyle = sceneIndex === 2 ? palette.success : palette.accent;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, badgeX, frameTop + 11, badgeW, 24, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = sceneIndex === 2 ? palette.success : palette.accentText;
  ctx.fillText(badgeText, badgeX + 14, frameTop + 27);

  const innerX = padX + 34;
  const innerY = frameTop + 70;
  const innerW = frameW - 68;
  const innerH = frameH - 92;

  if (sceneIndex === 0) {
    // =========================================================================
    // CHAPTER 01: STUDY — WMA11-SET · YMA01 (P1-P4 + M1 + S1) & 568/600 UMS A*
    // =========================================================================
    ctx.font = '700 20px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = palette.fg;
    ctx.fillText('Edexcel IAL Mathematics Cash-In', innerX, innerY + 18);

    ctx.font = '500 14px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.muted;
    ctx.fillText('WMA11-SET · YMA01 (P1–P4 + M1 + S1)', innerX, innerY + 42);

    // Live accumulating UMS counter
    const totalUms = Math.round(568 * ease);
    ctx.font = '700 20px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.success;
    const scoreStr = `${totalUms} / 600 UMS · ${ease > 0.78 ? 'Grade A*' : 'Calculating…'}`;
    ctx.fillText(scoreStr, innerX + innerW - 275, innerY + 28);

    // 6 Unit Tiles matching screenshot
    const units = [
      { code: 'P1', ums: '96u', mastered: true },
      { code: 'P2', ums: '92u', mastered: true },
      { code: 'P3', ums: '95u', mastered: true },
      { code: 'P4', ums: '94u', mastered: false },
      { code: 'M1', ums: '98u', mastered: true },
      { code: 'S1', ums: '93u', mastered: false },
    ];

    const gap = 14;
    const tileW = (innerW - gap * 5) / 6;
    const tileH = 104;
    const tileY = innerY + 68;

    units.forEach((unit, idx) => {
      const threshold = idx / 6.5;
      const itemEase = easeOutCubic(Math.max(0, (progress * 1.35 - threshold) * 2.4));
      const tx = innerX + idx * (tileW + gap);
      const liftY = tileY + (1 - itemEase) * 14;

      ctx.globalAlpha = 0.25 + 0.75 * itemEase;
      ctx.fillStyle = unit.mastered ? palette.successTint : palette.accentTint;
      ctx.strokeStyle = unit.mastered ? palette.success : palette.accent;
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, tx, liftY, tileW, tileH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 20px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = unit.mastered ? palette.success : palette.accentText;
      ctx.fillText(unit.code, tx + tileW / 2 - 14, liftY + 42);

      ctx.font = '600 15px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.fg;
      ctx.fillText(unit.ums, tx + tileW / 2 - 15, liftY + 68);

      ctx.font = '600 11px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = palette.muted;
      ctx.fillText(
        unit.mastered ? 'Mastered' : 'In Review',
        tx + tileW / 2 - 26,
        liftY + 89
      );
      ctx.globalAlpha = 1;
    });

    // Bottom Summary Meter & Feature Trio
    const meterY = tileY + tileH + 28;
    ctx.fillStyle = palette.surfaceElevated;
    ctx.strokeStyle = palette.border;
    drawRoundedRect(ctx, innerX, meterY, innerW, 74, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 13px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.fg;
    ctx.fillText('14-Unit Suite', innerX + 20, meterY + 28);
    ctx.fillStyle = palette.accentText;
    ctx.fillText('Past Paper Matrix', innerX + 235, meterY + 28);
    ctx.fillStyle = palette.success;
    ctx.fillText('✓ Topic Kanji Grid', innerX + 475, meterY + 28);

    ctx.fillStyle = palette.border;
    drawRoundedRect(ctx, innerX + 20, meterY + 46, innerW - 40, 10, 5);
    ctx.fill();
    ctx.fillStyle = palette.success;
    drawRoundedRect(ctx, innerX + 20, meterY + 46, (innerW - 40) * 0.946 * ease, 10, 5);
    ctx.fill();
  } else if (sceneIndex === 1) {
    // =========================================================================
    // CHAPTER 02: FLOW — 25:00 Chronograph Ring + 24h Time-Blocking Schedule
    // =========================================================================
    const leftW = innerW * 0.38;
    const rightX = innerX + leftW + 26;
    const rightW = innerW - leftW - 26;

    // Left panel: Chronograph card
    ctx.fillStyle = palette.surfaceElevated;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, innerX, innerY + 4, leftW, innerH - 12, 14);
    ctx.fill();
    ctx.stroke();

    const cx = innerX + leftW / 2;
    const cy = innerY + innerH * 0.43;
    const radius = 78;

    // Base track ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 10;
    ctx.stroke();

    // Sweeping amber progress arc
    const startAngle = -Math.PI / 2;
    const arcSpan = Math.PI * 2 * (0.28 + 0.56 * progress);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + arcSpan);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Countdown inside ring
    const secOffset = Math.floor(progress * 28);
    const mins = secOffset === 0 ? 25 : 24;
    const secs = secOffset === 0 ? 0 : 60 - secOffset;
    const timerStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    ctx.font = '700 30px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.fg;
    ctx.fillText(timerStr, cx - 47, cy + 6);

    ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.accentText;
    ctx.fillText('FOCUS SPRINT', cx - 44, cy + 28);

    ctx.font = '600 13px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = palette.muted;
    ctx.fillText('24h Grid · Pomodoro · P1–P4 Tasks', innerX + 26, innerY + innerH - 28);

    // Right panel: 3 Animated 24h Schedule Blocks matching screenshot
    const blocks = [
      {
        title: '06:30 · P1 WMA13',
        meta: '2×25m',
        sub: 'Pure Mathematics 3 · Chain Rule Sprint',
        bg: palette.accentTint,
        border: palette.accent,
        text: palette.accentText,
        reveal: ease,
      },
      {
        title: '09:00 · Physics Lab',
        meta: '90m',
        sub: 'Edexcel WPH12 · Standing Waves Practical',
        bg: palette.surfaceElevated,
        border: palette.border,
        text: palette.fg,
        reveal: subEase,
      },
      {
        title: '20:00 · Past Paper',
        meta: 'TG Ping',
        sub: '@TheANTsFlowBot 10-minute alert armed',
        bg: palette.successTint,
        border: palette.success,
        text: palette.success,
        reveal: thirdEase,
      },
    ];

    blocks.forEach((blk, idx) => {
      const by = innerY + 12 + idx * 92 + (1 - blk.reveal) * 18;
      ctx.globalAlpha = 0.25 + 0.75 * blk.reveal;
      ctx.fillStyle = blk.bg;
      ctx.strokeStyle = blk.border;
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, rightX, by, rightW, 74, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 15px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = blk.text;
      ctx.fillText(blk.title, rightX + 20, by + 30);

      ctx.fillText(blk.meta, rightX + rightW - 86, by + 30);

      ctx.font = '500 13px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = palette.muted;
      ctx.fillText(blk.sub, rightX + 20, by + 54);
      ctx.globalAlpha = 1;
    });

    // Moving current-time red marker across the timeline
    const markerY = innerY + 24 + progress * 215;
    ctx.fillStyle = palette.danger;
    ctx.fillRect(rightX - 10, markerY, rightW + 16, 2);
    ctx.beginPath();
    ctx.arc(rightX - 10, markerY + 1, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (sceneIndex === 2) {
    // =========================================================================
    // CHAPTER 03: GUEST GRADE & UMS CALCULATOR (No Login · Edexcel/CIE/IGCSE)
    // =========================================================================
    ctx.font = '700 20px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = palette.fg;
    ctx.fillText('Guest Grade & UMS Boundary Lookup', innerX, innerY + 18);

    // 3 Syllabus Pill Tabs
    const boards = ['Edexcel IAL', 'CIE A-Level', 'Cambridge IGCSE'];
    boards.forEach((b, idx) => {
      const bx = innerX + idx * 172;
      const active = idx === 0;
      ctx.fillStyle = active ? palette.accentTint : palette.surfaceElevated;
      ctx.strokeStyle = active ? palette.accent : palette.border;
      drawRoundedRect(ctx, bx, innerY + 38, 160, 34, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 12px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = active ? palette.accentText : palette.muted;
      ctx.fillText(b, bx + 16, innerY + 60);
    });

    // Left: Animated Raw Score Slider -> Boundary Threshold Table
    const leftW = innerW * 0.54;
    const panelY = innerY + 92;
    const panelH = innerH - 104;

    ctx.fillStyle = palette.surfaceElevated;
    ctx.strokeStyle = palette.border;
    drawRoundedRect(ctx, innerX, panelY, leftW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    const rawScore = Math.round(50 + 14 * ease);
    ctx.font = '600 13px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = palette.muted;
    ctx.fillText('WMA12 · Pure Maths 2 (Jan / May-Jun Series)', innerX + 18, panelY + 30);

    ctx.font = '700 22px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.fg;
    ctx.fillText(`Raw Mark: ${rawScore} / 75`, innerX + 18, panelY + 64);

    // Animated Slider Bar
    const barW = leftW - 36;
    const thumbRatio = rawScore / 75;
    ctx.fillStyle = palette.border;
    drawRoundedRect(ctx, innerX + 18, panelY + 84, barW, 10, 5);
    ctx.fill();
    ctx.fillStyle = palette.accent;
    drawRoundedRect(ctx, innerX + 18, panelY + 84, barW * thumbRatio, 10, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(innerX + 18 + barW * thumbRatio, panelY + 89, 9, 0, Math.PI * 2);
    ctx.fillStyle = palette.fg;
    ctx.fill();

    // Grade boundary mini badges inside left panel
    const bands = [
      { label: 'A* ≥ 60', min: 60 },
      { label: 'A ≥ 53', min: 53 },
      { label: 'B ≥ 46', min: 46 },
    ];
    bands.forEach((band, idx) => {
      const bx = innerX + 18 + idx * 124;
      const reached = rawScore >= band.min;
      ctx.fillStyle = reached ? palette.successTint : palette.surface;
      ctx.strokeStyle = reached ? palette.success : palette.border;
      drawRoundedRect(ctx, bx, panelY + 122, 112, 38, 8);
      ctx.fill();
      ctx.stroke();
      ctx.font = '700 12px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = reached ? palette.success : palette.muted;
      ctx.fillText(band.label, bx + 18, panelY + 146);
    });

    // Right: Converted UMS Result Card
    const resX = innerX + leftW + 24;
    const resW = innerW - leftW - 24;
    const isAStar = rawScore >= 60;
    const umsVal = Math.round(74 + (rawScore - 50) * (18 / 14));

    ctx.fillStyle = isAStar ? palette.successTint : palette.accentTint;
    ctx.strokeStyle = isAStar ? palette.success : palette.accent;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, resX, panelY, resW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 13px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = isAStar ? palette.success : palette.accentText;
    ctx.fillText('CONVERTED UMS SCORE', resX + 24, panelY + 34);

    ctx.font = '700 54px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.fg;
    ctx.fillText(`${umsVal}`, resX + 24, panelY + 102);

    ctx.font = '700 18px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = isAStar ? palette.success : palette.accentText;
    ctx.fillText(`/ 100 UMS · Grade ${isAStar ? 'A*' : 'A'}`, resX + 105, panelY + 102);

    ctx.font = '600 13px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = palette.muted;
    ctx.fillText(
      'Zero login required · May/Jun & Jan boundary lookup',
      resX + 24,
      panelY + 150
    );
  } else {
    // =========================================================================
    // CHAPTER 04: TELEGRAM QR & 5-MIN WORKER CRON BOT (@TheANTsFlowBot)
    // =========================================================================
    const qrBoxW = 240;
    const qrBoxH = innerH - 12;

    // Left: Tutor Inquiry & Flow Link QR Matrix Card
    ctx.fillStyle = palette.surfaceElevated;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, innerX, innerY + 4, qrBoxW, qrBoxH, 14);
    ctx.fill();
    ctx.stroke();

    // Render crisp geometric QR modules
    const qrSize = 154;
    const qrX = innerX + (qrBoxW - qrSize) / 2;
    const qrY = innerY + 26;
    const cell = qrSize / 11;

    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 10);
    ctx.fill();

    QR_PREVIEW_MATRIX.forEach((row, rIdx) => {
      for (let cIdx = 0; cIdx < row.length; cIdx += 1) {
        if (row[cIdx] === '1') {
          ctx.fillStyle = '#1C1917';
          ctx.fillRect(qrX + cIdx * cell, qrY + rIdx * cell, cell - 1, cell - 1);
        }
      }
    });

    // Animated vertical amber scanner beam across QR
    const scanY = qrY + ((progress * 1.4) % 1) * qrSize;
    ctx.fillStyle = palette.accent;
    ctx.fillRect(qrX - 6, scanY, qrSize + 12, 2.5);

    ctx.font = '700 13px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.accentText;
    ctx.fillText('/start ANT-8N4K', innerX + 54, innerY + innerH - 36);
    ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = palette.muted;
    ctx.fillText('Tutor Slot & Flow Bot QR', innerX + 53, innerY + innerH - 18);

    // Right: Cloudflare Cron Pipeline + Incoming Telegram Alert
    const msgX = innerX + qrBoxW + 26;
    const msgW = innerW - qrBoxW - 26;

    // Cron Dispatcher Header Card
    ctx.fillStyle = palette.surfaceElevated;
    ctx.strokeStyle = palette.border;
    drawRoundedRect(ctx, msgX, innerY + 4, msgW, 76, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 13px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.accentText;
    ctx.fillText('CLOUDFLARE WORKER CRON · */5 * * * *', msgX + 20, innerY + 34);
    ctx.font = '500 13px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = palette.muted;
    ctx.fillText(
      'Dispatches 10-minute lead pings & tutor schedule inquiries',
      msgX + 20,
      innerY + 58
    );

    // Incoming Telegram Message Card Sliding Up
    const pingY = innerY + 104 + (1 - subEase) * 24;
    ctx.globalAlpha = 0.25 + 0.75 * subEase;
    ctx.fillStyle = palette.surfaceElevated;
    ctx.strokeStyle = palette.success;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, msgX, pingY, msgW, innerH - 112, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(msgX + 34, pingY + 38, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '700 16px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = palette.fg;
    ctx.fillText('@TheANTsFlowBot', msgX + 64, pingY + 36);
    ctx.font = '600 12px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = palette.success;
    ctx.fillText('VERIFIED BOT · INSTANT PING', msgX + 64, pingY + 54);

    ctx.font = '700 15px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = palette.fg;
    ctx.fillText('20:00 · Past Paper sprint starts in 10 minutes', msgX + 24, pingY + 100);

    ctx.font = '500 13px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = palette.muted;
    ctx.fillText(
      'Direct tutor booking QR slots also open without login on /team',
      msgX + 24,
      pingY + 128
    );
    ctx.globalAlpha = 1;
  }
}

export function OrgProductsVideoView({
  videoUrl,
  posterUrl,
  className,
}: OrgProductsVideoViewProps) {
  const chapters: ProductChapter[] = [
    {
      id: 'study',
      indexLabel: '01',
      title: 'Study',
      domainLabel: 'study.the-ants.org',
    },
    {
      id: 'flow',
      indexLabel: '02',
      title: 'Flow',
      domainLabel: 'flow.the-ants.org',
    },
    {
      id: 'calculator',
      indexLabel: '03',
      title: 'Guest Grade Calculator',
      domainLabel: 'the-ants.org/calculator',
    },
    {
      id: 'telegram',
      indexLabel: '04',
      title: 'Telegram QR & Bot',
      domainLabel: '@TheANTsFlowBot',
    },
  ];

  const [activeScene, setActiveScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [externalVideoReady, setExternalVideoReady] = useState(false);
  const [externalVideoError, setExternalVideoError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [streamAttached, setStreamAttached] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoStreamRef = useRef<HTMLVideoElement | null>(null);
  const externalVideoRef = useRef<HTMLVideoElement | null>(null);
  const sceneStartRef = useRef<number>(0);
  const currentSceneRef = useRef<number>(0);
  const progressRef = useRef<number>(0);

  const useExternalVideo = Boolean(videoUrl && !externalVideoError);

  useEffect(() => {
    currentSceneRef.current = activeScene;
  }, [activeScene]);

  // Attach canvas.captureStream(30) into a real HTML5 <video> element in browsers supporting MediaStream capture
  useEffect(() => {
    if (useExternalVideo && externalVideoReady) return;
    const canvas = canvasRef.current as
      | (HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream })
      | null;
    const videoEl = videoStreamRef.current;
    if (!canvas || !videoEl || typeof canvas.captureStream !== 'function') return;

    try {
      const stream = canvas.captureStream(30);
      videoEl.srcObject = stream;
      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => undefined);
      }
      setStreamAttached(true);
      return () => {
        stream.getTracks().forEach((track) => track.stop());
      };
    } catch {
      setStreamAttached(false);
    }
  }, [useExternalVideo, externalVideoReady]);

  // Render live Stitch Light / Amber Dark adaptive 60fps 4-chapter showcase reel
  useEffect(() => {
    if (useExternalVideo && externalVideoReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let palette = readPaletteFromDom();
    const handleThemeChange = () => {
      palette = readPaletteFromDom();
    };
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    let rafId = 0;
    sceneStartRef.current = performance.now() - progressRef.current * SCENE_DURATION_MS;

    const renderLoop = (now: number) => {
      if (isPlaying) {
        const elapsed = now - sceneStartRef.current;
        if (elapsed >= SCENE_DURATION_MS) {
          const next = (currentSceneRef.current + 1) % TOTAL_SCENES;
          currentSceneRef.current = next;
          progressRef.current = 0;
          sceneStartRef.current = now;
          setActiveScene(next);
          setProgress(0);
          drawOrgProductsFrame(ctx, canvas.width, canvas.height, next, 0, palette);
        } else {
          const p = elapsed / SCENE_DURATION_MS;
          const prevQuantized = Math.floor(progressRef.current * 40);
          const nextQuantized = Math.floor(p * 40);
          progressRef.current = p;
          if (nextQuantized !== prevQuantized) {
            setProgress(p);
          }
          drawOrgProductsFrame(
            ctx,
            canvas.width,
            canvas.height,
            currentSceneRef.current,
            p,
            palette
          );
        }
      } else {
        drawOrgProductsFrame(
          ctx,
          canvas.width,
          canvas.height,
          currentSceneRef.current,
          progressRef.current,
          palette
        );
      }

      if (isPlaying) {
        rafId = window.requestAnimationFrame(renderLoop);
      }
    };

    drawOrgProductsFrame(
      ctx,
      canvas.width,
      canvas.height,
      currentSceneRef.current,
      progressRef.current,
      palette
    );

    if (isPlaying) {
      rafId = window.requestAnimationFrame(renderLoop);
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      observer.disconnect();
    };
  }, [isPlaying, useExternalVideo, externalVideoReady]);

  const handleSelectChapter = (idx: number) => {
    setActiveScene(idx);
    currentSceneRef.current = idx;
    progressRef.current = 0;
    sceneStartRef.current = performance.now();
    setProgress(0);

    if (useExternalVideo && externalVideoRef.current && externalVideoRef.current.duration) {
      externalVideoRef.current.currentTime =
        (idx / TOTAL_SCENES) * externalVideoRef.current.duration;
    }
  };

  const handleTogglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);

    if (useExternalVideo && externalVideoRef.current) {
      if (next) {
        externalVideoRef.current.play().catch(() => undefined);
      } else {
        externalVideoRef.current.pause();
      }
    } else if (next) {
      sceneStartRef.current = performance.now() - progressRef.current * SCENE_DURATION_MS;
    }
  };

  const activeChapter = chapters[activeScene] ?? chapters[0]!;

  return (
    <div className={cn('relative w-full', className)} data-testid="org-products-video">
      {/* Widescreen Video Stage (Dual-Mode: Optional External .mp4/.webm + Live Captured Canvas Stream) */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-surface-card shadow-[var(--shadow-tier-2)]">
        {useExternalVideo && (
          <video
            ref={externalVideoRef}
            src={videoUrl}
            poster={posterUrl}
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={() => setExternalVideoReady(true)}
            onError={() => setExternalVideoError(true)}
            className={cn(
              'h-full w-full object-cover',
              externalVideoReady ? 'block' : 'hidden'
            )}
          />
        )}

        {(!useExternalVideo || !externalVideoReady) && (
          <>
            <canvas
              ref={canvasRef}
              width={960}
              height={540}
              aria-hidden={streamAttached ? 'true' : undefined}
              aria-label={
                streamAttached
                  ? undefined
                  : 'The ANTs products interactive video walkthrough: Study, Flow, Guest Grade Calculator, and Telegram QR alerts'
              }
              className={cn(
                'h-full w-full object-cover',
                streamAttached ? 'hidden' : 'block'
              )}
            />
            <video
              ref={videoStreamRef}
              autoPlay
              muted
              playsInline
              aria-label="The ANTs products live video walkthrough across Study, Flow, Guest Grade Calculator, and Telegram QR"
              className={cn(
                'h-full w-full object-cover',
                streamAttached ? 'block' : 'hidden'
              )}
            />
          </>
        )}

        {/* Top Chrome Overlay: Active Chapter Indicator + Minimal Play/Pause Toggle */}
        <div className="pointer-events-none absolute inset-x-3.5 top-3.5 flex items-center justify-between gap-2">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="font-mono text-on-primary-tint">
              {activeChapter.indexLabel}/0{TOTAL_SCENES}
            </span>
            <span className="truncate">{activeChapter.title}</span>
            <span className="hidden sm:inline font-mono text-[11px] text-foreground-muted">
              · {activeChapter.domainLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'Pause products video' : 'Play products video'}
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/85 text-foreground backdrop-blur-xs transition-colors hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Bottom 4-Segment Timeline Scrubber */}
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-4 gap-1.5 bg-background/75 px-3.5 py-2 backdrop-blur-xs">
          {chapters.map((chapter, idx) => {
            const fillPct =
              idx < activeScene ? 100 : idx === activeScene ? Math.round(progress * 100) : 0;
            return (
              <button
                key={chapter.id}
                type="button"
                aria-label={`Jump to chapter ${chapter.indexLabel}: ${chapter.title}`}
                onClick={() => handleSelectChapter(idx)}
                className="group py-1 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-full"
              >
                <div className="h-1 w-full overflow-hidden rounded-full bg-border group-hover:bg-border-hover transition-colors">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-75"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
