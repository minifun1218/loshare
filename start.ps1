Write-Host "Starting LoShare..." -ForegroundColor Cyan

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python -m uvicorn main:app --reload --port 9000" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal

Write-Host "Backend:  http://localhost:9000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5000" -ForegroundColor Green
Write-Host "API Docs: http://localhost:9000/docs" -ForegroundColor Yellow
