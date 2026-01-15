import livekit.agents
import pkgutil
import inspect

package = livekit.agents

print(f"Scanning {package.__name__}...")

def scan_module(name, module):
    try:
        if not hasattr(module, "__path__"):
             # It's a file module, check members
             for n, v in inspect.getmembers(module):
                if "Voice" in n or "Session" in n:
                    print(f"FOUND: {name}.{n} = {v}")
             return

        for importer, modname, ispkg in pkgutil.walk_packages(module.__path__, module.__name__ + "."):
            try:
                submod = __import__(modname, fromlist="dummy")
                for n, v in inspect.getmembers(submod):
                     if "Voice" in n or "Session" in n:
                         print(f"FOUND: {modname}.{n} = {v}")
            except Exception as e:
                print(f"Error importing {modname}: {e}")
    except Exception as e:
        print(f"Error scanning {name}: {e}")

scan_module("livekit.agents", livekit.agents)
