from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    # Fixed: admin.site.urls is the correct attribute
    path('admin/', admin.site.urls),
    
    # 1. Main API routes for your 'duties' app
    path('api/', include('duties.urls')), 

    # 2. Built-in DRF Token Retrieval
    path('api-token-auth/', obtain_auth_token),
]

# 3. Serve Media and Static Files during development
if settings.DEBUG:
    # Serving uploaded files (profile pics, etc.)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Serving static assets (CSS, JS)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)