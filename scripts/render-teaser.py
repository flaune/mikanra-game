from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).resolve().parent / 'teaser' / 'render.py'), run_name='__main__')
