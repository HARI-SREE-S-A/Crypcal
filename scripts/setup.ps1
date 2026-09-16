# =============================================================================
# CrypCal Setup Script (Windows PowerShell)
# Generates secrets, .env file, and templated configs
# =============================================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
# Handle running from project root
if (Test-Path "$PSScriptRoot\setup.ps1") {
    $ProjectRoot = Split-Path -Parent $PSScriptRoot
}

Write-Host "=== CrypCal Setup ===" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# Helper: generate random hex string
# ---------------------------------------------------------------------------
function New-Secret {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
}

# ---------------------------------------------------------------------------
# Generate .env if it doesn't exist
# ---------------------------------------------------------------------------
$EnvFile = Join-Path $ProjectRoot ".env"

if (Test-Path $EnvFile) {
    Write-Host "[!] .env already exists. To regenerate, delete it first." -ForegroundColor Yellow
    Write-Host "    Loading existing .env..."
} else {
    Write-Host "[+] Generating secrets and creating .env..." -ForegroundColor Green

    $secrets = @{
        POSTGRES_PASSWORD                  = New-Secret
        SYNAPSE_REGISTRATION_SHARED_SECRET = New-Secret
        SYNAPSE_MACAROON_SECRET_KEY        = New-Secret
        SYNAPSE_FORM_SECRET                = New-Secret
        TURN_SHARED_SECRET                 = New-Secret
        LIVEKIT_API_KEY                    = "API" + (New-Secret -Length 16)
        LIVEKIT_API_SECRET                 = New-Secret
    }

    $timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    $envContent = @"
# CrypCal Environment — Generated $timestamp
# DO NOT COMMIT THIS FILE

# Domain & Server
CRYPCAL_DOMAIN=localhost
CRYPCAL_SERVER_NAME=localhost

# PostgreSQL
POSTGRES_DB=synapse
POSTGRES_USER=synapse
POSTGRES_PASSWORD=$($secrets.POSTGRES_PASSWORD)

# Synapse
SYNAPSE_REGISTRATION_SHARED_SECRET=$($secrets.SYNAPSE_REGISTRATION_SHARED_SECRET)
SYNAPSE_MACAROON_SECRET_KEY=$($secrets.SYNAPSE_MACAROON_SECRET_KEY)
SYNAPSE_FORM_SECRET=$($secrets.SYNAPSE_FORM_SECRET)

# coturn
TURN_SHARED_SECRET=$($secrets.TURN_SHARED_SECRET)
TURN_REALM=localhost

# LiveKit
LIVEKIT_API_KEY=$($secrets.LIVEKIT_API_KEY)
LIVEKIT_API_SECRET=$($secrets.LIVEKIT_API_SECRET)

# TLS
TLS_MODE=local
"@

    Set-Content -Path $EnvFile -Value $envContent -Encoding UTF8
    Write-Host "[+] .env created with generated secrets" -ForegroundColor Green
}

# Load .env into variables
$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}

# ---------------------------------------------------------------------------
# Template substitution helper
# ---------------------------------------------------------------------------
function Invoke-TemplateSubstitution {
    param(
        [string]$TemplatePath,
        [string]$OutputPath,
        [hashtable]$Vars
    )
    $content = Get-Content -Path $TemplatePath -Raw
    foreach ($key in $Vars.Keys) {
        $content = $content -replace "__${key}__", $Vars[$key]
    }
    $outputDir = Split-Path -Parent $OutputPath
    if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force | Out-Null }
    Set-Content -Path $OutputPath -Value $content -Encoding UTF8
}

# ---------------------------------------------------------------------------
# Generate Synapse config
# ---------------------------------------------------------------------------
Write-Host "[+] Generating Synapse config from template..." -ForegroundColor Green

$synapseVars = @{
    CRYPCAL_DOMAIN                     = $envVars.CRYPCAL_DOMAIN
    POSTGRES_USER                      = $envVars.POSTGRES_USER
    POSTGRES_PASSWORD                  = $envVars.POSTGRES_PASSWORD
    POSTGRES_DB                        = $envVars.POSTGRES_DB
    SYNAPSE_REGISTRATION_SHARED_SECRET = $envVars.SYNAPSE_REGISTRATION_SHARED_SECRET
    SYNAPSE_MACAROON_SECRET_KEY        = $envVars.SYNAPSE_MACAROON_SECRET_KEY
    SYNAPSE_FORM_SECRET                = $envVars.SYNAPSE_FORM_SECRET
    TURN_SHARED_SECRET                 = $envVars.TURN_SHARED_SECRET
}

Invoke-TemplateSubstitution `
    -TemplatePath (Join-Path $ProjectRoot "infra\synapse\homeserver.yaml") `
    -OutputPath (Join-Path $ProjectRoot "infra\synapse\generated\homeserver.yaml") `
    -Vars $synapseVars

Write-Host "[+] Synapse config written to infra\synapse\generated\homeserver.yaml" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Generate coturn config
# ---------------------------------------------------------------------------
Write-Host "[+] Generating coturn config from template..." -ForegroundColor Green

$coturnVars = @{
    TURN_SHARED_SECRET = $envVars.TURN_SHARED_SECRET
    TURN_REALM         = $envVars.TURN_REALM
}

Invoke-TemplateSubstitution `
    -TemplatePath (Join-Path $ProjectRoot "infra\coturn\turnserver.conf") `
    -OutputPath (Join-Path $ProjectRoot "infra\coturn\generated\turnserver.conf") `
    -Vars $coturnVars

Write-Host "[+] coturn config written to infra\coturn\generated\turnserver.conf" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Generate LiveKit config
# ---------------------------------------------------------------------------
Write-Host "[+] Generating LiveKit config from template..." -ForegroundColor Green

