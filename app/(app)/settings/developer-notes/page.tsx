import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function RefLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm text-[#7A9C49] hover:underline"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  )
}

function CodePath({ children }: { children: string }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{children}</code>
  )
}

export default function DeveloperNotesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Developer Notes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Complete handoff guide for infrastructure, storage, deployments, and maintenance.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <RefLink href="https://github.com/" label="GitHub" />
          <RefLink href="https://vercel.com/" label="Vercel Dashboard" />
          <RefLink href="https://supabase.com/dashboard/projects" label="Supabase Dashboard" />
          <RefLink href="https://dash.cloudflare.com/" label="Cloudflare Dashboard (R2)" />
          <RefLink href="https://churchdirectory-main.vercel.app" label="Production App URL" />
          <RefLink href="https://developers.cloudflare.com/r2/" label="Cloudflare R2 Docs" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            This is an admin-facing church directory app built with Next.js App Router, Supabase
            for auth + database, and Cloudflare R2 for file storage.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Framework: Next.js 16 / React 19</li>
            <li>Auth + DB: Supabase</li>
            <li>File storage: Cloudflare R2 via S3-compatible API</li>
            <li>UI stack: shadcn-style components + Tailwind</li>
            <li>Spreadsheet features: import, export, and round-trip diff re-import</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repository and Source Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            Keep infrastructure and behavior notes in-source to reduce tribal knowledge.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Root docs: <CodePath>README.md</CodePath>
            </li>
            <li>
              DB migrations: <CodePath>supabase/migrations/</CodePath>
            </li>
            <li>
              Server actions: <CodePath>lib/actions.ts</CodePath>
            </li>
            <li>
              Storage client: <CodePath>lib/storage.ts</CodePath> and <CodePath>lib/r2.ts</CodePath>
            </li>
            <li>
              Storage API route: <CodePath>app/api/storage/route.ts</CodePath>
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            Recommendation: add a PR template and branch naming convention if multiple maintainers
            will be active.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deployment and Runtime (Vercel)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            Deployments run on Vercel and build via <CodePath>npm run build</CodePath>.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Production URL: <CodePath>https://churchdirectory-main.vercel.app</CodePath>
            </li>
            <li>
              Build command: <CodePath>next build</CodePath>
            </li>
            <li>
              Start command: <CodePath>next start</CodePath>
            </li>
            <li>
              Next image allowlist: <CodePath>next.config.ts</CodePath> remotePatterns
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            If images stop rendering, verify host allowlist entries for both Supabase and R2.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supabase: Auth + Database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>Supabase manages authentication, user sessions, and relational data.</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Server client: <CodePath>lib/supabase/server.ts</CodePath>
            </li>
            <li>
              Browser client: <CodePath>lib/supabase/client.ts</CodePath>
            </li>
            <li>
              Middleware/session wiring: <CodePath>lib/supabase/middleware.ts</CodePath>
            </li>
            <li>
              Core schema migration: <CodePath>supabase/migrations/001_initial.sql</CodePath>
            </li>
            <li>
              Directory settings migration: <CodePath>supabase/migrations/002_directory_settings.sql</CodePath>
            </li>
          </ul>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Important tables</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                <CodePath>families</CodePath> (family-level profile and address info)
              </li>
              <li>
                <CodePath>members</CodePath> (person-level records linked by family_id)
              </li>
              <li>
                <CodePath>directory_settings</CodePath> (cover/title/logo + directory metadata)
              </li>
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            Do not expose service role keys in the UI. Keep all privileged operations server-side.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cloudflare R2 Storage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            File objects are stored in Cloudflare R2 (S3-compatible) and returned as public URLs.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              R2 client + object ops: <CodePath>lib/r2.ts</CodePath>
            </li>
            <li>
              Upload/delete API endpoint: <CodePath>app/api/storage/route.ts</CodePath>
            </li>
            <li>
              Client helpers: <CodePath>lib/storage.ts</CodePath>
            </li>
            <li>Allowed prefixes: family-photos/, member-photos/, directory-assets/</li>
            <li>Upload limit currently enforced by API route: 10 MB</li>
          </ul>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Required R2 environment variables</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                <CodePath>R2_ACCOUNT_ID</CodePath>
              </li>
              <li>
                <CodePath>R2_ACCESS_KEY_ID</CodePath>
              </li>
              <li>
                <CodePath>R2_SECRET_ACCESS_KEY</CodePath>
              </li>
              <li>
                <CodePath>R2_BUCKET_NAME</CodePath>
              </li>
              <li>
                <CodePath>R2_PUBLIC_URL</CodePath>
              </li>
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            Keep R2 keys private. Only public URLs should ever be sent to clients.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photo and Asset Flow (End-to-End)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <ol className="list-inside list-decimal space-y-1">
            <li>User selects image in photo upload UI.</li>
            <li>
              UI calls <CodePath>uploadPhoto()</CodePath> / <CodePath>uploadDirectoryAsset()</CodePath> in{' '}
              <CodePath>lib/storage.ts</CodePath>.
            </li>
            <li>
              Browser posts FormData to <CodePath>/api/storage</CodePath> with a namespaced key.
            </li>
            <li>
              API validates prefix + size, then writes object via <CodePath>putObject()</CodePath> in{' '}
              <CodePath>lib/r2.ts</CodePath>.
            </li>
            <li>API returns a public URL, then that URL is persisted to database columns.</li>
            <li>UI renders the URL via image components (allowed by next.config remotePatterns).</li>
            <li>Delete reverses this by resolving key from URL and calling R2 delete.</li>
          </ol>
          <p className="text-xs text-slate-500">
            If delete fails, verify URL starts with the configured R2 public base URL and has one of
            the allowed prefixes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key App Routes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <p>
              <CodePath>/</CodePath> Families dashboard
            </p>
            <p>
              <CodePath>/families/new</CodePath> Add family
            </p>
            <p>
              <CodePath>/families/[id]</CodePath> Family details + members
            </p>
            <p>
              <CodePath>/families/[id]/members/new</CodePath> Add member
            </p>
            <p>
              <CodePath>/import</CodePath> Spreadsheet import + updater
            </p>
          </div>
          <div>
            <p>
              <CodePath>/directory</CodePath> Directory rendering/settings
            </p>
            <p>
              <CodePath>/leadership</CodePath> Leadership page
            </p>
            <p>
              <CodePath>/settings</CodePath> Admin settings
            </p>
            <p>
              <CodePath>/settings/developer-notes</CodePath> This handoff page
            </p>
            <p>
              <CodePath>/login</CodePath> Auth entry
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import / Export / Re-Import Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <ul className="list-inside list-disc space-y-1">
            <li>Export includes Family ID and Member ID for deterministic re-import matching.</li>
            <li>
              Re-import computes diff server-side and supports user review before applying updates.
            </li>
            <li>
              New rows can be resolved as new family or assigned to existing family during update flow.
            </li>
            <li>
              Logic lives primarily in <CodePath>components/spreadsheet-updater.tsx</CodePath> and{' '}
              <CodePath>lib/actions.ts</CodePath>.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables Reference (Safe)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>These variable names are required. Do not paste secret values in this page.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <CodePath>NEXT_PUBLIC_SUPABASE_URL</CodePath>
            <CodePath>NEXT_PUBLIC_SUPABASE_ANON_KEY</CodePath>
            <CodePath>SUPABASE_SERVICE_ROLE_KEY</CodePath>
            <CodePath>R2_ACCOUNT_ID</CodePath>
            <CodePath>R2_ACCESS_KEY_ID</CodePath>
            <CodePath>R2_SECRET_ACCESS_KEY</CodePath>
            <CodePath>R2_BUCKET_NAME</CodePath>
            <CodePath>R2_PUBLIC_URL</CodePath>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operational Checklist for New Maintainers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p className="font-medium text-slate-700">When taking over this app:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Confirm Vercel project ownership + environment variables.</li>
            <li>Confirm Supabase project access, auth providers, and SQL editor access.</li>
            <li>Confirm Cloudflare account access for R2 bucket and API keys.</li>
            <li>Run local build and verify all main routes.</li>
            <li>Test upload, delete, import, export, and round-trip re-import.</li>
            <li>Review all migration files before schema changes.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

