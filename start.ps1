# Start both backend (port 3001) and frontend (port 5000) concurrently

$env:BACKEND_PORT = "3001"
$env:BACKEND_INTERNAL_URL = "http://localhost:3001"

# Save project root
$ProjectRoot = Get-Location

# Start backend in the background
$backendProcess = Start-Process `
    -FilePath "node" `
    -ArgumentList "src/index.js" `
    -WorkingDirectory (Join-Path $ProjectRoot "backend") `
    -PassThru

# Give backend time to initialize
Start-Sleep -Seconds 3

try {
    # Start frontend
    Set-Location (Join-Path $ProjectRoot "frontend")
    npx next dev -p 5000
}
finally {
    # Stop backend when frontend exits
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force
    }
}