# Bittings Print Helper — the printing half (called by helper.js). Reads the job as JSON on stdin.
#   -Action status  → printers found
#   -Action receipt → draws the receipt lines through the Star driver (80 mm), then kicks the cash drawer if asked
#                     (8z81: a "logo" field — base64 PNG — is drawn centred above the text)
#   -Action preview → the same drawing into a PNG file ("out" in the job) instead of on paper — for checking a layout
#   -Action zpl     → sends raw ZPL to the Zebra
#   -Action drawer  → only kicks the drawer
#   -Action reset   → (8z137) "Reset printing": removes every waiting print job, stops the Windows print spooler, deletes
#                     its waiting files and starts it again — the cure for a jammed queue. Every printer's waiting jobs go.
param([string]$Action = 'status')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
if (-not ('BtRaw' -as [type])) {
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class BtRaw {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
  [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError=true)] static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] static extern int StartDocPrinter(IntPtr h, int l, DOCINFO di);
  [DllImport("winspool.drv", SetLastError=true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)] static extern bool WritePrinter(IntPtr h, byte[] b, int n, out int w);
  public static void Send(string printer, byte[] data, string doc) {
    IntPtr h; if (!OpenPrinter(printer, out h, IntPtr.Zero)) throw new Exception("cannot open printer " + printer);
    try { var di = new DOCINFO(); di.pDocName = doc; di.pDataType = "RAW";
      if (StartDocPrinter(h, 1, di) == 0) throw new Exception("StartDoc failed " + Marshal.GetLastWin32Error());
      StartPagePrinter(h); int w; WritePrinter(h, data, data.Length, out w); EndPagePrinter(h); EndDocPrinter(h);
    } finally { ClosePrinter(h); }
  }
}
"@
}
function Find-Printer([string]$pattern) { (Get-CimInstance Win32_Printer | Where-Object { $_.Name -match $pattern } | Select-Object -First 1).Name }
$star  = Find-Printer 'Star|TSP1'
$zebra = Find-Printer 'ZDesigner|Zebra|ZD4'
function Kick-Drawer { if (-not $star) { throw 'no Star printer' }
  # Star: BEL (0x07) fires drawer port 1 in Star mode; ESC p 0 25 250 is the ESC/POS equivalent — the driver passes both through raw
  [BtRaw]::Send($star, [byte[]](0x07, 0x1B, 0x70, 0x00, 0x19, 0xFA), 'Bittings drawer') }
