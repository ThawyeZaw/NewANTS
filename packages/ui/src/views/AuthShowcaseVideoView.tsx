'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarClock,
  FileSpreadsheet,
  GraduationCap,
  Pause,
  Play,
  Send,
  Timer,
} from 'lucide-react';
import type { EcosystemAppId } from '../mocks/ecosystem-chrome.mock';
import { THEME_CHANGE_EVENT } from '../primitives/ThemeToggle';
import { cn } from '../utils/cn';

export interface AuthVideoChapter {
  id: string;
  label: string;
  code: string;
  icon: React.ReactNode;
}

export interface AuthShowcaseVideoViewProps {
  /** Host workspace app ('flow' | 'study') */
  app?: EcosystemAppId;
  /** Optional external .mp4 / .webm URL (falls back seamlessly to interactive canvas-video loop if absent or offline) */
  videoUrl?: string;
  /** Optional poster image URL when external videoUrl is supplied */
  posterUrl?: string;
  className?: string;
}

const SCENE_DURATION_MS = 5500;
const TOTAL_SCENES = 3;

export const FLOW_VIDEO_CHAPTERS: AuthVideoChapter[] = [
  {
    id: 'timetable',
    label: 'Timetable & Tasks',
    code: 'D1 SYNC',
    icon: <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: 'cron',
    label: '@TheANTsFlowBot Cron',
    code: '*/5 CRON',
    icon: <Send className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: 'bridge',
    label: 'Study SSO Bridge',
    code: 'SSO',
    icon: <Timer className="h-3.5 w-3.5" aria-hidden="true" />,
  },
];

export const STUDY_VIDEO_CHAPTERS: AuthVideoChapter[] = [
  {
    id: 'topics',
    label: 'WMA11-SET Mastery',
    code: '14 UNITS',
    icon: <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: 'papers',
    label: 'Past Paper UMS',
    code: 'RAW→UMS',
    icon: <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: 'handoff',
    label: 'Flow Sprint Sync',
    code: 'SSO',
    icon: <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />,
  },
];

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

function drawShowcaseFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  app: EcosystemAppId,
  sceneIndex: number,
  progress: number,
  palette: CanvasPalette
) {
  const ease = easeOutCubic(Math.min(1, progress * 1.45));
  const subEase = easeOutCubic(Math.max(0, (progress - 0.25) * 1.6));
  const thirdEase = easeOutCubic(Math.max(0, (progress - 0.45) * 1.8));

  ctx.clearRect(0, 0, width, height);

  // Clean studio background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient vignette in accent corner
  const glow = ctx.createRadialGradient(
    width * 0.85,
    height * 0.15,
    20,
    width * 0.85,
    height * 0.15,
    width * 0.75
  );
  glow.addColorStop(0, palette.accentTint);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Top chrome strip inside video frame
  const padX = 44;
  const frameTop = 58;
  const frameW = width - padX * 2;
  const frameH = height - frameTop - 52;

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = palette.surface;
  drawRoundedRect(ctx, padX, frameTop, frameW, frameH, 16);
  ctx.fill();
  ctx.stroke();

  // Window header line inside simulated app frame
  ctx.fillStyle = palette.surfaceElevated;
  drawRoundedRect(ctx, padX + 1, frameTop + 1, frameW - 2, 42, 14);
  ctx.fill();
  ctx.fillStyle = palette.border;
  ctx.fillRect(padX, frameTop + 42, frameW, 1);

  // Three window control dots
  const dotColors = [palette.danger, palette.accent, palette.success];
  dotColors.forEach((c, idx) => {
    ctx.beginPath();
    ctx.arc(padX + 22 + idx * 16, frameTop + 21, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });

  // Top bar URL / path pill
  ctx.font = '600 13px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = palette.muted;
  const routeUrl =
    app === 'flow'
      ? sceneIndex === 0
        ? 'flow.the-ants.org/timetable'
        : sceneIndex === 1
          ? '@TheANTsFlowBot · Webhook'
          : 'study.the-ants.org ↔ flow.the-ants.org'
      : sceneIndex === 0
        ? 'study.the-ants.org/curriculum/WMA11-SET'
        : sceneIndex === 1
          ? 'study.the-ants.org/past-papers'
          : 'study.the-ants.org/countdown → Flow';
  ctx.fillText(routeUrl, padX + 78, frameTop + 26);

  const innerX = padX + 26;
  const innerY = frameTop + 62;
  const innerW = frameW - 52;
  const innerH = frameH - 80;

  if (app === 'flow') {
    if (sceneIndex === 0) {
      // Scene 1: 24h Smart Timetable + P1 Task Sync
      const leftColW = innerW * 0.62;
      const rightColX = innerX + leftColW + 18;
      const rightColW = innerW - leftColW - 18;

      // Hourly rows
      const hours = ['08:00', '09:00', '10:00', '11:00', '12:00'];
      const rowH = innerH / hours.length;
      ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
      hours.forEach((h, i) => {
        const y = innerY + i * rowH;
        ctx.fillStyle = palette.border;
        ctx.fillRect(innerX + 54, y + 8, leftColW - 54, 1);
        ctx.fillStyle = palette.muted;
        ctx.fillText(h, innerX, y + 12);
      });

      // Block 1: Animated slide-in time block
      const blkY = innerY + 14 - (1 - ease) * 18;
      ctx.globalAlpha = ease;
      ctx.fillStyle = palette.accentTint;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, innerX + 64, blkY, leftColW - 76, rowH * 1.75, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = palette.fg;
      ctx.font = '700 14px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('Pure Maths 2 · Timed Paper', innerX + 78, blkY + 26);
      ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.accentText;
      ctx.fillText('08:15 – 09:45 · P1 · 2x Pomodoro', innerX + 78, blkY + 47);

      // Block 2: Transition Buffer
      const bufY = innerY + rowH * 2 + 4;
      ctx.globalAlpha = subEase;
      ctx.fillStyle = palette.surfaceElevated;
      ctx.strokeStyle = palette.border;
      drawRoundedRect(ctx, innerX + 64, bufY, leftColW - 76, 36, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.muted;
      ctx.font = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('15m Transition Buffer (Auto-Protected)', innerX + 78, bufY + 22);

      // Block 3: Deep Work
      const blk3Y = innerY + rowH * 3 + 2;
      ctx.globalAlpha = thirdEase;
      ctx.fillStyle = palette.successTint;
      ctx.strokeStyle = palette.success;
      drawRoundedRect(ctx, innerX + 64, blk3Y, leftColW - 76, rowH * 1.4, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.fg;
      ctx.font = '700 14px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('Physics WPH12 · Wave Revision', innerX + 78, blk3Y + 26);
      ctx.globalAlpha = 1;

      // Live current-time red hairline indicator sweeping down
      const lineY = innerY + 22 + progress * 90;
      ctx.fillStyle = palette.danger;
      ctx.fillRect(innerX + 58, lineY, leftColW - 64, 2);
      ctx.beginPath();
      ctx.arc(innerX + 58, lineY + 1, 4, 0, Math.PI * 2);
      ctx.fill();

      // Right pane: P1-P4 Quick Tasks Check-Off
      ctx.fillStyle = palette.surfaceElevated;
      ctx.strokeStyle = palette.border;
      drawRoundedRect(ctx, rightColX, innerY + 4, rightColW, innerH - 12, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = palette.fg;
      ctx.font = '700 13px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('Today Focus · P1–P4', rightColX + 16, innerY + 28);

      const tasks = [
        { code: 'P1', title: 'Jan 25 Paper 2', done: thirdEase > 0.6 },
        { code: 'P2', title: 'Mechanics Drill', done: false },
        { code: 'P3', title: 'Flashcard SRS', done: false },
      ];
      tasks.forEach((task, idx) => {
        const ty = innerY + 46 + idx * 58;
        ctx.fillStyle = palette.surface;
        ctx.strokeStyle = task.done ? palette.success : palette.border;
        drawRoundedRect(ctx, rightColX + 14, ty, rightColW - 28, 46, 8);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(rightColX + 32, ty + 23, 7, 0, Math.PI * 2);
        if (task.done) {
          ctx.fillStyle = palette.success;
          ctx.fill();
        } else {
          ctx.strokeStyle = palette.accent;
          ctx.stroke();
        }

        ctx.font = '700 11px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillStyle = task.done ? palette.success : palette.accentText;
        ctx.fillText(task.code, rightColX + 48, ty + 20);
        ctx.font = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillStyle = palette.fg;
        ctx.fillText(task.title, rightColX + 48, ty + 36);
      });
    } else if (sceneIndex === 1) {
      // Scene 2: @TheANTsFlowBot 5-Minute Worker Cron Reminders
      const cardW = innerW * 0.72;
      const cardX = innerX + (innerW - cardW) / 2;

      // Timeline pulse node at top
      ctx.fillStyle = palette.surfaceElevated;
      ctx.strokeStyle = palette.border;
      drawRoundedRect(ctx, cardX, innerY + 8, cardW, 56, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 12px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.accentText;
      ctx.fillText('CLOUDFLARE WORKER CRON · */5 * * * *', cardX + 20, innerY + 32);
      ctx.font = '500 12px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = palette.muted;
      ctx.fillText('Dispatching 10m lead reminder queue to Telegram', cardX + 20, innerY + 50);

      // Animated Telegram Ping Card sliding up
      const msgY = innerY + 86 + (1 - subEase) * 28;
      ctx.globalAlpha = subEase;
      ctx.fillStyle = palette.surfaceElevated;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, cardX, msgY, cardW, 134, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.arc(cardX + 32, msgY + 32, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.fg;
      ctx.font = '700 15px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('@TheANTsFlowBot', cardX + 58, msgY + 30);
      ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.success;
      ctx.fillText('VERIFIED · /start ANT-8N4K', cardX + 58, msgY + 48);

      ctx.fillStyle = palette.fg;
      ctx.font = '600 14px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('Starting in 10m: Pure Maths 2 Mock Sprint', cardX + 22, msgY + 86);
      ctx.font = '500 13px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = palette.muted;
      ctx.fillText('Daily digest 06:30 · Study exam countdown alerts ON', cardX + 22, msgY + 110);
      ctx.globalAlpha = 1;
    } else {
      // Scene 3: Cross-App Study <-> Flow SSO Bridge
      const leftX = innerX + 16;
      const boxW = (innerW - 112) / 2;
      const rightX = leftX + boxW + 80;
      const boxY = innerY + 26;
      const boxH = innerH - 52;

      // Study Source Box
      ctx.fillStyle = palette.surfaceElevated;
      ctx.strokeStyle = palette.border;
      drawRoundedRect(ctx, leftX, boxY, boxW, boxH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 14px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = palette.fg;
      ctx.fillText('Study Countdowns', leftX + 18, boxY + 30);
      ctx.font = '700 13px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.danger;
      ctx.fillText('WMA11 · 12d 01h left', leftX + 18, boxY + 66);
      ctx.fillStyle = palette.accentText;
      ctx.fillText('WPH11 · 19d 04h left', leftX + 18, boxY + 96);
      ctx.fillStyle = palette.success;
      ctx.fillText('0580/42 · 31d left', leftX + 18, boxY + 126);

      // Animated SSO Bridge Beam in middle
      const midY = boxY + boxH / 2;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(leftX + boxW + 8, midY);
      ctx.lineTo(leftX + boxW + 8 + 64 * ease, midY);
      ctx.stroke();

      const pulseX = leftX + boxW + 12 + ((progress * 140) % 56);
      ctx.beginPath();
      ctx.arc(pulseX, midY, 5, 0, Math.PI * 2);
      ctx.fillStyle = palette.accent;
      ctx.fill();

      // Flow Target Box
      ctx.globalAlpha = subEase;
      ctx.fillStyle = palette.surfaceElevated;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, rightX, boxY, boxW, boxH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 14px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = palette.fg;
      ctx.fillText('Flow Calendar Sync', rightX + 18, boxY + 30);
      ctx.font = '600 12px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.accentText;
      ctx.fillText('.the-ants.org SSO ACTIVE', rightX + 18, boxY + 58);
      ctx.fillStyle = palette.fg;
      ctx.font = '600 13px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('+25 XP Focus Sprint Logged', rightX + 18, boxY + 96);
      ctx.fillStyle = palette.success;
      ctx.fillText('Streak & Timetable Merged', rightX + 18, boxY + 124);
      ctx.globalAlpha = 1;
    }
  } else {
    // Study Showcase Scenes
    if (sceneIndex === 0) {
      // Scene 1: WMA11-SET 14-Unit Cash-In + Topic Mastery Bar
      const units = ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WST01', 'WME01'];
      const chipW = (innerW - 40) / 3;
      const chipH = 54;

      units.forEach((unit, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const cx = innerX + col * (chipW + 20);
        const cy = innerY + 10 + row * (chipH + 14);
        const lit = progress * 6 >= idx;

        ctx.fillStyle = lit ? palette.accentTint : palette.surfaceElevated;
        ctx.strokeStyle = lit ? palette.accent : palette.border;
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, cx, cy, chipW, chipH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.font = '700 14px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillStyle = lit ? palette.accentText : palette.fg;
        ctx.fillText(unit, cx + 16, cy + 28);
        ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillStyle = palette.muted;
        ctx.fillText(lit ? 'YMA01 Selected ✓' : 'Available Unit', cx + 16, cy + 44);
      });

      // Bottom Progress Track
      const barY = innerY + 158;
      ctx.fillStyle = palette.surfaceElevated;
      ctx.strokeStyle = palette.border;
      drawRoundedRect(ctx, innerX, barY, innerW, 56, 12);
      ctx.fill();
      ctx.stroke();

      const pct = Math.round(68 * ease);
      ctx.font = '700 13px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = palette.fg;
      ctx.fillText(`Syllabus Mastery · ${pct}% (WMA11–WMA14)`, innerX + 18, barY + 24);
      ctx.font = '700 12px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.success;
      ctx.fillText('+10 XP / topic', innerX + innerW - 122, barY + 24);

      ctx.fillStyle = palette.border;
      drawRoundedRect(ctx, innerX + 18, barY + 36, innerW - 36, 8, 4);
      ctx.fill();
      ctx.fillStyle = palette.accent;
      drawRoundedRect(ctx, innerX + 18, barY + 36, (innerW - 36) * 0.68 * ease, 8, 4);
      ctx.fill();
    } else if (sceneIndex === 1) {
      // Scene 2: Past Paper Matrix + Raw -> UMS Live Conversion
      const series = ['MJ 25', 'JF 25', 'ON 24', 'MJ 24'];
      const colW = (innerW - 110) / series.length;
      const cellH = 44;

      ctx.font = '600 12px "JetBrains Mono", ui-monospace, monospace';
      series.forEach((s, i) => {
        ctx.fillStyle = palette.muted;
        ctx.fillText(s, innerX + 114 + i * colW + 18, innerY + 20);
      });

      const rows = ['WMA11 P1', 'WMA12 P2', 'WST01 S1'];
      rows.forEach((r, rIdx) => {
        const ry = innerY + 34 + rIdx * (cellH + 8);
        ctx.fillStyle = palette.fg;
        ctx.fillText(r, innerX, ry + 26);

        series.forEach((_, cIdx) => {
          const cx = innerX + 110 + cIdx * colW;
          const highlight = rIdx === 0 && cIdx === 1;
          ctx.fillStyle = highlight ? palette.successTint : palette.surfaceElevated;
          ctx.strokeStyle = highlight ? palette.success : palette.border;
          drawRoundedRect(ctx, cx, ry, colW - 8, cellH, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = highlight ? palette.success : palette.muted;
          ctx.fillText(highlight ? '64/75 A*' : rIdx === 1 && cIdx === 0 ? '61/75 A' : 'Logged', cx + 12, ry + 27);
        });
      });

      // Live Boundary Strip
      const resY = innerY + 194;
      ctx.globalAlpha = subEase;
      ctx.fillStyle = palette.accentTint;
      ctx.strokeStyle = palette.accent;
      drawRoundedRect(ctx, innerX, resY, innerW, 38, 10);
      ctx.fill();
      ctx.stroke();
      ctx.font = '700 13px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.accentText;
      ctx.fillText('RAW 64/75  →  92 UMS  (Grade A*)  ·  +25 XP Earned', innerX + 18, resY + 24);
      ctx.globalAlpha = 1;
    } else {
      // Scene 3: Exam Countdown Clock -> Flow Pomodoro Handoff
      ctx.fillStyle = palette.surfaceElevated;
      ctx.strokeStyle = palette.border;
      drawRoundedRect(ctx, innerX, innerY + 12, innerW, 104, 14);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 12px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.danger;
      ctx.fillText('NEXT EXAM · EDEXCEL IAL WMA11', innerX + 20, innerY + 38);

      const secTick = 59 - (Math.floor(progress * 15) % 60);
      const clockStr = `12d  01h  14m  ${String(secTick).padStart(2, '0')}s`;
      ctx.font = '700 32px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.fg;
      ctx.fillText(clockStr, innerX + 20, innerY + 84);

      ctx.globalAlpha = subEase;
      ctx.fillStyle = palette.accentTint;
      ctx.strokeStyle = palette.accent;
      drawRoundedRect(ctx, innerX, innerY + 134, innerW, 74, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 14px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = palette.fg;
      ctx.fillText('Auto-Synced to Flow Timetable & Pomodoro Studio', innerX + 20, innerY + 164);
      ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = palette.accentText;
      ctx.fillText('Target: A* · Launch 2x 25m Revision Sprint ↗', innerX + 20, innerY + 188);
      ctx.globalAlpha = 1;
    }
  }
}

export function AuthShowcaseVideoView({
  app = 'flow',
  videoUrl,
  posterUrl,
  className,
}: AuthShowcaseVideoViewProps) {
  const chapters = app === 'flow' ? FLOW_VIDEO_CHAPTERS : STUDY_VIDEO_CHAPTERS;
  const [activeScene, setActiveScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [externalVideoReady, setExternalVideoReady] = useState(false);
  const [externalVideoError, setExternalVideoError] = useState(false);
  const [progress, setProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoStreamRef = useRef<HTMLVideoElement | null>(null);
  const externalVideoRef = useRef<HTMLVideoElement | null>(null);
  const sceneStartRef = useRef<number>(0);
  const currentSceneRef = useRef<number>(0);
  const progressRef = useRef<number>(0);
  const [streamAttached, setStreamAttached] = useState(false);

  const useExternalVideo = Boolean(videoUrl && !externalVideoError);

  useEffect(() => {
    currentSceneRef.current = activeScene;
  }, [activeScene]);

  // Attach canvas captureStream(30) to a real <video> element when browser supports it
  useEffect(() => {
    if (useExternalVideo && externalVideoReady) return;
    const canvas = canvasRef.current as (HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }) | null;
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

  // Animate 60fps product video loop across 3 tailored scenes
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
          setActiveScene(next);
          sceneStartRef.current = now;
          setProgress(0);
          drawShowcaseFrame(ctx, canvas.width, canvas.height, app, next, 0, palette);
        } else {
          const p = elapsed / SCENE_DURATION_MS;
          const prevQuantized = Math.floor(progressRef.current * 40);
          const nextQuantized = Math.floor(p * 40);
          progressRef.current = p;
          if (nextQuantized !== prevQuantized) {
            setProgress(p);
          }
          drawShowcaseFrame(
            ctx,
            canvas.width,
            canvas.height,
            app,
            currentSceneRef.current,
            p,
            palette
          );
        }
      } else {
        drawShowcaseFrame(
          ctx,
          canvas.width,
          canvas.height,
          app,
          currentSceneRef.current,
          progressRef.current,
          palette
        );
      }

      if (isPlaying) {
        rafId = window.requestAnimationFrame(renderLoop);
      }
    };

    // Draw initial frame immediately
    drawShowcaseFrame(
      ctx,
      canvas.width,
      canvas.height,
      app,
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
  }, [app, isPlaying, useExternalVideo, externalVideoReady]);

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

  const activeChapter = chapters[activeScene] ?? chapters[0];

  return (
    <div className={cn('space-y-3', className)} data-testid="auth-showcase-video">
      {/* Main Video Frame (Dual-Mode: External .mp4/.webm + Live Captured Canvas Stream) */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-surface-card shadow-[var(--shadow-tier-2)]">
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
              width={720}
              height={450}
              aria-hidden={streamAttached ? 'true' : undefined}
              aria-label={
                streamAttached
                  ? undefined
                  : `${app === 'flow' ? 'Flow' : 'Study'} interactive product video preview`
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
              aria-label={`${app === 'flow' ? 'Flow' : 'Study'} interactive feature walkthrough video`}
              className={cn(
                'h-full w-full object-cover',
                streamAttached ? 'block' : 'hidden'
              )}
            />
          </>
        )}

        {/* Top Bar Overlay: Subtle Scene Pill + Play/Pause Control */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="font-mono text-on-primary-tint">
              0{activeScene + 1}/0{TOTAL_SCENES}
            </span>
            <span className="truncate">{activeChapter?.label}</span>
          </div>

          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'Pause showcase video' : 'Play showcase video'}
            className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/85 text-foreground backdrop-blur-xs transition-colors hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Bottom 3-Segment Timeline Scrubber */}
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 gap-1 bg-background/70 px-3 py-1.5 backdrop-blur-xs">
          {chapters.map((chapter, idx) => {
            const fillPct =
              idx < activeScene ? 100 : idx === activeScene ? Math.round(progress * 100) : 0;
            return (
              <button
                key={chapter.id}
                type="button"
                aria-label={`Jump to ${chapter.label}`}
                onClick={() => handleSelectChapter(idx)}
                className="group py-1 text-left focus-visible:outline-none"
              >
                <div className="h-1 w-full overflow-hidden rounded-full bg-border">
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

      {/* 3 Clickable Scene Chapter Pills (Replaces Long Copy Paragraphs) */}
      <div
        role="tablist"
        aria-label="Video chapters"
        className="grid grid-cols-3 gap-2"
      >
        {chapters.map((chapter, idx) => {
          const active = idx === activeScene;
          return (
            <button
              key={chapter.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectChapter(idx)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                  : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover hover:text-foreground'
              )}
            >
              <span className="shrink-0">{chapter.icon}</span>
              <span className="truncate">{chapter.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
