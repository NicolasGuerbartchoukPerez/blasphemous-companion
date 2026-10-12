// SPDX-License-Identifier: GPL-3.0-or-later
// Read-only Mono layout traversal informed by just-ero/asl-help (GPL-3.0).
// This standalone reader communicates with the web app through a local JSON file.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Threading;

namespace CvstodiaPosition {
 public sealed class Memory : IDisposable {
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool ReadProcessMemory(IntPtr process, IntPtr address, byte[] buffer, UIntPtr size, out UIntPtr read);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  IntPtr handle; public Process Process;
  public Memory(Process p){Process=p;handle=OpenProcess(0x410,false,p.Id);if(handle==IntPtr.Zero)throw new IOException("No se puede leer el juego con esta cuenta.");}
  public byte[] Read(long address,int size){if(address<65536||size<0||size>1048576)throw new IOException("Puntero no válido");byte[] b=new byte[size];UIntPtr n;if(!ReadProcessMemory(handle,new IntPtr(address),b,new UIntPtr((uint)size),out n)||n.ToUInt64()!=(ulong)size)throw new IOException("Lectura no disponible");return b;}
  public long Ptr(long a){return BitConverter.ToInt64(Read(a,8),0);}
  public int Int(long a){return BitConverter.ToInt32(Read(a,4),0);}
  public short Short(long a){return BitConverter.ToInt16(Read(a,2),0);}
  public string Text(long a){return Encoding.UTF8.GetString(Read(a,128)).Split('\0')[0];}
  public string ManagedText(long a){int n=Int(a+16);if(n<0||n>128)throw new IOException("Cadena no válida");return Encoding.Unicode.GetString(Read(a+20,n*2));}
  public void Dispose(){if(handle!=IntPtr.Zero){CloseHandle(handle);handle=IntPtr.Zero;}}
 }
 public sealed class MonoMap {
  Memory m; int shift;long core,lastMap;List<MapCell> mapCells;
  sealed class MapCell {public int X,Y;public float Left,Bottom,Width,Height;public string Room;}
  readonly Dictionary<long,Dictionary<string,int>> fieldCache=new Dictionary<long,Dictionary<string,int>>();
  long assemblyTable;
  public MonoMap(Memory memory){m=memory;long mono=0;foreach(ProcessModule mod in m.Process.Modules)if(mod.ModuleName.Equals("mono.dll",StringComparison.OrdinalIgnoreCase))mono=mod.BaseAddress.ToInt64();if(mono==0)throw new IOException("Solo Mono de Blasphemous 1 para Windows x64");
   long pe=mono+m.Int(mono+0x3c);long exports=mono+m.Int(pe+24+112),names=mono+m.Int(exports+32),ordinals=mono+m.Int(exports+36),functions=mono+m.Int(exports+28);int count=m.Int(exports+24);if(count<1||count>100000)throw new IOException("Exportaciones no válidas");long fn=0;
   for(int i=0;i<count;i++)if(m.Text(mono+m.Int(names+4*i))=="mono_assembly_foreach"){fn=mono+m.Int(functions+4*(ushort)m.Short(ordinals+2*i));break;}
   if(fn==0)throw new IOException("Runtime incompatible");byte[] code=m.Read(fn,256);
   for(int i=0;i<code.Length-7;i++)if(code[i]==0x48&&code[i+1]==0x8b&&code[i+2]==0x0d){assemblyTable=m.Ptr(fn+i+7+BitConverter.ToInt32(code,i+3));break;}
   long image=0;var visited=new HashSet<long>();
   for(long entry=assemblyTable;entry!=0&&visited.Count<512&&visited.Add(entry);entry=m.Ptr(entry+8)){long candidate=m.Ptr(m.Ptr(entry)+88);if(m.Text(m.Ptr(candidate+40))=="Assembly-CSharp"){image=candidate;break;}}
   if(image==0)throw new IOException("Juego todavía no inicializado");long cache=image+976;int size=m.Int(cache+24);long table=m.Ptr(cache+32);if(size<1||size>100000)throw new IOException("Tabla incompatible");
   foreach(int variant in new int[]{0,8}){shift=variant;try{for(int i=0;i<size&&core==0;i++){long c=m.Ptr(table+8*i);var seen=new HashSet<long>();while(c!=0&&seen.Count<10000&&seen.Add(c)){if(m.Text(m.Ptr(c+72+shift))=="Core"&&m.Ptr(c+64+shift)==image){core=c;break;}c=m.Ptr(c+256+shift);}}if(core!=0)break;}catch(IOException){core=0;}}
   if(core==0)throw new IOException("Estructura Mono incompatible");
  }
  Dictionary<string,int> Fields(long klass){Dictionary<string,int> result;if(fieldCache.TryGetValue(klass,out result))return result;result=new Dictionary<string,int>();long parent=m.Ptr(klass+40+shift);if(parent!=0)foreach(var p in Fields(parent))result[p.Key]=p.Value;
   int count=m.Int(klass+148+shift);long table=m.Ptr(klass+168+shift);if(count<0||count>4096)throw new IOException("Campos incompatibles");for(int i=0;i<count;i++){long field=table+32*i;result[m.Text(m.Ptr(field+8))]=m.Int(field+24);}fieldCache[klass]=result;return result;}
  int Offset(long obj,string name){long klass=m.Ptr(m.Ptr(obj));return Fields(klass)[name];}
  long Field(long obj,string name){return m.Ptr(obj+Offset(obj,name));}
  long Static(string name){long runtime=m.Ptr(core+248+shift),vtable=m.Ptr(runtime+8),data=m.Ptr(vtable+24);return m.Ptr(data+Fields(core)[name]);}
  string Room(long zone){return m.ManagedText(Field(zone,"_district"))+m.ManagedText(Field(zone,"_zone"))+m.ManagedText(Field(zone,"_scene"));}
  void ReadCells(long map){
   long list=Field(map,"Cells"),array=Field(list,"_items");int size=m.Int(list+Offset(list,"_size"));if(size<1||size>20000)throw new IOException("Mapa incompatible");byte[] objects=m.Read(array+32,size*8);var cells=new List<MapCell>();
   for(int i=0;i<size;i++){long c=BitConverter.ToInt64(objects,i*8),key=Field(c,"CellKey");byte[] rect=m.Read(c+Offset(c,"Bounding"),16);cells.Add(new MapCell{X=m.Int(key+Offset(key,"<X>k__BackingField")),Y=m.Int(key+Offset(key,"<Y>k__BackingField")),Room=Room(Field(c,"ZoneId")),Left=BitConverter.ToSingle(rect,0),Bottom=BitConverter.ToSingle(rect,4),Width=BitConverter.ToSingle(rect,8),Height=BitConverter.ToSingle(rect,12)});}
   mapCells=cells;lastMap=map;
  }
  public string Position(){
   long logic=Static("<Logic>k__BackingField");int state=m.Int(logic+Offset(logic,"<CurrentState>k__BackingField"));long player=Field(logic,"<Penitent>k__BackingField");
   if(state==0||state==2||player==0||m.Ptr(player+16)==0)return Json("loading");
   long map=Static("<NewMapManager>k__BackingField"),level=Static("<LevelManager>k__BackingField");
   if(m.Read(level+Offset(level,"<InsideChangeLevel>k__BackingField"),1)[0]!=0)return Json("loading");
   string active=Room(Field(map,"<CurrentScene>k__BackingField"));if(!Regex.IsMatch(active,@"^D\d+(?:B?Z)\d+S\d+$"))return Json("loading");
   long currentMap=Field(map,"CurrentMap");if(currentMap!=lastMap||mapCells==null)ReadCells(currentMap);
   if(!mapCells.Exists(c=>c.Room==active))return Json("unmapped");
   long controller=Field(player,"<PlatformCharacterController>k__BackingField");long collider=Field(controller,"m_smartCollider");byte[] position=m.Read(collider+Offset(collider,"m_prevPos"),12);float px=BitConverter.ToSingle(position,0),py=BitConverter.ToSingle(position,4);if(float.IsNaN(px)||float.IsNaN(py)||float.IsInfinity(px)||float.IsInfinity(py))throw new IOException("Posición incompatible");
   // SmartRectCollider2D.ResolveCollisions caches transform.position after movement, including climbing.
   // Do not use NewMapManager.LastPlayerCell, which can remain stale when revisiting a room.
   MapCell found=null;foreach(var c in mapCells)if(c.Room==active&&px>=c.Left&&px<c.Left+c.Width&&py>=c.Bottom&&py<c.Bottom+c.Height){found=c;break;}
   if(found==null)return Json("loading");if(Math.Abs(found.X)>1000||Math.Abs(found.Y)>1000)throw new IOException("Casilla incompatible");
   return Json("playing",",\"x\":"+found.X+",\"y\":"+found.Y+",\"room\":\""+found.Room+"\"");
  }
  public static string Json(string state,string extra=""){return "{\"protocol\":1,\"kind\":\"blasphemous-position\",\"state\":\""+state+"\",\"updatedAt\":\""+DateTime.UtcNow.ToString("o")+"\""+extra+"}";}
 }
 public static class Program {
  public static void Main(string[] args){
   string root=AppDomain.CurrentDomain.BaseDirectory,dir=Path.Combine(root,"live");Directory.CreateDirectory(dir);bool once=Array.IndexOf(args,"--once")>=0,created;
   string readerId;using(var hash=SHA256.Create()){readerId=BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar).ToLowerInvariant()))).Replace("-","");}
   using(var mutex=new Mutex(true,"Local\\CvstodiaReadOnlyPosition_"+readerId,out created)){if(!created)return;
    Memory memory=null;MonoMap map=null;string target=Path.Combine(dir,"position.json"),stop=Path.Combine(dir,"stop-reader");if(File.Exists(stop))File.Delete(stop);
    try{do{
     string json;try{
      if(memory==null||memory.Process.HasExited){if(memory!=null)memory.Dispose();memory=null;map=null;Process[] games=Process.GetProcessesByName("Blasphemous");if(games.Length>0)memory=new Memory(games[0]);}
      if(memory==null)json=MonoMap.Json("waiting");else{if(map==null)map=new MonoMap(memory);json=map.Position();}
     }catch(Exception){json=MonoMap.Json("unavailable");map=null;}
     string temp=Path.Combine(dir,"position.tmp");File.WriteAllText(temp,json,new UTF8Encoding(false));if(File.Exists(target))File.Replace(temp,target,null);else File.Move(temp,target);
     if(once)break;Thread.Sleep(250);
    }while(!File.Exists(stop));}
    finally{if(memory!=null)memory.Dispose();if(!once)File.WriteAllText(target,MonoMap.Json("stopped"),new UTF8Encoding(false));}
   }
  }
 }
}
