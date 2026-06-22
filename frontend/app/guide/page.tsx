'use client';

import { ReactNode } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="section-title text-lg">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-300">
        {children}
      </div>
    </section>
  );
}

const AGENTS: { name: string; does: string }[] = [
  {
    name: 'Content Agent',
    does: 'Writes the post copy from your brief — business type, goal, platform and tone.',
  },
  {
    name: 'SEO Agent',
    does: 'Picks keywords and hashtags, scores the draft and surfaces trending topics.',
  },
  {
    name: 'Image Agent',
    does: 'Generates a matching visual (or uses one you attach from the Media Library).',
  },
  {
    name: 'Publishing Agent',
    does: 'Schedules and publishes the post to the target platform/account (mock by default).',
  },
  {
    name: 'Analytics Agent',
    does: 'Estimates reach, impressions, clicks, likes and engagement rate for the post.',
  },
  {
    name: 'Recommendation Agent',
    does: 'Reads analytics and memory to suggest timing, content and hashtag improvements.',
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">User Guide</h2>
        <p className="mt-1 text-sm text-slate-400">
          Everything you need to run autonomous social media campaigns for your clients.
        </p>
      </div>

      <Card className="space-y-8">
        <Section id="what" title="What this app is">
          <p>
            This is an <strong className="text-slate-100">autonomous social media agent</strong>:
            a fleet of six specialized AI agents that turn a short brief into a fully
            researched, written, illustrated, published and measured social post — then learns
            from the results to improve the next one.
          </p>
          <p>
            It works in <strong className="text-slate-100">mock mode</strong> out of the box, so
            you can explore the entire pipeline without any API keys or live social accounts.
          </p>
        </Section>

        <Section id="quick-start" title="Quick start">
          <p>From the project root, start the backend and the frontend:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Backend:{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-200">
                cd backend &amp;&amp; npm install &amp;&amp; npm run dev
              </code>{' '}
              (serves the API on <span className="font-mono">http://localhost:4000</span>).
            </li>
            <li>
              Frontend:{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-200">
                cd frontend &amp;&amp; npm install &amp;&amp; npm run dev
              </code>{' '}
              (opens the dashboard on <span className="font-mono">http://localhost:3000</span>).
            </li>
            <li>Open the dashboard and confirm the agent fleet shows as connected.</li>
          </ol>
        </Section>

        <Section id="accounts" title="Connect a client's social account">
          <p>
            Go to the <strong className="text-slate-100">Accounts</strong> page to register the
            social accounts you want to automate.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Pick the platform, then enter a label (the brand name) and the handle.</li>
            <li>
              Optionally paste an access token. Leave it blank to connect in{' '}
              <strong className="text-slate-100">demo mode</strong> — the account behaves like a
              real one but nothing is published live. Tokens are stored server-side and only ever
              shown masked.
            </li>
            <li>
              Use <strong className="text-slate-100">Pause / Activate</strong> to temporarily stop
              automating an account, or <strong className="text-slate-100">Disconnect</strong> to
              remove it entirely.
            </li>
          </ol>
        </Section>

        <Section id="media" title="Use the Media Library">
          <p>
            The <strong className="text-slate-100">Media</strong> page holds every image you can
            attach to a post.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong className="text-slate-100">Upload</strong> an image from your device
              (image files up to 5 MB).
            </li>
            <li>
              <strong className="text-slate-100">Generate</strong> one from a text prompt — add an
              optional business type and platform to steer the result.
            </li>
            <li>
              <strong className="text-slate-100">Delete</strong> any asset you no longer need.
              Generated and uploaded assets are tagged so you can tell them apart.
            </li>
          </ol>
        </Section>

        <Section id="campaign" title="Run a full campaign (Compose)">
          <p>
            The <strong className="text-slate-100">Compose</strong> page is where you launch the
            pipeline.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Fill in the brief: business type, goal, platform and tone.</li>
            <li>
              Optionally choose a <strong className="text-slate-100">target account</strong>. When
              set, the post publishes to that account and its platform overrides the dropdown.
            </li>
            <li>
              Optionally attach an <strong className="text-slate-100">image from the library</strong>{' '}
              instead of auto-generating one.
            </li>
            <li>
              Click <strong className="text-slate-100">Generate Draft</strong> to preview copy, SEO
              and a visual (content, SEO and image agents only) —
              or <strong className="text-slate-100">Run Full Campaign</strong> to run the entire
              pipeline and publish a post.
            </li>
            <li>
              Review the agent timeline, the published post, predicted analytics and the
              recommendations.
            </li>
          </ol>
        </Section>

        <Section id="agents" title="What each agent does">
          <ul className="space-y-3">
            {AGENTS.map((agent) => (
              <li key={agent.name} className="flex items-start gap-3">
                <Badge tone="indigo">{agent.name}</Badge>
                <span>{agent.does}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="analytics" title="Reading Analytics & the comparison">
          <p>
            The <strong className="text-slate-100">Analytics</strong> page aggregates performance
            across every post — totals, per-platform breakdowns and average engagement.
          </p>
          <p>
            The <strong className="text-slate-100">Manual vs AI vs Autonomous</strong> comparison
            is the core thesis: it shows engagement for posts written by hand, posts written by AI
            but published manually, and posts run end-to-end by the autonomous agent. Higher bars
            for the autonomous mode demonstrate the uplift from full automation plus the
            self-learning loop.
          </p>
        </Section>

        <Section id="memory" title="Searching AI Memory">
          <p>
            The <strong className="text-slate-100">Memory</strong> page runs a vector similarity
            search over past posts and their engagement. Type a topic (for example{' '}
            <em>dental leads</em>) to see the most relevant prior results and their match scores.
            This is the same memory the Recommendation Agent draws on, so it shows you why the
            agent suggests what it does.
          </p>
        </Section>

        <Section id="modes" title="Mock vs Live mode">
          <p>
            By default the app runs in <strong className="text-slate-100">mock mode</strong> — no
            API keys, no live posting. Agents return realistic generated data so you can demo the
            full experience safely.
          </p>
          <p>
            To go <strong className="text-slate-100">live</strong>, configure the backend with the
            relevant provider/social API keys and connect accounts with real access tokens on the
            Accounts page. Accounts left without a token stay in demo mode even when the rest of the
            system is live.
          </p>
        </Section>
      </Card>
    </div>
  );
}
