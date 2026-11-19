param(
  [Parameter(Mandatory = $true)][string]$PrinterName,
  [Parameter(Mandatory = $true)][string]$PayloadPath
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOC_INFO_1 {
    public string pDocName;
    public string pOutputFile;
    public string pDataType;
  }

  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool OpenPrinter(string name, out IntPtr printer, IntPtr defaults);
  [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr printer);
  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern int StartDocPrinter(IntPtr printer, int level, [In] DOC_INFO_1 info);
  [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr printer);
  [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr printer);
  [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr printer);
  [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr printer, byte[] bytes, int count, out int written);
}
'@

$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $PayloadPath))
$handle = [IntPtr]::Zero
if (-not [RawPrinter]::OpenPrinter($PrinterName, [ref]$handle, [IntPtr]::Zero)) {
  throw "No se pudo abrir la impresora compartida ($([Runtime.InteropServices.Marshal]::GetLastWin32Error()))."
}

$documentStarted = $false
$pageStarted = $false
try {
  $doc = New-Object RawPrinter+DOC_INFO_1
  $doc.pDocName = 'Ticket ZETA ESC/POS'
  $doc.pDataType = 'RAW'
  if ([RawPrinter]::StartDocPrinter($handle, 1, $doc) -eq 0) { throw 'No se pudo iniciar el trabajo de impresión.' }
  $documentStarted = $true
  if (-not [RawPrinter]::StartPagePrinter($handle)) { throw 'No se pudo iniciar la página de impresión.' }
  $pageStarted = $true
  $written = 0
  if (-not [RawPrinter]::WritePrinter($handle, $bytes, $bytes.Length, [ref]$written) -or $written -ne $bytes.Length) { throw 'No se pudo enviar el ticket completo a la impresora.' }
} finally {
  if ($pageStarted) { [void][RawPrinter]::EndPagePrinter($handle) }
  if ($documentStarted) { [void][RawPrinter]::EndDocPrinter($handle) }
  [void][RawPrinter]::ClosePrinter($handle)
}
