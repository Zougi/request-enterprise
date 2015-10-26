<#
.SYNOPSIS
	pfx exporter
.DESCRIPTION
	search for a certificate called by your username and export it with passphrase 1234
#>

Param (
	[String]$certificateName = $env:UserName,
	[String]$passphrase = "1234",
	[String]$exportPath = "mycert.pfx"
)

$thumbprint = Get-ChildItem Cert:\CurrentUser\My -Recurse | % { if ($_.Subject -like "*CN=$($certificateName)*") { $_.Thumbprint } }

&certutil.exe -user -p $passphrase -exportPFX $thumbprint $exportPath