$in = ''; if ($Action -notin 'status', 'drawer', 'reset') { $in = [Console]::In.ReadToEnd() }
switch ($Action) {
  'reset'  {
    $n = 0
    try { Get-Printer -ErrorAction SilentlyContinue | ForEach-Object { Get-PrintJob -PrinterName $_.Name -ErrorAction SilentlyContinue | ForEach-Object { $n++; Remove-PrintJob -InputObject $_ -ErrorAction SilentlyContinue } } } catch { }
    Stop-Service Spooler -Force -ErrorAction SilentlyContinue
    $t = 0; while ((Get-Service Spooler).Status -ne 'Stopped' -and $t -lt 20) { Start-Sleep -Milliseconds 500; $t++ }
    if ((Get-Service Spooler).Status -ne 'Stopped') { Get-CimInstance Win32_Process -Filter "Name='spoolsv.exe'" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Seconds 1 }
    Get-ChildItem (Join-Path $env:WINDIR 'System32\spool\PRINTERS') -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    Start-Service Spooler
    $t = 0; while ((Get-Service Spooler).Status -ne 'Running' -and $t -lt 20) { Start-Sleep -Milliseconds 500; $t++ }
    @{ cleared = $n; spooler = [string](Get-Service Spooler).Status } | ConvertTo-Json -Compress; break }
  'status' { @{ receiptPrinter = $star; labelPrinter = $zebra; printers = @((Get-CimInstance Win32_Printer).Name) } | ConvertTo-Json -Compress; break }
  'drawer' { Kick-Drawer; 'ok'; break }
  'zpl'    { if (-not $zebra) { throw 'no Zebra printer' }; $j = $in | ConvertFrom-Json; [BtRaw]::Send($zebra, [Text.Encoding]::UTF8.GetBytes([string]$j.zpl), 'Bittings label'); 'ok'; break }
  { $_ -in 'receipt', 'preview' } {
    if (-not $star) { throw 'no Star printer' }
    $j = $in | ConvertFrom-Json
    $lines = @($j.lines)
    $script:cols = if ([int]$j.cols -gt 0) { [int]$j.cols } else { 48 }
    # 8z81: the shop logo. A logo that cannot be read is skipped — it must never stop a receipt.
    $script:logoImg = $null
    if ($j.logo) { try { $lb = [Convert]::FromBase64String([string]$j.logo); $lms = New-Object System.IO.MemoryStream(, $lb); $script:logoImg = [System.Drawing.Image]::FromStream($lms) } catch { $script:logoImg = $null } }
    $copies = if ($Action -eq 'preview') { 1 } else { [Math]::Max(1, [int]$j.copies) }
    for ($c = 0; $c -lt $copies; $c++) {
      $doc = New-Object System.Drawing.Printing.PrintDocument
      $doc.PrinterSettings.PrinterName = $star
      $doc.DocumentName = 'Bittings receipt'
      $doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(4, 4, 4, 4)
      $script:idx = 0
      $pc = $null; if ($Action -eq 'preview') { $pc = New-Object System.Drawing.Printing.PreviewPrintController; $doc.PrintController = $pc }
      $doc.add_PrintPage({ param($s, $e)
        $g = $e.Graphics; $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit
        $W = $e.MarginBounds.Width; $y = $e.MarginBounds.Top
        # size the monospace font so a full line (48 columns) exactly fits the paper width
        $probe = New-Object System.Drawing.Font('Consolas', 10); $tf = [System.Drawing.StringFormat]::GenericTypographic
        $w10 = $g.MeasureString(('M' * $script:cols), $probe, 100000, $tf).Width; $pt = [Math]::Max(5, [Math]::Floor(10 * $W / $w10 * 100) / 100 * 0.98)
        # 8z26d: darker — everything prints bold (thermal paper + thin Consolas looked faint)
        $fN = New-Object System.Drawing.Font('Consolas', $pt, [System.Drawing.FontStyle]::Bold); $fB = $fN
        $fBig = New-Object System.Drawing.Font('Consolas', [Math]::Min(16, $pt * 1.7), [System.Drawing.FontStyle]::Bold)
        if ($script:logoImg -and $script:idx -eq 0) { try {
          $lw = [Math]::Min($W * 0.6, 200); $lh = $lw * $script:logoImg.Height / $script:logoImg.Width
          $g.DrawImage($script:logoImg, [single]($e.MarginBounds.Left + ($W - $lw) / 2), [single]$y, [single]$lw, [single]$lh); $y += [Math]::Ceiling($lh) + 6 } catch { } }
        while ($script:idx -lt $lines.Count) {
          $ln = $lines[$script:idx]; $script:idx++
          $f = if ($ln.big) { $fBig } elseif ($ln.bold) { $fB } else { $fN }
          $t = [string]$ln.text; if ($t -eq '') { $t = ' ' }
          $sf = New-Object System.Drawing.StringFormat([System.Drawing.StringFormat]::GenericTypographic); $sf.FormatFlags = $sf.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoWrap -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces; $sf.Alignment = switch ($ln.align) { 'center' { 'Center' } 'right' { 'Far' } default { 'Near' } }
          $h = [Math]::Ceiling($f.GetHeight($g)) + 1
          $g.DrawString($t, $f, [System.Drawing.Brushes]::Black, (New-Object System.Drawing.RectangleF($e.MarginBounds.Left, $y, $W, $h)), $sf)
          $y += $h
        }
        $e.HasMorePages = $false
      })
      $doc.Print()
      if ($pc) { $pv = $pc.GetPreviewPageInfo(); $pv[0].Image.Save([string]$j.out, [System.Drawing.Imaging.ImageFormat]::Png); "page $($pv[0].PhysicalSize.Width)x$($pv[0].PhysicalSize.Height)" }
    }
    if ($j.drawer -and $Action -ne 'preview') { Start-Sleep -Milliseconds 400; Kick-Drawer }
    'ok'; break }
}
