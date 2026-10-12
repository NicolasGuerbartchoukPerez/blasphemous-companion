"""Incluye licencias de los componentes del importador en el paquete binario."""
import importlib.metadata, pathlib, shutil, sys
target=pathlib.Path(sys.argv[1]);target.mkdir(parents=True,exist_ok=True)
for dist in importlib.metadata.distributions():
    name=dist.metadata.get('Name','package')
    for entry in dist.files or []:
        if any(term in entry.name.lower() for term in ['license','copying','notice']) and '.dist-info' in str(entry):
            source=pathlib.Path(dist.locate_file(entry))
            if source.is_file():
                folder=target/name;folder.mkdir(exist_ok=True);shutil.copyfile(source,folder/source.name)
python_license=pathlib.Path(sys.base_prefix)/'LICENSE.txt'
if python_license.exists():shutil.copyfile(python_license,target/'Python-LICENSE.txt')
