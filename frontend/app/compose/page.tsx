'use client';

import { useEffect, useState } from 'react';
import {
  generateContent,
  runCampaign,
  getAccounts,
  getMedia,
  ApiError,
  PLATFORMS,
  type Platform,
  type Draft,
  type CampaignResult,
  type ConnectedAccount,
  type MediaAsset,
} from '@/lib/api';
import Card from '../components/Card';
import Badge, { toneForStatus } from '../components/Badge';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import { formatNumber, formatPercent, formatDate } from '../components/format';

type Action = 'draft' | 'campaign' | null;
type ImageMode = 'auto' | 'library';

export default function ComposePage() {
  const [businessType, setBusinessType] = useState('Dental Clinic');
  const [goal, setGoal] = useState('Generate Leads');
  const [platform, setPlatform] = useState<Platform>('linkedin');
  const [tone, setTone] = useState('professional');

  // Optional: target account + image source.
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [imageMode, setImageMode] = useState<ImageMode>('auto');
  const [imageUrl, setImageUrl] = useState('');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const [pending, setPending] = useState<Action>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [campaign, setCampaign] = useState<CampaignResult | null>(null);

  const busy = pending !== null;
  const accountSelected = accountId !== '';

  // Load connected accounts for the optional target dropdown (best-effort).
  useEffect(() => {
    let cancelled = false;
    getAccounts()
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch(() => {
        /* backend down / no accounts — dropdown just stays empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Lazily load the media library the first time the user picks "from library".
  useEffect(() => {
    if (imageMode !== 'library' || mediaLoaded) return;
    let cancelled = false;
    getMedia()
      .then((data) => {
        if (!cancelled) {
          setMedia(data);
          setMediaLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setMediaLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [imageMode, mediaLoaded]);

  async function handle(action: Exclude<Action, null>) {
    setPending(action);
    setError(null);
    const payload = {
      businessType,
      goal,
      platform,
      tone,
      ...(accountSelected ? { accountId } : {}),
      ...(imageMode === 'library' && imageUrl ? { imageUrl } : {}),
    };
    try {
      if (action === 'draft') {
        setCampaign(null);
        setDraft(await generateContent(payload));
      } else {
        setDraft(null);
        setCampaign(await runCampaign(payload));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Compose</h2>
        <p className="mt-1 text-sm text-slate-400">
          Generate a draft, or run the full autonomous multi-agent campaign.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px,1fr]">
        {/* Form */}
        <Card title="Campaign Brief">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handle('campaign');
            }}
          >
            <div>
              <label className="label" htmlFor="businessType">Business Type</label>
              <input
                id="businessType"
                className="input"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g. Dental Clinic"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="goal">Goal</label>
              <input
                id="goal"
                className="input"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Generate Leads"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="account">
                Target account <span className="text-slate-500">(optional)</span>
              </label>
              <select
                id="account"
                className="input"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">Auto (use platform below)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} (@{a.handle.replace(/^@/, '')} · {a.platform})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="platform">Platform</label>
              <select
                id="platform"
                className="input capitalize"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                disabled={accountSelected}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </select>
              {accountSelected && (
                <p className="mt-1 text-xs text-slate-500">
                  Using the selected account&apos;s platform.
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="imageMode">Image</label>
              <select
                id="imageMode"
                className="input"
                value={imageMode}
                onChange={(e) => setImageMode(e.target.value as ImageMode)}
              >
                <option value="auto">Auto-generate (default)</option>
                <option value="library">Attach from library</option>
              </select>
              {imageMode === 'library' && (
                <div className="mt-2">
                  {!mediaLoaded ? (
                    <p className="text-xs text-slate-500">Loading media…</p>
                  ) : media.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No media yet — add some on the Media page.
                    </p>
                  ) : (
                    <select
                      className="input"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      aria-label="Select an image from the library"
                    >
                      <option value="">Select an image…</option>
                      {media.map((m) => (
                        <option key={m.id} value={m.url}>
                          {m.source} · {m.prompt || m.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  )}
                  {imageUrl && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Selected media"
                        className="h-28 w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="label" htmlFor="tone">Tone</label>
              <input
                id="tone"
                className="input"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. professional"
                required
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => handle('draft')}
              >
                {pending === 'draft' ? 'Generating…' : 'Generate Draft'}
              </button>
              <button type="submit" className="btn-primary" disabled={busy}>
                {pending === 'campaign' ? 'Running pipeline…' : '🚀 Run Full Campaign'}
              </button>
            </div>
          </form>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {busy && (
            <Card>
              <Spinner
                label={
                  pending === 'campaign'
                    ? 'Orchestrating agents: content → SEO → image → publishing → analytics → recommendation…'
                    : 'Running content, SEO and image agents…'
                }
              />
            </Card>
          )}

          {error && !busy && (
            <Card>
              <p className="text-sm font-medium text-red-300">Request failed</p>
              <p className="mt-1 text-sm text-slate-400">{error}</p>
            </Card>
          )}

          {!busy && !error && !draft && !campaign && (
            <Card>
              <p className="text-sm text-slate-400">
                Fill in the brief and choose an action. The draft uses the content, SEO and image
                agents; the full campaign runs the entire orchestrated pipeline and publishes a post.
              </p>
            </Card>
          )}

          {draft && !busy && <DraftView draft={draft} platform={platform} />}
          {campaign && !busy && <CampaignView result={campaign} />}
        </div>
      </div>
    </div>
  );
}

function HashtagList({ hashtags }: { hashtags: string[] }) {
  if (!hashtags?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {hashtags.map((h) => (
        <Badge key={h} tone="indigo">{h}</Badge>
      ))}
    </div>
  );
}

function SeoBlock({
  keywords,
  score,
  trendingTopics,
}: {
  keywords: string[];
  score: number;
  trendingTopics?: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">SEO score</span>
        <Badge tone={score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red'}>{score}/100</Badge>
      </div>
      {keywords?.length > 0 && (
        <div>
          <p className="label">Keywords</p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <Badge key={k} tone="slate">{k}</Badge>
            ))}
          </div>
        </div>
      )}
      {trendingTopics && trendingTopics.length > 0 && (
        <div>
          <p className="label">Trending topics</p>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((t) => (
              <Badge key={t} tone="blue">{t}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DraftView({ draft, platform }: { draft: Draft; platform: Platform }) {
  return (
    <Card title="Generated Draft" actions={<Badge tone={toneForStatus(platform)}>{platform}</Badge>}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {draft.content}
          </p>
          <HashtagList hashtags={draft.hashtags} />
          <SeoBlock
            keywords={draft.seo.keywords}
            score={draft.seo.score}
            trendingTopics={draft.seo.trendingTopics}
          />
        </div>
        {draft.imageUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.imageUrl}
              alt="Generated visual"
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function CampaignView({ result }: { result: CampaignResult }) {
  const { post, analytics, recommendations, timeline, seo } = result;

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <Card title="Agent Pipeline" subtitle="Execution timeline">
        <ol className="space-y-3">
          {timeline.map((step, i) => (
            <li key={`${step.agent}-${i}`} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600/20 text-xs font-medium text-brand-300 ring-1 ring-inset ring-brand-500/40">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium capitalize text-slate-100">{step.agent}</p>
                  <span className="text-xs text-slate-500">{step.ms} ms</span>
                </div>
                <p className="text-sm text-slate-400">{step.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Published post */}
      <Card
        title="Published Post"
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="slate">{post.platform}</Badge>
            <Badge tone={toneForStatus(post.status)}>{post.status}</Badge>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
              {post.content}
            </p>
            {post.hashtags && <HashtagList hashtags={post.hashtags} />}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              {post.scheduledFor && <p>Scheduled: {formatDate(post.scheduledFor)}</p>}
              {post.publishedAt && <p>Published: {formatDate(post.publishedAt)}</p>}
              {post.externalId && <p className="col-span-2">External ID: {post.externalId}</p>}
            </div>
            <SeoBlock keywords={seo.keywords} score={seo.score} trendingTopics={seo.trendingTopics} />
          </div>
          {post.imageUrl && (
            <div className="overflow-hidden rounded-xl border border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt="Post visual"
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Analytics */}
      <div>
        <h3 className="mb-3 section-title">Predicted Analytics</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Reach" value={formatNumber(analytics.reach)} accent="sky" />
          <StatCard label="Impressions" value={formatNumber(analytics.impressions)} />
          <StatCard label="Clicks" value={formatNumber(analytics.clicks)} accent="indigo" />
          {typeof analytics.likes === 'number' && (
            <StatCard label="Likes" value={formatNumber(analytics.likes)} accent="amber" />
          )}
          <StatCard
            label="Engagement"
            value={formatPercent(analytics.engagementRate)}
            accent="emerald"
          />
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card title="Recommendations" subtitle="Self-learning suggestions">
          <ul className="space-y-3">
            {recommendations.map((rec) => (
              <li key={rec.id} className="flex items-start gap-3">
                <Badge tone="blue">{rec.type}</Badge>
                <p className="text-sm text-slate-300">{rec.suggestion}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
