from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
# Import your views
from duties.views import (
    home_view,
    allocate_duties, 
    get_duties, 
    send_otp, 
    verify_otp, 
    manage_profile
)

# We combine EVERYTHING into ONE single list
urlpatterns = [
    # 1. Admin and Home
    path('admin/', admin.site.urls),
    path('', home_view), 

    # 2. Authentication (Login/Signup)
    # Note: I added / at the end of every URL for consistency
    path('api/login/', obtain_auth_token, name='api_login'), 
    path('api/signup/', send_otp, name='signup_step1'), # React calls /api/signup/
    path('api/send-otp/', send_otp, name='send_otp'),   # Just in case
    path('api/verify-otp/', verify_otp, name='verify_otp'),
    
    # 3. Features (Profile & Duties)
    path('api/profile/', manage_profile, name='manage_profile'),
    path('api/allocate/', allocate_duties, name='allocate_duties'),
    path('api/duties/', get_duties, name='get_duties'),
]