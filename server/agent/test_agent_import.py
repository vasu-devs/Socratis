try:
    from livekit.agents.voice import Agent
    print("Imported Agent")
    try:
        # Try to instantiate with just instructions to see if checks pass
        # Note: It might require a context or session
        print(f"Agent doc: {Agent.__doc__}")
    except Exception as e:
        print(f"Instantiation failed: {e}")
except ImportError:
    print("Import failed")
