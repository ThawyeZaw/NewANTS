'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Home,
  Loader2,
  LogIn,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  CalendarDays,
} from 'lucide-react';
import {
  AntMascot,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
} from '@ants/ui';
import {
  buildCrossSubdomainLoginUrl,
  useRole,
  useSession,
} from '@ants/auth-client';
import type {
  AdminOrgBootstrapDto,
  AdminUserSummaryDto,
  OrgHackathonBannerDto,
  UserRole,
} from '@ants/shared-types';
import { CmsActivitiesEditorView } from '../../cms/views/CmsActivitiesEditorView';
import { CmsArticlesEditorView } from '../../cms/views/CmsArticlesEditorView';
import { CmsHomeEditorView } from '../../cms/views/CmsHomeEditorView';
import { CmsTeamEditorView } from '../../cms/views/CmsTeamEditorView';
import { OrgFooterView } from '../../layout/views/OrgFooterView';
import { OrgNavbarView } from '../../layout/views/OrgNavbarView';
import {
  MOCK_ORG_HOME_DATA,
  type OrgHomeLandingMockData,
} from '../../../mocks/showcase-home.mock';
import type { OrgTeamMemberMock } from '../../../mocks/showcase-team.mock';
import type { OrgActivityMock, OrgArticleMock } from '../../../mocks/showcase-content.mock';
import {
  AdminApiError,
  buildAdminSettingsInput,
  buildHomeLandingMockFromAdmin,
  createAdminActivity,
  createAdminArticle,
  createAdminTeamMember,
  deleteAdminActivity,
  deleteAdminArticle,
  deleteAdminTeamMember,
  fetchAdminBootstrap,
  mapAdminActivityDtoToMock,
  mapAdminArticleDtoToMock,
  mapAdminTeamDtoToMock,
  mapMockToAdminActivityInput,
  mapMockToAdminArticleInput,
  mapMockToAdminTeamInput,
  saveAdminOrgSettings,
  updateAdminActivity,
  updateAdminArticle,
  updateAdminTeamMember,
  updateAdminUserRoles,
} from '../../../lib/admin-api';

type AdminTabId = 'home' | 'team' | 'activities' | 'articles' | 'users';

const ALL_ROLES: UserRole[] = [
  'student',
  'tutor',
  'teacher',
  'contributor',
  'main_contributor',
  'admin',
];

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  tutor: 'Verified Tutor',
  teacher: 'Teacher',
  contributor: 'Contributor',
  main_contributor: 'Main Contributor',
  admin: 'Platform Admin',
};

function detectUseLocalUrls(): boolean {
  if (typeof window === 'undefined') return process.env.NODE_ENV !== 'production';
  const host = window.location.hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
}

