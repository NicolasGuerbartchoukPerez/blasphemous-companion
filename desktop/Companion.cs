// SPDX-License-Identifier: GPL-3.0-or-later
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Drawing;
using CvstodiaPosition;

public static class Companion {
 static volatile bool running=true;
 static volatile string signal=MonoMap.Json("waiting");
 static TcpListener listener;
 static int port;
 static byte[] page;
 static string root=AppDomain.CurrentDomain.BaseDirectory;
 static Semaphore requests=new Semaphore(16,16);
 static string Address {get{return "http://127.0.0.1:"+port+"/";}}
 static void Open(){Process.Start(new ProcessStartInfo(Address){UseShellExecute=true});}
 [STAThread] public static void Main(string[] args){
  bool noBrowser=Array.IndexOf(args,"--no-browser")>=0,created;
  using(var mutex=new Mutex(true,"Local\\CvstodiaPortableCompanion",out created)){
   string state=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"CvstodiaCompanion");
   string portFile=Path.Combine(state,"port.txt");
   if(!created){if(!noBrowser&&File.Exists(portFile)&&int.TryParse(File.ReadAllText(portFile),out port)&&port>=8765&&port<=8795)Open();return;}
   try{
    using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("Cvstodia.Web")){
     if(stream==null)throw new IOException("Falta la interfaz en el ejecutable.");using(var memory=new MemoryStream()){stream.CopyTo(memory);page=memory.ToArray();}
    }
    for(port=8765;port<=8795;port++){try{listener=new TcpListener(IPAddress.Loopback,port);listener.Start();break;}catch(SocketException){if(listener!=null)listener.Stop();listener=null;}}
    if(listener==null)throw new IOException("No hay un puerto local disponible entre 8765 y 8795.");
    Directory.CreateDirectory(state);File.WriteAllText(portFile,port.ToString());
    var reader=new Thread(ReadPosition){IsBackground=true};reader.Start();
    var server=new Thread(Serve){IsBackground=true};server.Start();
    Application.EnableVisualStyles();
    using(var tray=new NotifyIcon()){
     tray.Icon=SystemIcons.Application;tray.Text="Diario de Cvstodia";tray.Visible=true;
     var menu=new ContextMenu();menu.MenuItems.Add("Abrir aplicación",(s,e)=>Open());menu.MenuItems.Add("Salir",(s,e)=>Application.Exit());tray.ContextMenu=menu;tray.DoubleClick+=(s,e)=>Open();
     if(!noBrowser)Open();Application.Run();tray.Visible=false;
    }
   }catch(Exception error){MessageBox.Show(error.Message,"Diario de Cvstodia",MessageBoxButtons.OK,MessageBoxIcon.Error);}
   finally{running=false;if(listener!=null)listener.Stop();}
  }
 }
 static void ReadPosition(){
  Memory memory=null;MonoMap map=null;
  try{while(running){try{
   if(memory==null||memory.Process.HasExited){if(memory!=null)memory.Dispose();memory=null;map=null;var games=Process.GetProcessesByName("Blasphemous");if(games.Length>0)memory=new Memory(games[0]);}
   if(memory==null)signal=MonoMap.Json("waiting");else{if(map==null)map=new MonoMap(memory);signal=map.Position();}
  }catch(Exception){signal=MonoMap.Json("unavailable");map=null;}Thread.Sleep(250);}}
  finally{if(memory!=null)memory.Dispose();}
 }
 static void Serve(){while(running){try{var client=listener.AcceptTcpClient();if(!requests.WaitOne(0)){client.Close();continue;}ThreadPool.QueueUserWorkItem(_=>{try{Respond(client);}catch(Exception){}finally{client.Close();requests.Release();}});}catch(SocketException){if(!running)return;}catch(ObjectDisposedException){return;}}}
 static void Write(Stream stream,int status,string type,byte[] bytes){
  string text="HTTP/1.1 "+status+" "+(status==200?"OK":status==403?"Forbidden":status==404?"Not Found":"Bad Request")+"\r\nContent-Type: "+type+"\r\nContent-Length: "+bytes.Length+"\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\nX-Frame-Options: DENY\r\n\r\n";
  byte[] header=Encoding.ASCII.GetBytes(text);stream.Write(header,0,header.Length);stream.Write(bytes,0,bytes.Length);
 }
 static void Text(Stream stream,int status,string text){Write(stream,status,"text/plain; charset=utf-8",Encoding.UTF8.GetBytes(text));}
 static void Respond(TcpClient client){
  client.ReceiveTimeout=5000;client.SendTimeout=5000;
  using(var stream=new BufferedStream(client.GetStream(),8192)){
   var bytes=new List<byte>();int value;while(bytes.Count<16384&&(value=stream.ReadByte())>=0){bytes.Add((byte)value);int n=bytes.Count;if(n>=4&&bytes[n-4]==13&&bytes[n-3]==10&&bytes[n-2]==13&&bytes[n-1]==10)break;}
   if(bytes.Count>=16384){Text(stream,400,"Request too large");return;}
   string[] lines=Encoding.ASCII.GetString(bytes.ToArray()).Split(new[]{"\r\n"},StringSplitOptions.None),first=lines[0].Split(' ');
   if(first.Length!=3||first[0]!="GET"){Text(stream,400,"Only GET is supported");return;}
   var headers=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);foreach(string line in lines){int split=line.IndexOf(':');if(split>0)headers[line.Substring(0,split)]=line.Substring(split+1).Trim();}
   string host;if(!headers.TryGetValue("Host",out host)||host!="127.0.0.1:"+port){Text(stream,403,"Local host required");return;}
   string path=first[1].Split('?')[0];
   if(path=="/"||path=="/index.html"){Write(stream,200,"text/html; charset=utf-8",page);return;}
   if(!path.StartsWith("/local/",StringComparison.Ordinal)){Text(stream,404,"Not found");return;}
   string scope,origin,site;
   if(!headers.TryGetValue("X-Cvstodia-Local",out scope)||scope!="1"||(headers.TryGetValue("Origin",out origin)&&origin!=Address.TrimEnd('/'))||(headers.TryGetValue("Sec-Fetch-Site",out site)&&site!="same-origin"&&site!="none")){Text(stream,403,"Same-origin local request required");return;}
   if(path=="/local/info"){Write(stream,200,"application/json",Encoding.UTF8.GetBytes("{\"app\":\"cvstodia-portable\",\"protocol\":1}"));return;}
   if(path=="/local/position"){Write(stream,200,"application/json",Encoding.UTF8.GetBytes(signal));return;}
   if(path=="/local/art"){
    string file=Path.Combine(root,"assets-local","game-art.json");if(!File.Exists(file)){Write(stream,200,"application/json",Encoding.UTF8.GetBytes("{\"protocol\":1,\"tiles\":{},\"icons\":{}}"));return;}
    if(new FileInfo(file).Length>3000000){Text(stream,400,"Artwork file too large");return;}Write(stream,200,"application/json",File.ReadAllBytes(file));return;
   }
   Text(stream,404,"Not found");
  }
 }
}
