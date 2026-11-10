'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock,
  Flame,
  Search,
  Sparkles,
  Timer,
} from 'lucide-react';
import {
  MOCK_DESIGN_SYSTEM_DATA,
  type DesignSystemShowcaseMockData,
} from '../mocks/design-system.mock';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../primitives/Card';
import { Checkbox } from '../primitives/Checkbox';
import { Input } from '../primitives/Input';
import { Modal } from '../primitives/Modal';
import { Tabs } from '../primitives/Tabs';
import { ThemeToggle, type ThemeMode } from '../primitives/ThemeToggle';
import { AppSwitcher } from './AppSwitcher';
import { AuthFormView } from './AuthFormView';
import { BrandHeaderBadge } from './BrandHeaderBadge';
import { UserMenuView } from './UserMenuView';

export interface DesignSystemShowcaseViewProps {
  /** Mock or live showcase dataset */
  data?: DesignSystemShowcaseMockData;
  /** Optional initial theme */
  defaultTheme?: ThemeMode;
}

export function DesignSystemShowcaseView({
  data = MOCK_DESIGN_SYSTEM_DATA,
  defaultTheme = 'light',
}: DesignSystemShowcaseViewProps) {
  const [checklist, setChecklist] = useState(data.sampleChecklist);
  const [searchQuery, setSearchQuery] = useState('');
  const [rawScore, setRawScore] = useState('68');
  const [pomodoroMode, setPomodoroMode] = useState('focus');
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleItem = (id: string, checked: boolean) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: checked } : item))
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="active-filter" code="ZYY-1.1">
                @ants/ui Core Primitives
              </Badge>
              <Badge variant="verified" dot>
                Paired Stitch Tokens Ready
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              The ANTs Ecosystem · Design System Studio
            </h1>
            <p className="text-sm text-foreground-muted max-w-2xl">
              Paired semantic tokens bridging{' '}
              <span className="font-semibold text-foreground">{data.systemNameLight}</span>{' '}
              (Light) and{' '}
              <span className="font-semibold text-primary">{data.systemNameDark}</span>{' '}
              (Dark) across <span className="font-mono">the-ants.org</span>,{' '}
              <span className="font-mono">flow.the-ants.org</span>, and{' '}
              <span className="font-mono">study.the-ants.org</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/calculator"
              className="inline-flex items-center gap-2 rounded-lg border border-primary-tint-border bg-primary-tint px-3.5 py-2 text-xs font-bold text-on-primary-tint transition-colors hover:bg-primary hover:text-on-primary"
            >
              <Calculator className="h-4 w-4" />
              <span>Open Grade Calculator (/calculator)</span>
            </a>
            <ThemeToggle defaultTheme={defaultTheme} showLabel />
            <AppSwitcher currentApp="org" useLocalUrls />
            <UserMenuView />
          </div>
        </div>

        {/* Section Tabs (Underline Editorial Variant) */}
        <Tabs
          variant="underline"
          value={activeTab}
          onValueChange={setActiveTab}
          items={[
            {
              value: 'overview',
              label: 'Core Primitives (ZYY-1.1)',
              icon: <BookOpen className="h-4 w-4" />,
              badge: '8',
            },
            {
              value: 'chrome',
              label: 'Ecosystem Chrome & Auth (ZYY-1.2)',
              icon: <Sparkles className="h-4 w-4" />,
              badge: '4',
            },
            {
              value: 'subjects',
              label: 'Subject Cards',
              icon: <Calculator className="h-4 w-4" />,
              badge: String(data.sampleSubjects.length),
            },
          ]}
        />

        {activeTab === 'chrome' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                action={
                  <Badge variant="verified" dot>
                    ZYY-1.2
                  </Badge>
                }
              >
                <CardTitle>Ecosystem Header Chrome & 9-Dot Switcher</CardTitle>
                <CardDescription>
                  Shared across The ANTs (the-ants.org), Flow (flow.the-ants.org), and Study (study.the-ants.org).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3 rounded-xl border border-border bg-surface-inset/50 p-4">
                  <p className="label-caps text-foreground-subtle">
                    STANDALONE PRODUCT ENDORSEMENT HEADERS
                  </p>
                  <div className="flex flex-wrap items-center gap-6">
                    <BrandHeaderBadge app="flow" showEndorsement />
                    <BrandHeaderBadge app="study" showEndorsement />
                    <BrandHeaderBadge app="org" showEndorsement={false} />
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-surface-inset/50 p-4">
                  <p className="label-caps text-foreground-subtle">
                    GUEST VS AUTHENTICATED USER MENU STATES
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <UserMenuView user={null} />
                    <UserMenuView />
                  </div>
                </div>
              </CardContent>
            </Card>

            <AuthFormView app="study" />
          </div>
        )}

        {/* Grid of Interactive Primitives */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 1. Buttons & Badges */}
          <Card>
            <CardHeader
              action={
                <Badge variant="deadline" dot mono>
                  EXAM IN 14D
                </Badge>
              }
            >
              <CardTitle>Buttons & Semantic Badges</CardTitle>
              <CardDescription>
                Tactile controls with active press scale and monospace syllabus tags.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="primary" leftIcon={<Flame className="h-4 w-4" />}>
                  Primary Action
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Amber Outline</Button>
                <Button variant="destructive">Urgent / Reset</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="primary" size="sm" isLoading>
                  Saving
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-subtle">
                <Badge variant="editorial">Editorial Tag</Badge>
                <Badge variant="subject" code="WMA11">
                  Pure Maths 1
                </Badge>
                <Badge variant="verified" dot>
                  Verified Solution
                </Badge>
                <Badge variant="active-filter">Active Filter</Badge>
                <Badge variant="deadline" dot mono>
                  00:24:59
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 2. Inputs & Quantitative Monospace Fields */}
          <Card>
            <CardHeader
              action={
                <Badge variant="subject" mono>
                  RAW → UMS
                </Badge>
              }
            >
              <CardTitle>Inputs & Quantitative Fields</CardTitle>
              <CardDescription>
                Plus Jakarta Sans for copy and JetBrains Mono for raw marks & syllabus codes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Search Syllabus or Topic"
                placeholder="e.g. WMA11 Differentiation, 9702 Kinematics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                hint="Filters across Cambridge IGCSE, AS/A-Level & Edexcel IAL."
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Raw Paper Mark (Max 75)"
                  mono
                  value={rawScore}
                  onChange={(e) => setRawScore(e.target.value)}
                  rightIcon={<span className="font-mono text-xs">/ 75</span>}
                  hint="Auto-derives UMS & Grade pill"
                />
                <Input
                  label="Invalid Boundary Demo"
                  mono
                  defaultValue="105"
                  error="Raw mark cannot exceed 75 for WMA11."
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Checkboxes & Topic Checklist */}
          <Card>
            <CardHeader
              action={
                <Badge variant="verified" mono>
                  {checklist.filter((i) => i.completed).length}/{checklist.length} MASTERED
                </Badge>
              }
            >
              <CardTitle>Interactive Topic & Task Checkboxes</CardTitle>
              <CardDescription>
                Used across Study Topic Tracker and Flow Task Planner.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-inset/40 px-3.5 py-2.5"
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={(checked) => toggleItem(item.id, checked)}
                    strikeWhenChecked
                    label={
                      <span className="inline-flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {item.code}
                        </span>
                        <span>{item.title}</span>
                      </span>
                    }
                    description={item.unit}
                  />
                  <Badge variant={item.completed ? 'verified' : 'editorial'}>
                    {item.completed ? 'Mastered' : 'In Progress'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 4. Segmented Tabs & Tactile Pomodoro Preview */}
          <Card variant="elevated">
            <CardHeader
              action={
                <Badge variant="active-filter" mono>
                  FLOW STUDIO
                </Badge>
              }
            >
              <CardTitle>Segmented Tabs & Tactile Timer Surface</CardTitle>
              <CardDescription>
                Tier-2 elevated surface with segmented pill switch and JetBrains Mono timer.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-5 py-6">
              <Tabs
                variant="segmented"
                value={pomodoroMode}
                onValueChange={setPomodoroMode}
                items={[
                  {
                    value: 'focus',
                    label: 'Focus',
                    badge: '25m',
                    icon: <Timer className="h-3.5 w-3.5" />,
                  },
                  {
                    value: 'short',
                    label: 'Short Break',
                    badge: '5m',
                    icon: <Clock className="h-3.5 w-3.5" />,
                  },
                  {
                    value: 'long',
                    label: 'Long Break',
                    badge: '15m',
                  },
                ]}
              />
              <div className="text-center">
                <div className="font-mono tabular-nums text-5xl font-bold tracking-tight text-foreground">
                  {pomodoroMode === 'focus'
                    ? '25:00'
                    : pomodoroMode === 'short'
                      ? '05:00'
                      : '15:00'}
                </div>
                <p className="mt-1 text-xs text-foreground-muted">
                  Linked to <span className="font-mono font-semibold text-primary">WMA11</span> Past Paper Revision
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <span className="text-xs text-foreground-muted">
                Guest-ready via <span className="font-mono">localStorage</span>
              </span>
              <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)}>
                Configure Session
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Interactive Actionable Subject Cards Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {data.sampleSubjects.map((subj) => (
            <Card key={subj.code} variant="interactive" padded>
              <div className="flex items-center justify-between">
                <Badge variant="subject" code={subj.code}>
                  {subj.board}
                </Badge>
                <Badge variant="verified" mono>
                  Grade {subj.targetGrade}
                </Badge>
              </div>
              <h4 className="mt-3 text-base font-bold text-foreground">{subj.title}</h4>
              <p className="mt-1 font-mono tabular-nums text-xs text-foreground-muted">
                Latest Score: <span className="font-semibold text-foreground">{subj.ums}</span>
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal Primitive Demo */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Past Paper Score"
        description="Record your raw mark to automatically calculate UMS and update your syllabus mastery."
        headerBadge={
          <Badge variant="subject" mono>
            WMA11 · OCT/NOV 2025
          </Badge>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => setIsModalOpen(false)}
            >
              Save Score (+25 XP)
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Raw Score Achieved"
            mono
            value={rawScore}
            onChange={(e) => setRawScore(e.target.value)}
            rightIcon={<span className="font-mono text-xs">/ 75</span>}
            hint="Grade A* boundary for this series is 62/75 (90 UMS)."
          />
          <Checkbox
            checked
            label="Sync revision milestone to Flow Smart Timetable"
            description="Creates a completed study log entry on your calendar."
          />
        </div>
      </Modal>
    </div>
  );
}