export function OrgAdminContainer() {
  const { status, user, signOut } = useSession();
  const { isAdmin, hasAnyRole, roles } = useRole();
  const canEnterAdmin = hasAnyRole(['admin', 'main_contributor']);

  const [useLocalUrls, setUseLocalUrls] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTabId>('team');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [homeData, setHomeData] = useState<OrgHomeLandingMockData>(MOCK_ORG_HOME_DATA);
  const [hackathonBanner, setHackathonBanner] = useState<OrgHackathonBannerDto | null>(null);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [team, setTeam] = useState<OrgTeamMemberMock[]>([]);
  const [activities, setActivities] = useState<OrgActivityMock[]>([]);
  const [articles, setArticles] = useState<OrgArticleMock[]>([]);
  const [users, setUsers] = useState<AdminUserSummaryDto[]>([]);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    setUseLocalUrls(detectUseLocalUrls());
  }, []);

  useEffect(() => {
    if (isAdmin) {
      setActiveTab((prev) => (prev === 'team' ? 'home' : prev));
    }
  }, [isAdmin]);

  const applyBootstrap = useCallback((bootstrap: AdminOrgBootstrapDto) => {
    const mappedTeam = bootstrap.team.map(mapAdminTeamDtoToMock);
    const mappedActivities = bootstrap.activities.map(mapAdminActivityDtoToMock);
    const mappedArticles = bootstrap.articles.map(mapAdminArticleDtoToMock);
    setTeam(mappedTeam);
    setActivities(mappedActivities);
    setArticles(mappedArticles);
    setHackathonBanner(bootstrap.settings.hackathonBanner);
    setSocialLinks(bootstrap.settings.socialLinks);
    setHomeData(
      buildHomeLandingMockFromAdmin(bootstrap.settings, mappedTeam, mappedActivities)
    );
    setUsers(bootstrap.users);
  }, []);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAdminBootstrap();
      applyBootstrap(data);
    } catch (err) {
      const msg =
        err instanceof AdminApiError
          ? err.message
          : 'Unable to reach @ants/api for admin bootstrap.';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [applyBootstrap]);

  useEffect(() => {
    if (status === 'authenticated' && canEnterAdmin) {
      void loadBootstrap();
    }
  }, [status, canEnterAdmin, loadBootstrap]);

  const showToast = (kind: 'success' | 'error', text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => {
      setToast((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  };

  const handleSaveHomeAndBanner = async () => {
    setSaving(true);
    try {
      const saved = await saveAdminOrgSettings(
        buildAdminSettingsInput(homeData, hackathonBanner, socialLinks)
      );
      setHackathonBanner(saved.hackathonBanner);
      setSocialLinks(saved.socialLinks);
      setHomeData(buildHomeLandingMockFromAdmin(saved, team, activities));
      showToast('success', 'Organization home copy, pillars & hackathon banner saved to D1.');
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to save organization settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpsertTeam = async (member: OrgTeamMemberMock) => {
    setSaving(true);
    try {
      const exists = team.some((m) => m.id === member.id);
      const displayOrder = exists
        ? team.findIndex((m) => m.id === member.id)
        : team.length;
      const input = mapMockToAdminTeamInput(member, Math.max(0, displayOrder));
      const saved = exists
        ? await updateAdminTeamMember(member.id, input)
        : await createAdminTeamMember(input);
      const mapped = mapAdminTeamDtoToMock(saved);
      setTeam((prev) =>
        exists ? prev.map((m) => (m.id === member.id ? mapped : m)) : [...prev, mapped]
      );
      showToast('success', `Saved ${mapped.name} to D1 team roster & tutor availability.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save team member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    setSaving(true);
    try {
      await deleteAdminTeamMember(id);
      setTeam((prev) => prev.filter((m) => m.id !== id));
      showToast('success', 'Removed team member from D1.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove team member.');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveTeam = async (id: string, direction: 'up' | 'down') => {
    const idx = team.findIndex((m) => m.id === id);
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= team.length) return;
    const reordered = [...team];
    const [item] = reordered.splice(idx, 1);
    if (!item) return;
    reordered.splice(target, 0, item);
    setTeam(reordered);
    setSaving(true);
    try {
      await Promise.all([
        updateAdminTeamMember(
          reordered[idx]!.id,
          mapMockToAdminTeamInput(reordered[idx]!, idx)
        ),
        updateAdminTeamMember(
          reordered[target]!.id,
          mapMockToAdminTeamInput(reordered[target]!, target)
        ),
      ]);
      showToast('success', 'Updated team display order in D1.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reorder team.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpsertActivity = async (activity: OrgActivityMock) => {
    setSaving(true);
    try {
      const exists = activities.some((a) => a.id === activity.id);
      const displayOrder = exists
        ? activities.findIndex((a) => a.id === activity.id)
        : activities.length;
      const input = await mapMockToAdminActivityInput(activity, Math.max(0, displayOrder));
      const saved = exists
        ? await updateAdminActivity(activity.id, input)
        : await createAdminActivity(input);
      const mapped = mapAdminActivityDtoToMock(saved);
      setActivities((prev) =>
        exists ? prev.map((a) => (a.id === activity.id ? mapped : a)) : [...prev, mapped]
      );
      showToast(
        'success',
        `Saved activity "${mapped.title}" (media synced to R2 if newly uploaded).`
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save activity.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    setSaving(true);
    try {
      await deleteAdminActivity(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
      showToast('success', 'Deleted activity from D1.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete activity.');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveActivity = async (id: string, direction: 'up' | 'down') => {
    const idx = activities.findIndex((a) => a.id === id);
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= activities.length) return;
    const reordered = [...activities];
    const [item] = reordered.splice(idx, 1);
    if (!item) return;
    reordered.splice(target, 0, item);
    setActivities(reordered);
    setSaving(true);
    try {
      await Promise.all([
        updateAdminActivity(
          reordered[idx]!.id,
          await mapMockToAdminActivityInput(reordered[idx]!, idx)
        ),
        updateAdminActivity(
          reordered[target]!.id,
          await mapMockToAdminActivityInput(reordered[target]!, target)
        ),
      ]);
      showToast('success', 'Updated activity display order in D1.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reorder activities.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpsertArticle = async (article: OrgArticleMock) => {
    setSaving(true);
    try {
      const exists = articles.some((a) => a.id === article.id);
      const input = await mapMockToAdminArticleInput(article);
      const saved = exists
        ? await updateAdminArticle(article.id, input)
        : await createAdminArticle(input);
      const mapped = mapAdminArticleDtoToMock(saved);
      setArticles((prev) =>
        exists ? prev.map((a) => (a.id === article.id ? mapped : a)) : [...prev, mapped]
      );
      showToast('success', `Saved article "${mapped.title}" to D1.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    setSaving(true);
    try {
      await deleteAdminArticle(id);
      setArticles((prev) => prev.filter((a) => a.id !== id));
      showToast('success', 'Deleted article from D1.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete article.');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveArticle = (id: string, direction: 'up' | 'down') => {
    const idx = articles.findIndex((a) => a.id === id);
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= articles.length) return;
    const reordered = [...articles];
    const [item] = reordered.splice(idx, 1);
    if (!item) return;
    reordered.splice(target, 0, item);
    setArticles(reordered);
  };

  const handleToggleUserRole = async (targetUser: AdminUserSummaryDto, roleToToggle: UserRole) => {
    const hasIt = targetUser.roles.includes(roleToToggle);
    const nextRoles = hasIt
      ? targetUser.roles.filter((r) => r !== roleToToggle)
      : [...targetUser.roles, roleToToggle];
    if (nextRoles.length === 0) {
      showToast('error', 'Every user must keep at least one role.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAdminUserRoles(targetUser.id, nextRoles);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast('success', `Updated roles for ${updated.name}.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update user roles.');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.username, ...u.roles].some((v) => v.toLowerCase().includes(q))
    );
  }, [users, userSearch]);

  const studyLoginHref = buildCrossSubdomainLoginUrl({
    fromApp: 'org',
    targetPath: '/admin',
    authApp: 'study',
    mode: 'login',
  });
  const flowLoginHref = buildCrossSubdomainLoginUrl({
    fromApp: 'org',
    targetPath: '/admin',
    authApp: 'flow',
    mode: 'login',
  });

  const adminTabs = useMemo(() => {
    const tabs: Array<{ value: AdminTabId; label: string; icon: React.ReactNode }> = [];
    if (isAdmin) {
      tabs.push({
        value: 'home',
        label: 'Home & Mission',
        icon: <Home className="h-3.5 w-3.5" aria-hidden="true" />,
      });
    }
    tabs.push(
      {
        value: 'team',
        label: `Team & Tutors (${team.length})`,
        icon: <Users className="h-3.5 w-3.5" aria-hidden="true" />,
      },
      {
        value: 'activities',
        label: `Activities (${activities.length})`,
        icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />,
      },
      {
        value: 'articles',
        label: `Articles (${articles.length})`,
        icon: <FileText className="h-3.5 w-3.5" aria-hidden="true" />,
      }
    );
    if (isAdmin) {
      tabs.push({
        value: 'users',
        label: `Users & Roles (${users.length})`,
        icon: <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />,
      });
    }
    return tabs;
  }, [isAdmin, team.length, activities.length, articles.length, users.length]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView activePath="/admin" useLocalUrls={useLocalUrls} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        {status === 'loading' && (
          <Card>
            <CardContent className="flex items-center gap-3 py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-foreground-muted">
                Checking your <span className="font-mono">.the-ants.org</span> SSO session...
              </p>
            </CardContent>
          </Card>
        )}

        {status === 'unauthenticated' && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AntMascot variant="avatar" mood="curious" size={44} ariaLabel="" />
                <div>
                  <Badge variant="editorial" className="mb-1">
                    Platform Admin &amp; CMS Console
                  </Badge>
                  <CardTitle className="text-xl">Sign in to manage The ANTs Showcase</CardTitle>
                </div>
              </div>
              <CardDescription className="pt-1">
                <code>the-ants.org</code> has no login form directly on the showcase domain. Sign in
                once via <strong>Study</strong> or <strong>Flow</strong> SSO to manage org content,
                tutors, galleries, and roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <a href={studyLoginHref}>
                <Button leftIcon={<LogIn className="h-4 w-4" aria-hidden="true" />}>
                  Sign in via Study SSO
                </Button>
              </a>
              <a href={flowLoginHref}>
                <Button variant="outline" leftIcon={<LogIn className="h-4 w-4" aria-hidden="true" />}>
                  Sign in via Flow SSO
                </Button>
              </a>
              <Link href="/">
                <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
                  Back to Showcase
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {status === 'authenticated' && !canEnterAdmin && (
          <Card className="mx-auto max-w-2xl border-destructive-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AntMascot variant="avatar" mood="nudge" size={44} ariaLabel="" />
                <div>
                  <Badge variant="deadline" className="mb-1">
                    403 · Admin or Main Contributor Required
                  </Badge>
                  <CardTitle className="text-xl">Access restricted on `/admin`</CardTitle>
                </div>
              </div>
              <CardDescription className="pt-1">
                Signed in as <strong>{user?.name}</strong> ({user?.email}) with roles:{' '}
                <span className="font-mono">{roles.join(', ')}</span>. Only{' '}
                <code>admin</code> or <code>main_contributor</code> accounts can publish org
                content or assign roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Link href="/">
                <Button leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
                  Return to Showcase
                </Button>
              </Link>
              <Button variant="outline" onClick={() => void signOut()}>
                Sign out
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'authenticated' && canEnterAdmin && (
          <>
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="verified" dot>
                    Live D1 Admin CMS
                  </Badge>
                  {roles.map((r) => (
                    <Badge key={r} variant={r === 'admin' ? 'deadline' : 'editorial'}>
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))}
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  The ANTs Organization Control Center
                </h1>
                <p className="text-xs text-foreground-muted">
                  Signed in as <strong>{user?.name}</strong> ({user?.email}).{' '}
                  {isAdmin
                    ? 'Full Admin privileges enabled (Mission, Hackathon Banner, Team, Activities, Articles & User Roles).'
                    : 'Main Contributor access enabled (Team, Activities & Articles).'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void loadBootstrap()}
                  disabled={loading || saving}
                  leftIcon={
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                  }
                >
                  Reload D1
                </Button>
                <Link href="/">
                  <Button size="sm" variant="secondary">
                    View Public Showcase
                  </Button>
                </Link>
              </div>
            </div>

            {toast && (
              <div
                role="status"
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium ${
                  toast.kind === 'success'
                    ? 'border-success-border bg-success-tint text-on-success-tint'
                    : 'border-destructive-border bg-destructive-tint text-on-destructive-tint'
                }`}
              >
                {toast.kind === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{toast.text}</span>
              </div>
            )}

            {loadError && (
              <Card className="border-destructive-border">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-2.5 text-xs text-destructive">
                    <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{loadError}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void loadBootstrap()}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as AdminTabId)}
                items={adminTabs}
              />
              {saving && (
                <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
                  Syncing to D1 &amp; R2...
                </span>
              )}
            </div>

            {activeTab === 'home' && isAdmin && (
              <div className="space-y-5">
                <Card>
                  <CardHeader
                    action={
                      <Button
                        size="sm"
                        onClick={() => void handleSaveHomeAndBanner()}
                        disabled={saving}
                        leftIcon={<Save className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Publish Home &amp; Banner to D1
                      </Button>
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                      <CardTitle>Hackathon External Showcase Banner</CardTitle>
                    </div>
                    <CardDescription>
                      Controls the live Hackathon spotlight card &amp; external Devpost / GitHub URL
                      stored in <code>org_settings.hackathon_banner_json</code>.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        Banner Title
                      </label>
                      <input
                        type="text"
                        value={hackathonBanner?.title ?? ''}
                        onChange={(e) =>
                          setHackathonBanner((prev) => ({
                            title: e.target.value,
                            dateLabel: prev?.dateLabel ?? 'Nov 23 – Dec 6, 2026',
                            location: prev?.location ?? 'Yangon & Online',
                            summary: prev?.summary ?? '',
                            externalUrl: prev?.externalUrl ?? 'https://the-ants.org/hackathon',
                            ctaLabel: prev?.ctaLabel ?? 'View Hackathon Portal',
                          }))
                        }
                        placeholder="ANTs EdTech Hackathon 2026"
                        className="h-9 w-full rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        External CTA URL
                      </label>
                      <input
                        type="url"
                        value={hackathonBanner?.externalUrl ?? ''}
                        onChange={(e) =>
                          setHackathonBanner((prev) => ({
                            title: prev?.title ?? 'ANTs Hackathon',
                            dateLabel: prev?.dateLabel ?? 'Nov 23 – Dec 6, 2026',
                            location: prev?.location ?? 'Yangon & Online',
                            summary: prev?.summary ?? '',
                            externalUrl: e.target.value,
                            ctaLabel: prev?.ctaLabel ?? 'View Hackathon Portal',
                          }))
                        }
                        placeholder="https://ants-hackathon.devpost.com"
                        className="h-9 w-full rounded-lg border border-border bg-surface-card px-3 font-mono text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        Date Window &amp; Location
                      </label>
                      <input
                        type="text"
                        value={hackathonBanner?.dateLabel ?? ''}
                        onChange={(e) =>
                          setHackathonBanner((prev) => ({
                            title: prev?.title ?? 'ANTs Hackathon',
                            dateLabel: e.target.value,
                            location: prev?.location ?? 'Yangon & Online',
                            summary: prev?.summary ?? '',
                            externalUrl: prev?.externalUrl ?? 'https://the-ants.org/hackathon',
                            ctaLabel: prev?.ctaLabel ?? 'View Hackathon Portal',
                          }))
                        }
                        placeholder="Nov 23 – Dec 6, 2026"
                        className="h-9 w-full rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        CTA Button Label
                      </label>
                      <input
                        type="text"
                        value={hackathonBanner?.ctaLabel ?? ''}
                        onChange={(e) =>
                          setHackathonBanner((prev) => ({
                            title: prev?.title ?? 'ANTs Hackathon',
                            dateLabel: prev?.dateLabel ?? 'Nov 23 – Dec 6, 2026',
                            location: prev?.location ?? 'Yangon & Online',
                            summary: prev?.summary ?? '',
                            externalUrl: prev?.externalUrl ?? 'https://the-ants.org/hackathon',
                            ctaLabel: e.target.value,
                          }))
                        }
                        placeholder="View Hackathon Portal"
                        className="h-9 w-full rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        Summary
                      </label>
                      <input
                        type="text"
                        value={hackathonBanner?.summary ?? ''}
                        onChange={(e) =>
                          setHackathonBanner((prev) => ({
                            title: prev?.title ?? 'ANTs Hackathon',
                            dateLabel: prev?.dateLabel ?? 'Nov 23 – Dec 6, 2026',
                            location: prev?.location ?? 'Yangon & Online',
                            summary: e.target.value,
                            externalUrl: prev?.externalUrl ?? 'https://the-ants.org/hackathon',
                            ctaLabel: prev?.ctaLabel ?? 'View Hackathon Portal',
                          }))
                        }
                        placeholder="Student-built study utilities, live workshops, and open peer submissions."
                        className="h-9 w-full rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground"
                      />
                    </div>
                  </CardContent>
                </Card>

                <CmsHomeEditorView
                  home={homeData}
                  team={team}
                  activities={activities}
                  onChange={setHomeData}
                />

                <div className="flex justify-end">
                  <Button
                    onClick={() => void handleSaveHomeAndBanner()}
                    disabled={saving}
                    leftIcon={<Save className="h-4 w-4" aria-hidden="true" />}
                  >
                    Save Home &amp; Mission to D1
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <CmsTeamEditorView
                team={team}
                onUpsert={(m) => void handleUpsertTeam(m)}
                onDelete={(id) => void handleDeleteTeam(id)}
                onMove={(id, dir) => void handleMoveTeam(id, dir)}
              />
            )}

            {activeTab === 'activities' && (
              <CmsActivitiesEditorView
                activities={activities}
                onUpsert={(a) => void handleUpsertActivity(a)}
                onDelete={(id) => void handleDeleteActivity(id)}
                onMove={(id, dir) => void handleMoveActivity(id, dir)}
              />
            )}

            {activeTab === 'articles' && (
              <CmsArticlesEditorView
                articles={articles}
                team={team}
                onUpsert={(a) => void handleUpsertArticle(a)}
                onDelete={(id) => void handleDeleteArticle(id)}
                onMove={handleMoveArticle}
              />
            )}

            {activeTab === 'users' && isAdmin && (
              <Card>
                <CardHeader
                  action={
                    <input
                      type="search"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Filter by name, email or role..."
                      className="h-9 w-64 rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground placeholder:text-foreground-muted"
                    />
                  }
                >
                  <CardTitle>Platform User Role Management</CardTitle>
                  <CardDescription>
                    Toggle multi-role unions stored in D1. Promoting a user to <code>tutor</code>{' '}
                    automatically ensures a tutor profile exists; you cannot remove your own{' '}
                    <code>admin</code> role.
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border-subtle">
                  {filteredUsers.map((account) => {
                    const isSelf = account.id === user?.id;
                    return (
                      <div
                        key={account.id}
                        className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {account.name}
                            </span>
                            <span className="font-mono text-xs text-foreground-muted">
                              @{account.username}
                            </span>
                            {isSelf && <Badge variant="active-filter">You</Badge>}
                          </div>
                          <p className="text-xs text-foreground-muted">{account.email}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {ALL_ROLES.map((r) => {
                            const active = account.roles.includes(r);
                            const disableSelfAdminDemote = isSelf && r === 'admin' && active;
                            return (
                              <button
                                key={r}
                                type="button"
                                disabled={saving || disableSelfAdminDemote}
                                onClick={() => void handleToggleUserRole(account, r)}
                                title={
                                  disableSelfAdminDemote
                                    ? 'You cannot remove your own admin role.'
                                    : `Toggle ${ROLE_LABELS[r]}`
                                }
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                                  active
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-surface-muted text-foreground-muted hover:text-foreground'
                                }`}
                              >
                                {ROLE_LABELS[r]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />
    </div>
  );
}