$livekitVars = @{
    LIVEKIT_API_KEY    = $envVars.LIVEKIT_API_KEY
    LIVEKIT_API_SECRET = $envVars.LIVEKIT_API_SECRET
}

Invoke-TemplateSubstitution `
    -TemplatePath (Join-Path $ProjectRoot "infra\livekit\livekit.yaml") `
    -OutputPath (Join-Path $ProjectRoot "infra\livekit\generated\livekit.yaml") `
    -Vars $livekitVars

Write-Host "[+] LiveKit config written to infra\livekit\generated\livekit.yaml" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Generate self-signed TLS certs for local dev
# ---------------------------------------------------------------------------
if ($envVars.TLS_MODE -eq "local") {
    $certDir = Join-Path $ProjectRoot "infra\coturn\certs"
    if (-not (Test-Path $certDir)) { New-Item -ItemType Directory -Path $certDir -Force | Out-Null }

    $certFile = Join-Path $certDir "turn.crt"
    if (-not (Test-Path $certFile)) {
        Write-Host "[+] Generating self-signed TLS certificates for coturn..." -ForegroundColor Green
        $domain = $envVars.CRYPCAL_DOMAIN

        # Try OpenSSL first (Git Bash, WSL, or manual install)
        $opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
        if ($opensslPath) {
            & openssl req -x509 -newkey rsa:4096 `
                -keyout (Join-Path $certDir "turn.key") `
                -out $certFile `
                -days 365 -nodes `
                -subj "/CN=$domain" `
                -addext "subjectAltName=DNS:$domain,DNS:localhost,IP:127.0.0.1" 2>$null
        } else {
            # Fallback: use PowerShell to create self-signed cert
            Write-Host "    (OpenSSL not found, using PowerShell cert generation)" -ForegroundColor Yellow
            $cert = New-SelfSignedCertificate `
                -DnsName $domain, "localhost" `
                -CertStoreLocation "Cert:\CurrentUser\My" `
                -NotAfter (Get-Date).AddDays(365) `
                -KeyAlgorithm RSA `
                -KeyLength 2048 `
                -KeyExportPolicy Exportable `
                -FriendlyName "CrypCal TURN Dev Cert"

            # Export as PFX then convert to PEM using certutil
            $pfxPath = Join-Path $certDir "turn.pfx"
            $keyFile = Join-Path $certDir "turn.key"
            $pfxPass = New-Object System.Security.SecureString
            # Empty password for dev certs
            Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pfxPass -Force | Out-Null

            # Export cert as DER then base64 encode to PEM
            $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
            $certPem = "-----BEGIN CERTIFICATE-----`r`n"
            $certPem += [Convert]::ToBase64String($certBytes, [Base64FormattingOptions]::InsertLineBreaks)
            $certPem += "`r`n-----END CERTIFICATE-----"
            Set-Content -Path $certFile -Value $certPem -Encoding ASCII

            # Use certutil to extract private key from PFX
            # This creates a temporary PEM that contains both cert and key
            $tempPem = Join-Path $certDir "temp.pem"
            & certutil -exportPFX -p "" "My" $cert.Thumbprint $tempPem NoChain 2>$null
            
            # If certutil approach fails, just copy the PFX and note it
            if (-not (Test-Path $keyFile)) {
                # Simple fallback: write a placeholder key noting the PFX is available
                Write-Host "    Note: Private key exported as PFX. For Docker/coturn, use OpenSSL to convert:" -ForegroundColor Yellow
                Write-Host "    openssl pkcs12 -in infra\coturn\certs\turn.pfx -nocerts -nodes -out infra\coturn\certs\turn.key" -ForegroundColor Yellow
                # Create a dummy key so the docker mount doesn't fail
                Set-Content -Path $keyFile -Value "# Run: openssl pkcs12 -in turn.pfx -nocerts -nodes -out turn.key" -Encoding ASCII
            }

            # Clean up
            Remove-Item $tempPem -ErrorAction SilentlyContinue
            Remove-Item "Cert:\CurrentUser\My\$($cert.Thumbprint)" -ErrorAction SilentlyContinue
        }
        Write-Host "[+] Self-signed certs created in infra\coturn\certs\" -ForegroundColor Green
    } else {
        Write-Host "[~] TLS certificates already exist, skipping generation" -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------------
# Create Synapse signing key placeholder
# ---------------------------------------------------------------------------
$signingKey = Join-Path $ProjectRoot "infra\synapse\generated\signing.key"
if (-not (Test-Path $signingKey)) {
    New-Item -ItemType File -Path $signingKey -Force | Out-Null
    Write-Host "[+] Signing key placeholder created (Synapse generates on first start)" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Create empty web-dist for Caddy
# ---------------------------------------------------------------------------
$webDist = Join-Path $ProjectRoot "infra\web-dist"
if (-not (Test-Path $webDist)) { New-Item -ItemType Directory -Path $webDist -Force | Out-Null }
$placeholderHtml = '<html><body><h1>CrypCal - Client not yet built</h1><p>Run Milestone 2 to build the web client.</p></body></html>'
Set-Content -Path (Join-Path $webDist "index.html") -Value $placeholderHtml -Encoding UTF8

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  .env file:      $EnvFile"
Write-Host "  Synapse config:  infra\synapse\generated\homeserver.yaml"
Write-Host "  coturn config:   infra\coturn\generated\turnserver.conf"
Write-Host "  LiveKit config:  infra\livekit\generated\livekit.yaml"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review .env and adjust CRYPCAL_DOMAIN if needed"
Write-Host "  2. Run: docker compose -f infra/docker-compose.yml --env-file .env up -d"
Write-Host "  3. Create a user: see 'make register' or the register command below"
Write-Host ""
