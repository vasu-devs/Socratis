import livekit.agents
import pkgutil
import inspect
import sys

print(f"Scanning package: {livekit.agents.__path__}")

def scan_module(name, module):
    try:
        # Check if it has a path (package)
        if hasattr(module, "__path__"):
             for importer, modname, ispkg in pkgutil.iter_modules(module.__path__, module.__name__ + "."):
                try:
                    submod = __import__(modname, fromlist="dummy")
                    print(f"Module: {modname}")
                    scan_module(modname, submod)
                except Exception as e:
                    print(f"  Error importing {modname}: {e}")
        
        # Check members
        for n, v in inspect.getmembers(module):
            if inspect.isclass(v):
                # We are looking for anything "Voice" or "Pipeline" or "Agent"
                if "Voice" in n or "Pipeline" in n or "Agent" in n:
                    print(f"  CLASS: {name}.{n}")
                    # Print Init signature if possible
                    try:
                         sig = inspect.signature(v.__init__)
                         print(f"    __init__{sig}")
                    except:
                        pass
    except Exception as e:
        print(f"Error scanning module {name}: {e}")

scan_module("livekit.agents", livekit.agents)
