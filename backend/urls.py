from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 1. Main API routes for your 'duties' app
    path('api/', include('duties.urls')), 

    # 2. Built-in DRF Token Retrieval (Useful for testing/debugging)
    # Allows you to POST username/password to this URL to get a token
    path('api-token-auth/', obtain_auth_token),
]

# 3. Serve Media Files during development
# This is what allows React to display uploaded images via http://127.0.0.1:8000/media/...
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Also good practice to serve static files if not handled by a web server
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)