$ErrorActionPreference = 'Stop'

# Arranque desatendido (tarea programada): compila y sirve en la red local.
# Sin HOST el servidor solo escucha en 127.0.0.1.
Push-Location $PSScriptRoot
try {
    $env:NODE_ENV = 'production'
    $env:HOST = '0.0.0.0'
    $env:PORT = '4100'
    npm.cmd start
    if ($LASTEXITCODE -ne 0) {
        throw "Certifica exited with code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
