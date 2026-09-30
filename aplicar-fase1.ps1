$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$project = (Get-Location).Path

Write-Host "Aplicando Fase 1 de seguridad de MIRÚ..." -ForegroundColor Cyan

$files = @(
  'server/controllers/authController.js',
  'server/middleware/auth.js',
  'server/models/sessionModel.js',
  'server/models/userModel.js',
  'server/routes/auth.js',
  'server/server.js',
  'src/App.jsx',
  'src/loginSlice.js',
  'src/components/containers/LoginOAuth.jsx',
  'src/components/containers/userSlice.js'
)

foreach ($file in $files) {
  $source = Join-Path $root $file
  $target = Join-Path $project $file
  $dir = Split-Path $target -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Copy-Item $source $target -Force
  Write-Host "  OK $file" -ForegroundColor Green
}

$nav = Join-Path $project 'src/components/containers/NavContainer.jsx'
if (Test-Path $nav) {
  $content = Get-Content $nav -Raw
  if ($content -notmatch "import \{ clearUser \} from './userSlice';") {
    $content = $content -replace "import \{ setLogin \} from '../../loginSlice';", "import { setLogin } from '../../loginSlice';`r`nimport { clearUser } from './userSlice';"
  }
  $pattern = '(?s)  const handleSignOut = \(\) => \{.*?\n  \};'
  $replacement = @'
  const handleSignOut = async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.warn('No se pudo cerrar la sesión en el servidor:', error);
    } finally {
      setMobileMenuOpen(false);
      dispatch(clearUser());
      dispatch(setLogin(false));
    }
  };
'@
  $updated = [regex]::Replace($content, $pattern, $replacement, 1)
  if ($updated -eq $content) {
    Write-Host "  AVISO: no pude actualizar automáticamente el logout de NavContainer.jsx" -ForegroundColor Yellow
  } else {
    Set-Content $nav $updated -Encoding UTF8
    Write-Host "  OK logout seguro en NavContainer.jsx" -ForegroundColor Green
  }
}

Write-Host "`nListo. Ahora ejecutar:" -ForegroundColor Cyan
Write-Host "npm run build" -ForegroundColor White
Write-Host "`nNo hagas git commit todavía. Primero probamos login, recarga y logout." -ForegroundColor Yellow
