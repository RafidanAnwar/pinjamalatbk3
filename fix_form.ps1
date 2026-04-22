$file = 'd:\project\peminjaman alat\form-alat\src\pages\FormPeminjaman.tsx'
$content = [System.IO.File]::ReadAllText($file)

# Remove id from Alat interface
$content = $content.Replace("  id: string;`r`n  kode_alat: string;", "  kode_alat: string;")

# Update select option to use kode_alat instead of id
$content = $content.Replace("key={a.id} value={a.id}>{a.id} - {a.nama}", "key={a.kode_alat} value={a.kode_alat}>{a.kode_alat} - {a.nama}")

[System.IO.File]::WriteAllText($file, $content)
Write-Output "FormPeminjaman.tsx updated successfully"
