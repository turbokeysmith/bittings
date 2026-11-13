# Narration for the website videos: each line of vid-script.json → a WAV in .\vid\audio\ (Windows built-in voice, offline).
param([string]$Dir = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
$cfg = Get-Content (Join-Path $Dir 'vid-script.json') -Raw | ConvertFrom-Json
$syn = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$v = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -eq $cfg.voice } | Select-Object -First 1
if ($v) { $syn.Voice = $v }
$out = Join-Path $Dir 'vid\audio'; New-Item -ItemType Directory -Force $out | Out-Null
function Say([string]$name, [string]$text) {
  $t = [System.Security.SecurityElement]::Escape($text)
  $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='$($syn.Voice.DisplayName)'><prosody rate='-6%'>$t</prosody></voice></speak>"
  $st = Await ($syn.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $rd = New-Object Windows.Storage.Streams.DataReader($st.GetInputStreamAt(0))
  $n = [uint32]$st.Size; $null = Await ($rd.LoadAsync($n)) ([uint32])
  $bytes = New-Object byte[] $n; $rd.ReadBytes($bytes); [IO.File]::WriteAllBytes((Join-Path $out "$name.wav"), $bytes)
  "$name $n bytes"
}
foreach ($k in 'pc', 'phone') { $f = $cfg.$k
  Say "$k-intro" $f.intro
  $i = 0; foreach ($s in $f.scenes) { $i++; Say ("$k-s{0:D2}" -f $i) $s.say }
  Say "$k-outro" $f.outro }
