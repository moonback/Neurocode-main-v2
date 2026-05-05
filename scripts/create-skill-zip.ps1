# Script pour créer un ZIP d'un skill
# Usage: .\scripts\create-skill-zip.ps1 -SkillName "code-security"

param(
    [Parameter(Mandatory=$true)]
    [string]$SkillName,
    
    [Parameter(Mandatory=$false)]
    [string]$SourcePath = "userData\skills",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "."
)

$skillPath = Join-Path $SourcePath $SkillName

# Vérifier que le dossier du skill existe
if (-not (Test-Path $skillPath)) {
    Write-Error "Le dossier du skill '$skillPath' n'existe pas"
    exit 1
}

# Vérifier que SKILL.md existe
$skillMdPath = Join-Path $skillPath "SKILL.md"
if (-not (Test-Path $skillMdPath)) {
    Write-Error "Le fichier SKILL.md n'existe pas dans '$skillPath'"
    exit 1
}

# Créer le nom du fichier ZIP
$zipFileName = "$SkillName.zip"
$zipPath = Join-Path $OutputPath $zipFileName

# Supprimer le ZIP existant s'il existe
if (Test-Path $zipPath) {
    Write-Host "Suppression du ZIP existant : $zipPath"
    Remove-Item $zipPath -Force
}

# Créer le ZIP
Write-Host "Création du ZIP : $zipPath"
Write-Host "Source : $skillPath"

try {
    Compress-Archive -Path $skillPath -DestinationPath $zipPath -CompressionLevel Optimal
    Write-Host "✓ ZIP créé avec succès : $zipPath" -ForegroundColor Green
    
    # Afficher les informations sur le ZIP
    $zipInfo = Get-Item $zipPath
    Write-Host ""
    Write-Host "Informations sur le ZIP :"
    Write-Host "  Taille : $([math]::Round($zipInfo.Length / 1KB, 2)) KB"
    Write-Host "  Chemin : $($zipInfo.FullName)"
    
    # Lister le contenu du ZIP
    Write-Host ""
    Write-Host "Contenu du ZIP :"
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
    $fileCount = 0
    foreach ($entry in $zip.Entries) {
        if ($entry.Name) {
            $fileCount++
            Write-Host "  - $($entry.FullName)"
        }
    }
    $zip.Dispose()
    Write-Host ""
    Write-Host "Total : $fileCount fichier(s)" -ForegroundColor Cyan
    
} catch {
    Write-Error "Erreur lors de la création du ZIP : $_"
    exit 1
}
