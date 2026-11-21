'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Copy,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TutorSlotPainterView,
  cn,
  summarizeTutorSchedule,
} from '@ants/ui';
import {
  createBlankTeamMember,
  deriveInitials,
  ensureUniqueUsername,
  normalizeUsernameInput,
} from '../../../lib/cms';
import type {
  OrgCurriculumBoard,
  OrgMemberRoleCategory,
  OrgTeamMemberMock,
} from '../../../mocks/showcase-team.mock';
import {
  CmsFieldLabel,
  CmsStringListEditor,
  CmsTextarea,
} from './CmsFieldPrimitives';

export interface CmsTeamEditorViewProps {
  team: OrgTeamMemberMock[];
  onUpsert: (member: OrgTeamMemberMock) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

const ROLE_OPTIONS: Array<{ id: OrgMemberRoleCategory; label: string }> = [
  { id: 'founder', label: 'Founder' },
  { id: 'tutor', label: 'Tutor' },
  { id: 'contributor', label: 'Contributor' },
  { id: 'alumni', label: 'Alumni' },
];

const CURRICULUM_OPTIONS: OrgCurriculumBoard[] = [
  'Edexcel IAL',
  'Cambridge AS & A-Level',
  'Cambridge IGCSE',
];

export function CmsTeamEditorView({
  team,
  onUpsert,
  onDelete,
  onMove,
}: CmsTeamEditorViewProps) {
  const [selectedId, setSelectedId] = useState<string>(team[0]?.id ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [subTab, setSubTab] = useState('profile');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredTeam = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return team;
    return team.filter((m) =>
      [m.name, m.username, m.roleBadge, m.specialization]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [team, searchQuery]);

  const activeMember = useMemo(
    () => team.find((m) => m.id === selectedId) ?? team[0] ?? null,
    [team, selectedId]
  );

  const handleCreate = () => {
    const created = createBlankTeamMember(team.map((m) => m.username));
    onUpsert(created);
    setSelectedId(created.id);
    setSubTab('profile');
    setConfirmDeleteId(null);
  };

  const handleDuplicate = (member: OrgTeamMemberMock) => {
    const username = ensureUniqueUsername(
      `${member.username}-copy`,
      team.map((m) => m.username)
    );
    const copy: OrgTeamMemberMock = {
      ...JSON.parse(JSON.stringify(member)),
      id: `mem_${Date.now().toString(36)}`,
      username,
      name: `${member.name} (Copy)`,
    };
    onUpsert(copy);
    setSelectedId(copy.id);
    setConfirmDeleteId(null);
  };

  const updateActive = (patch: Partial<OrgTeamMemberMock>) => {
    if (!activeMember) return;
    onUpsert({ ...activeMember, ...patch });
  };

  const toggleRoleCategory = (role: OrgMemberRoleCategory, checked: boolean) => {
    if (!activeMember) return;
    const next = checked
      ? Array.from(new Set([...activeMember.roleCategories, role]))
      : activeMember.roleCategories.filter((r) => r !== role);
    const safeRoles: OrgMemberRoleCategory[] =
      next.length > 0 ? next : ['contributor'];
    updateActive({
      roleCategories: safeRoles,
      isFounder: safeRoles.includes('founder'),
      isTutor: safeRoles.includes('tutor'),
    });
  };

  const toggleCurriculum = (board: OrgCurriculumBoard, checked: boolean) => {
    if (!activeMember) return;
    const next = checked
      ? Array.from(new Set([...activeMember.curriculums, board]))
      : activeMember.curriculums.filter((b) => b !== board);
    updateActive({ curriculums: next });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Team, Founders &amp; Tutors
          </h2>
          <p className="text-xs text-foreground-muted">
            Manage member profiles, taught curriculums, and Sun–Sat availability
            slots on <span className="font-mono">/team</span>.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={handleCreate}
        >
          Add Member
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left List */}
        <aside className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted"
              aria-hidden="true"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, @handle, subject..."
              className="h-9 pl-8 text-xs"
            />
          </div>

          <div className="rounded-xl border border-border bg-surface-card divide-y divide-border overflow-hidden">
            {filteredTeam.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <Users
                  className="mx-auto h-5 w-5 text-foreground-muted"
                  aria-hidden="true"
                />
                <p className="text-xs text-foreground-muted">
                  No members match your search.
                </p>
              </div>
            ) : (
              filteredTeam.map((member) => {
                const selected = activeMember?.id === member.id;
                const realIdx = team.findIndex((m) => m.id === member.id);
                const slotSummary = summarizeTutorSchedule(member.weeklySchedule);
                const openTotal =
                  slotSummary.availableHours + slotSummary.flexibleHours;

                return (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2.5 transition-colors',
                      selected
                        ? 'bg-primary-tint/55'
                        : 'hover:bg-surface-inset/60'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(member.id);
                        setConfirmDeleteId(null);
                      }}
                      className="min-w-0 flex-1 text-left flex items-center gap-2.5"
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-extrabold',
                          selected
                            ? 'border-primary-tint-border bg-primary-solid text-on-primary'
                            : 'border-border bg-surface-inset text-foreground'
                        )}
                      >
                        {member.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">
                          {member.name}
                        </p>
                        <p className="truncate font-mono text-[11px] text-foreground-muted">
                          @{member.username}
                          {member.isTutor ? ` · ${openTotal}h` : ''}
                        </p>
                      </div>
                    </button>

                    {!searchQuery.trim() && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onMove(member.id, 'up')}
                          disabled={realIdx <= 0}
                          aria-label={`Move ${member.name} up`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground-muted hover:bg-surface-card hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMove(member.id, 'down')}
                          disabled={realIdx === team.length - 1}
                          aria-label={`Move ${member.name} down`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground-muted hover:bg-surface-card hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Editor */}
        <div className="lg:col-span-8">
          {!activeMember ? (
            <div className="rounded-xl border border-border bg-surface-card p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-foreground">
                No team members yet
              </p>
              <Button type="button" variant="primary" size="sm" onClick={handleCreate}>
                Create First Member
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-card p-5 space-y-5">
              {/* Active Item Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-tint-border bg-primary-tint text-sm font-extrabold text-on-primary-tint">
                    {activeMember.initials}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-foreground">
                      {activeMember.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs text-foreground-muted">
                        @{activeMember.username}
                      </span>
                      {activeMember.isFounder && (
                        <Badge variant="active-filter">Founder</Badge>
                      )}
                      {activeMember.isTutor && (
                        <Badge variant="verified" dot>
                          Tutor
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/team/${activeMember.username}`}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-surface-inset"
                  >
                    <span>Preview</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => handleDuplicate(activeMember)}
                    className="h-8"
                  >
                    Duplicate
                  </Button>
                  {confirmDeleteId === activeMember.id ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const remaining = team.filter(
                          (m) => m.id !== activeMember.id
                        );
                        onDelete(activeMember.id);
                        setSelectedId(remaining[0]?.id ?? '');
                        setConfirmDeleteId(null);
                      }}
                      className="h-8"
                    >
                      Confirm Delete
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      onClick={() => setConfirmDeleteId(activeMember.id)}
                      disabled={team.length <= 1}
                      className="h-8 text-foreground-muted hover:text-on-danger-tint hover:bg-danger-tint"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <Tabs value={subTab} onValueChange={setSubTab} variant="underline">
                <TabsList>
                  <TabsTrigger value="profile">Profile &amp; Bio</TabsTrigger>
                  <TabsTrigger value="teaching">Roles &amp; Teaching</TabsTrigger>
                  <TabsTrigger value="schedule">Weekly Slots</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <CmsFieldLabel label="Full Name">
                        <Input
                          value={activeMember.name}
                          onChange={(e) =>
                            updateActive({ name: e.target.value })
                          }
                          className="h-9 text-xs"
                        />
                      </CmsFieldLabel>
                    </div>
                    <div className="sm:col-span-4">
                      <CmsFieldLabel label="URL Handle (@username)">
                        <Input
                          value={activeMember.username}
                          onChange={(e) =>
                            updateActive({
                              username: normalizeUsernameInput(e.target.value),
                            })
                          }
                          className="h-9 font-mono text-xs"
                        />
                      </CmsFieldLabel>
                    </div>
                    <div className="sm:col-span-2">
                      <CmsFieldLabel
                        label="Initials"
                        hint=""
                      >
                        <div className="flex gap-1">
                          <Input
                            value={activeMember.initials}
                            maxLength={3}
                            onChange={(e) =>
                              updateActive({
                                initials: e.target.value.toUpperCase(),
                              })
                            }
                            className="h-9 font-mono text-xs uppercase"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateActive({
                                initials: deriveInitials(activeMember.name),
                              })
                            }
                            title="Derive initials from name"
                            className="h-9 rounded-lg border border-border bg-surface-inset px-2 text-[11px] font-semibold text-foreground-muted hover:text-foreground"
                          >
                            Auto
                          </button>
                        </div>
                      </CmsFieldLabel>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CmsFieldLabel label="Primary Role Title">
                      <Input
                        value={activeMember.roleBadge}
                        onChange={(e) =>
                          updateActive({ roleBadge: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </CmsFieldLabel>
                    <CmsFieldLabel label="Joined / Cohort Label">
                      <Input
                        value={activeMember.joinedLabel}
                        onChange={(e) =>
                          updateActive({ joinedLabel: e.target.value })
                        }
                        className="h-9 font-mono text-xs"
                      />
                    </CmsFieldLabel>
                  </div>

                  <CmsFieldLabel label="Headline">
                    <Input
                      value={activeMember.headline}
                      onChange={(e) =>
                        updateActive({ headline: e.target.value })
                      }
                      className="h-9 text-xs"
                    />
                  </CmsFieldLabel>

                  <CmsFieldLabel label="Biography">
                    <CmsTextarea
                      rows={3}
                      value={activeMember.bio}
                      onChange={(val) => updateActive({ bio: val })}
                    />
                  </CmsFieldLabel>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CmsFieldLabel label="Institution / Studio">
                      <Input
                        value={activeMember.institution}
                        onChange={(e) =>
                          updateActive({ institution: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </CmsFieldLabel>
                    <CmsFieldLabel label="Specialization Summary">
                      <Input
                        value={activeMember.specialization}
                        onChange={(e) =>
                          updateActive({ specialization: e.target.value })
                        }
                        className="h-9 font-mono text-xs"
                      />
                    </CmsFieldLabel>
                  </div>

                  <CmsStringListEditor
                    label="Achievements & Credentials"
                    items={activeMember.achievements}
                    onChange={(next) => updateActive({ achievements: next })}
                    placeholder="Add qualification or mentoring milestone..."
                  />
                </TabsContent>

                <TabsContent value="teaching" className="pt-4 space-y-5">
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-foreground">
                      Role Categories
                    </span>
                    <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-surface-inset/50 p-3">
                      {ROLE_OPTIONS.map((role) => (
                        <Checkbox
                          key={role.id}
                          checked={activeMember.roleCategories.includes(role.id)}
                          onCheckedChange={(checked) =>
                            toggleRoleCategory(role.id, checked)
                          }
                          label={role.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-foreground">
                      Taught Exam Boards
                    </span>
                    <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-surface-inset/50 p-3">
                      {CURRICULUM_OPTIONS.map((board) => (
                        <Checkbox
                          key={board}
                          checked={activeMember.curriculums.includes(board)}
                          onCheckedChange={(checked) =>
                            toggleCurriculum(board, checked)
                          }
                          label={board}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <CmsFieldLabel label="Hourly Rate Label">
                      <Input
                        value={activeMember.hourlyRateLabel ?? ''}
                        onChange={(e) =>
                          updateActive({
                            hourlyRateLabel: e.target.value || undefined,
                          })
                        }
                        placeholder="25,000 MMK / hr"
                        className="h-9 font-mono text-xs"
                      />
                    </CmsFieldLabel>
                    <CmsFieldLabel label="Timezone">
                      <Input
                        value={activeMember.timezoneLabel}
                        onChange={(e) =>
                          updateActive({ timezoneLabel: e.target.value })
                        }
                        className="h-9 font-mono text-xs"
                      />
                    </CmsFieldLabel>
                    <CmsFieldLabel label="Telegram Handle">
                      <Input
                        value={activeMember.tutorTelegramUsername ?? ''}
                        onChange={(e) =>
                          updateActive({
                            tutorTelegramUsername: e.target.value || undefined,
                          })
                        }
                        placeholder="@handle"
                        className="h-9 font-mono text-xs"
                      />
                    </CmsFieldLabel>
                  </div>

                  <CmsStringListEditor
                    label="Taught Subjects & Unit Codes"
                    items={activeMember.taughtSubjects}
                    onChange={(next) => updateActive({ taughtSubjects: next })}
                    placeholder="e.g. WMA11 Pure 1"
                  />
                </TabsContent>

                <TabsContent value="schedule" className="pt-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-inset/50 px-3.5 py-2.5">
                    <p className="text-xs text-foreground-muted">
                      Paint weekly <span className="font-mono">Sun–Sat</span>{' '}
                      tutoring availability directly. Changes update the public
                      drawer on <span className="font-mono">/team</span>.
                    </p>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                      <Checkbox
                        checked={activeMember.isTutor}
                        onCheckedChange={(checked) =>
                          updateActive({
                            isTutor: checked,
                            roleCategories: checked
                              ? Array.from(
                                  new Set([
                                    ...activeMember.roleCategories,
                                    'tutor',
                                  ])
                                )
                              : activeMember.roleCategories.filter(
                                  (r) => r !== 'tutor'
                                ),
                          })
                        }
                        label="Active Tutor"
                      />
                    </label>
                  </div>

                  <TutorSlotPainterView
                    mode="edit"
                    schedule={activeMember.weeklySchedule}
                    tutorName={activeMember.name}
                    tutorTelegramUsername={
                      activeMember.tutorTelegramUsername ?? ''
                    }
                    timezoneLabel={activeMember.timezoneLabel}
                    onChange={(nextSchedule) =>
                      updateActive({ weeklySchedule: nextSchedule })
                    }
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
