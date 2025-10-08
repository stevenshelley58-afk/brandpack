# verify-brandpack.ps1
# Run from repo root (e.g., C:\Users\steve\brandpack)

$ErrorActionPreference = "Stop"

function Fail($msg) { Write-Host "[X] $msg" -ForegroundColor Red; exit 1 }
function Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }

# 0) Location
$root = (Get-Location).Path
Ok "Repo root: $root"

# 1) Required paths
$webDir = Join-Path $root "apps\web"
Test-Path $webDir       | Out-Null       ; if (-not $?) { Fail "Missing apps\web" } else { Ok "Found apps\web" }

# 2) Next.js presence
$pkgPath = Join-Path $webDir "package.json"
Test-Path $pkgPath      | Out-Null       ; if (-not $?) { Fail "Missing apps\web\package.json" }

$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$deps = @{}
if ($pkg.dependencies) { $deps = $pkg.dependencies }
elseif ($pkg.devDependencies) { $deps = $pkg.devDependencies }

if (-not ($deps.PSObject.Properties.Name -contains "next")) { Fail "'next' not found in apps\web\package.json dependencies" }
Ok "Next.js dependency found: next=$($deps.next)"

# 3) App Router files
$pagePath = Join-Path $webDir "src\app\page.tsx"
Test-Path $pagePath     | Out-Null       ; if (-not $?) { Fail "Missing apps\web\src\app\page.tsx" } else { Ok "Found app/page.tsx" }

# 4) Git state
try {
  $branch = (git rev-parse --abbrev-ref HEAD).Trim()
  $localSha = (git rev-parse HEAD).Trim()
  $remoteSha = (git rev-parse origin/$branch).Trim()
  Ok "Git branch: $branch"
  if ($localSha -ne $remoteSha) {
    Write-Host "[!] Local commit differs from origin/$branch" -ForegroundColor Yellow
  } else {
    Ok "Local == origin/$branch ($localSha)"
  }
} catch { Fail "Git not available or repo not initialized" }

# 5) Quick local Next.js build sanity (optional, lightweight)
# Skips full build; just checks scripts exist.
if (-not $pkg.scripts."build") { Fail "No 'build' script in apps\web\package.json" } else { Ok "Found build script" }

# 6) Vercel target URL probe
# Replace if custom domain:
$vercelUrl = "https://brandpack.vercel.app"
try {
  $resp = Invoke-WebRequest -Uri $vercelUrl -Method GET -TimeoutSec 10 -UseBasicParsing
  if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
    # Basic heuristic: Next injects <meta name="next-head-count"> or 'data-nextjs-router'
    $html = $resp.Content
    if ($html -match 'next-head-count' -or $html -match 'id="__next"' -or $html -match 'data-nextjs') {
      Ok "Vercel live: $vercelUrl (HTTP $($resp.StatusCode)) and looks like Next.js"
    } else {
      Write-Host "[!] $vercelUrl returns HTTP $($resp.StatusCode) but not clearly Next.js HTML" -ForegroundColor Yellow
    }
  } else {
    Write-Host "[!] $vercelUrl returned HTTP $($resp.StatusCode)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "[!] Could not reach $vercelUrl. If Root Directory isn't set to apps/web, fix it in Vercel (Build and Deployment -> General -> Root Directory)." -ForegroundColor Yellow
}

# 7) Common misconfig hints
# .vercel folder in repo can lock wrong root; warn if present
$vercelFolder = Join-Path $root ".vercel"
if (Test-Path $vercelFolder) {
  Write-Host "[i] Found .vercel folder in repo. If deploy keeps building root, delete it, commit, and re-import with Root Directory=apps/web." -ForegroundColor Yellow
}

Ok "Verification complete."
