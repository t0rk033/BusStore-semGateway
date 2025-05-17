$securePassword = Read-Host -AsSecureString "Digite sua senha"
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
)

$body = @{
    apikey = $plainPassword
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://gateway.codeheroes.com.br/webhook/0a9a40f3-b1ca-4a8e-9cce-436a89e67f82" `
                              -Method Post `
                              -ContentType "application/json" `
                              -Body $body

Write-Output "Resposta do servidor:"
$response
