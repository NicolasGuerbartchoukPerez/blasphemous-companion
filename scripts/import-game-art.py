# SPDX-License-Identifier: GPL-3.0-or-later
"""Importa gráficos desde una instalación local del juego, sin redistribuirlos."""
import argparse, base64, io, json, os, pathlib, re, sys, types
from odin_reader import Reader
# Este importador no procesa audio. UnityPy importa su conversor de audio al
# cargar sprites: lo anulamos antes de importar UnityPy para no incluir FMOD.
sys.modules['fmod_toolkit']=types.ModuleType('fmod_toolkit')
import UnityPy
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator

def candidates():
    roots=[]
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Valve\Steam') as key:
            roots.append(pathlib.Path(winreg.QueryValueEx(key, 'SteamPath')[0]))
    except (OSError, ImportError):
        pass
    roots.append(pathlib.Path(os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)'))/'Steam')
    for steam in list(roots):
        vdf=steam/'steamapps/libraryfolders.vdf'
        if vdf.exists():
            roots.extend(pathlib.Path(x.replace('\\\\','\\')) for x in re.findall(r'"path"\s+"([^"]+)"', vdf.read_text(encoding='utf-8')))
    return [x/'steamapps/common/Blasphemous' for x in roots]

def png(sprite):
    buffer=io.BytesIO();sprite.image.save(buffer,format='PNG')
    return 'data:image/png;base64,'+base64.b64encode(buffer.getvalue()).decode('ascii')

def extract(game, output):
    bundle=game/'Blasphemous_Data/data.unity3d'
    if not bundle.is_file():
        raise ValueError('No se encuentra Blasphemous_Data/data.unity3d. Elige la carpeta que contiene Blasphemous.exe.')
    print('Leyendo los gráficos de tu instalación. Puede tardar un minuto…')
    env=UnityPy.load(str(bundle));objects=list(env.objects)
    generator=TypeTreeGenerator(objects[0].assets_file.unity_version);generator.load_local_game(str(game))
    config=None
    for obj in objects:
        if obj.type.name!='MonoBehaviour':continue
        try:
            script=obj.read(check_read=False).m_Script.read()
            if script.m_ClassName!='MapRendererConfig':continue
            name=(script.m_Namespace+'.' if script.m_Namespace else '')+script.m_ClassName
            data=obj.read_typetree(generator.get_nodes_up(script.m_AssemblyName,name))
            if data.get('m_Name')=='Level1Zoom':config=data;break
        except (AttributeError, ValueError):continue
    if config is None:raise ValueError('Esta versión del juego no tiene la configuración de mapa compatible.')
    raw=config['serializationData'];decoded=Reader(raw['SerializedBytes']).read()
    by_id={(o.assets_file.name,o.path_id):o for o in objects};tiles={}
    for pair in decoded['Sprites']['items'][0]:
        key,ref=pair['items'];ptr=raw['ReferencedUnityObjects'][ref['external']]
        if ptr['m_FileID']!=0:raise ValueError('Formato de sprites no compatible.')
        tiles[key]=png(by_id[('resources.assets',ptr['m_PathID'])].read())
    icons={}
    for obj in objects:
        if obj.type.name!='Sprite':continue
        sprite=obj.read();name=sprite.m_Name
        if name=='cvstodiaMapBG' or name.startswith('map-'):icons[name]=png(sprite)
    if len(tiles)!=36 or 'cvstodiaMapBG' not in icons:raise ValueError('La importación no contiene todos los gráficos esperados.')
    text=json.dumps({'protocol':1,'tiles':tiles,'icons':icons},separators=(',',':'))
    if len(text.encode())>3000000:raise ValueError('Los gráficos superan el límite de esta versión.')
    output.parent.mkdir(parents=True,exist_ok=True)
    temp=output.with_suffix('.tmp');temp.write_text(text,encoding='utf-8');temp.replace(output)
    print(f'Importación completada: {len(tiles)} casillas y {len(icons)} iconos.\nArchivo local: {output}\nRecarga la pestaña de Diario de Cvstodia para ver los gráficos originales.')

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--game',type=pathlib.Path);parser.add_argument('--output',type=pathlib.Path);args=parser.parse_args()
    target=pathlib.Path(sys.executable).parent if getattr(sys,'frozen',False) else pathlib.Path(__file__).resolve().parent.parent
    game=args.game or next((g for g in candidates() if (g/'Blasphemous_Data/data.unity3d').is_file()),None)
    if game is None:game=pathlib.Path(input('Pega la carpeta que contiene Blasphemous.exe y pulsa Intro: ').strip().strip('"'))
    extract(game,args.output or target/'assets-local/game-art.json')

if __name__=='__main__':
    try:main()
    except Exception as error:
        print('No se han importado los gráficos: '+str(error))
        if getattr(sys,'frozen',False) and len(sys.argv)==1:input('Pulsa Intro para cerrar.')
        sys.exit(1)
    if getattr(sys,'frozen',False) and len(sys.argv)==1:input('Pulsa Intro para cerrar.')
