[Setup]
AppName=Vulcanvms
AppVersion=1.0
DefaultDirName={pf}\Vulcanvms
DefaultGroupName=Vulcanvms
OutputDir=.
OutputBaseFilename=Vulcanvms_Installer
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Files]
Source: "D:\New Project\Project\VMS_GUITestingCode\VMS_GUI_21.05.2025\VMS_GUI\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Run]
; Download Python if not present
Filename: "powershell.exe"; Parameters: "-Command ""Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.0/python-3.12.0-amd64.exe' -OutFile '{tmp}\python-installer.exe'"""; Flags: runhidden waituntilterminated; Check: NeedsPython
Filename: "{tmp}\python-installer.exe"; Parameters: "/quiet InstallAllUsers=1 PrependPath=1"; Flags: runhidden waituntilterminated; Check: NeedsPython

; Download Java if not present
Filename: "powershell.exe"; Parameters: "-Command ""Invoke-WebRequest -Uri 'https://github.com/adoptium/temurin17-binaries/releases/latest/download/OpenJDK17U-jre_x64_windows_hotspot_latest.msi' -OutFile '{tmp}\OpenJDK17.msi'"""; Flags: runhidden waituntilterminated; Check: NeedsJava
Filename: "msiexec.exe"; Parameters: "/i ""{tmp}\OpenJDK17.msi"" /quiet /norestart"; Flags: runhidden waituntilterminated; Check: NeedsJava

; Run your setup_install.bat (assumes it starts Django server)
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && start setup_install.bat"; Flags: runhidden

; Open browser to scoreboard page after install
Filename: "cmd.exe"; Parameters: "/c start http://172.16.2.57:8000/scoreboard"; Flags: postinstall runhidden

[Code]
function ExecAndCaptureOutput(const Cmd, Params: String; var Output: String): Boolean;
var
  ResultCode: Integer;
  TempFile: String;
  SL: TStringList;
begin
  TempFile := ExpandConstant('{tmp}\output.txt');
  Result := Exec(Cmd, Params + ' > "' + TempFile + '" 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if FileExists(TempFile) then
  begin
    SL := TStringList.Create;
    try
      SL.LoadFromFile(TempFile);
      Output := SL.Text;
    finally
      SL.Free;
      DeleteFile(TempFile);
    end;
  end else
    Output := '';
end;

function VersionCompare(const VerStr: String; Major, Minor, Patch: Integer): Boolean;
var
  VParts: TStringList;
  VMajor, VMinor, VPatch: Integer;
begin
  Result := False;
  VParts := TStringList.Create;
  try
    VParts.StrictDelimiter := True;
    VParts.Delimiter := '.';
    VParts.DelimitedText := VerStr;
    if VParts.Count >= 1 then
      VMajor := StrToIntDef(VParts[0], 0)
    else
      VMajor := 0;
    if VParts.Count >= 2 then
      VMinor := StrToIntDef(VParts[1], 0)
    else
      VMinor := 0;
    if VParts.Count >= 3 then
      VPatch := StrToIntDef(VParts[2], 0)
    else
      VPatch := 0;

    if VMajor > Major then
      Result := True
    else if VMajor = Major then
    begin
      if VMinor > Minor then
        Result := True
      else if VMinor = Minor then
        Result := VPatch >= Patch;
    end;
  finally
    VParts.Free;
  end;
end;

function ExtractVersionBetweenQuotes(const S: String): String;
var
  FirstQuotePos, SecondQuotePos: Integer;
begin
  Result := '';
  FirstQuotePos := Pos('"', S);
  if FirstQuotePos > 0 then
  begin
    SecondQuotePos := Pos('"', Copy(S, FirstQuotePos + 1, Length(S)));
    if SecondQuotePos > 0 then
    begin
      SecondQuotePos := SecondQuotePos + FirstQuotePos;
      Result := Copy(S, FirstQuotePos + 1, SecondQuotePos - FirstQuotePos - 1);
    end;
  end;
end;

function NeedsPython(): Boolean;
var
  Output, Ver: String;
begin
  Result := True;
  if ExecAndCaptureOutput('python', '--version', Output) then
  begin
    Ver := Trim(Copy(Output, Pos('Python', Output) + 7, Length(Output)));
    if VersionCompare(Ver, 3, 12, 0) then
      Result := False;
  end;
end;

function NeedsJava(): Boolean;
var
  Output, Ver: String;
begin
  Result := True;
  if ExecAndCaptureOutput('java', '-version', Output) then
  begin
    Ver := ExtractVersionBetweenQuotes(Output);
    if VersionCompare(Ver, 17, 0, 0) then
      Result := False;
  end;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  if NeedsPython() then
    MsgBox('Python 3.12 or higher is not detected. It will be downloaded and installed.', mbInformation, MB_OK);
  if NeedsJava() then
    MsgBox('Java 17 or higher is not detected. It will be downloaded and installed.', mbInformation, MB_OK);
end;
