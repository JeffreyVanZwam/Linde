param(
  [Parameter(Mandatory = $true)][string]$Directory
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Directory | Out-Null
$pfxPath = Join-Path $Directory 'localhost.pfx'
$password = ConvertTo-SecureString 'linde-local' -Force -AsPlainText
if (-not (Test-Path $pfxPath)) {
  $cert = New-SelfSignedCertificate `
    -Subject 'CN=localhost' `
    -DnsName 'localhost' `
    -CertStoreLocation 'Cert:\CurrentUser\My' `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -KeyExportPolicy Exportable `
    -KeyUsage DigitalSignature, KeyEncipherment `
    -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.1') `
    -NotAfter (Get-Date).AddYears(2) `
    -FriendlyName 'Linde localhost'
  Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null
}
$flags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($pfxPath, $password, $flags)
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store('Root', 'CurrentUser')
$store.Open('ReadWrite')
$found = $store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindByThumbprint, $cert.Thumbprint, $false)
if ($found.Count -eq 0) { $store.Add($cert) }
$store.Close()
Write-Output $cert.Thumbprint
