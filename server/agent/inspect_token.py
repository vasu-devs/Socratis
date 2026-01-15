import inspect
from livekit.api import AccessToken

print("AccessToken Init:")
print(inspect.signature(AccessToken.__init__))
if hasattr(AccessToken, "with_grants"):
    print("with_grants:")
    print(inspect.signature(AccessToken.with_grants))

print("Help on AccessToken:")
# print(help(AccessToken)) # Too long
