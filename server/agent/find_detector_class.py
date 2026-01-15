import inspect
import pkgutil
import livekit.plugins.turn_detector

def find_classes(module, prefix=""):
    print(f"Scanning {prefix}...")
    try:
        if hasattr(module, "__path__"):
            for _, name, _ in pkgutil.iter_modules(module.__path__):
                full_name = prefix + name
                try:
                    sub_mod = __import__(full_name, fromlist=["*"])
                    find_classes(sub_mod, full_name + ".")
                except Exception as e:
                    print(f"Failed to import {full_name}: {e}")
        
        for name, obj in inspect.getmembers(module):
            if inspect.isclass(obj) and obj.__module__.startswith("livekit.plugins.turn_detector"):
                print(f"FOUND CLASS: {name} in {obj.__module__}")
    except Exception as e:
        print(f"Error scanning {prefix}: {e}")

find_classes(livekit.plugins.turn_detector, "livekit.plugins.turn_detector.")
